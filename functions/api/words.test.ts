import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();
const ctorMock = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: createMock } };
    constructor(opts: unknown) {
      ctorMock(opts);
    }
  },
}));

import { onRequestPost } from './words';

const ENV = {
  AI_BASE_URL: 'https://9router.umeh.me/v1',
  AI_API_KEY: 'test-key-123',
  AI_MODEL: 'test-model',
};

const call = (body: unknown, raw?: string) =>
  onRequestPost({
    request: new Request('https://x/api/words', {
      method: 'POST',
      body: raw ?? JSON.stringify(body),
    }),
    env: ENV,
  } as never);

/** A well-behaved reply: bare JSON, finish_reason stop. */
const reply = (content: string, finish_reason = 'stop') => ({
  choices: [{ message: { content }, finish_reason }],
});

/** Response.json() is `unknown` under the Workers types, so narrow it once here. */
const bodyOf = async (res: Response) =>
  (await res.json()) as { error?: string; message?: string; data?: Array<{ civilian: string; undercover: string }> };

const onePair = JSON.stringify({ pairs: [{ civilian: 'Kopi', undercover: 'Teh' }] });

describe('POST /api/words', () => {
  beforeEach(() => {
    createMock.mockReset();
    ctorMock.mockReset();
  });

  it('returns the generated pairs', async () => {
    createMock.mockResolvedValueOnce(reply(onePair));

    const res = await call({ count: 1 });

    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ data: [{ civilian: 'Kopi', undercover: 'Teh' }] });
  });

  it('uses the configured base URL, key and model', async () => {
    createMock.mockResolvedValueOnce(reply(onePair));

    await call({ count: 1 });

    expect(ctorMock.mock.calls[0][0]).toMatchObject({
      baseURL: 'https://9router.umeh.me/v1',
      apiKey: 'test-key-123',
    });
    expect(createMock.mock.calls[0][0].model).toBe('test-model');
  });

  it('parses a reply wrapped in a markdown code fence', async () => {
    createMock.mockResolvedValueOnce(reply('```json\n' + onePair + '\n```'));

    const res = await call({ count: 1 });

    expect(res.status).toBe(200);
    expect((await bodyOf(res)).data).toHaveLength(1);
  });

  it('rejects a count above the maximum', async () => {
    const res = await call({ count: 21 });

    expect(res.status).toBe(400);
    expect((await bodyOf(res)).error).toBe('invalid_request');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects a count below one', async () => {
    const res = await call({ count: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects malformed JSON without calling the model', async () => {
    const res = await call(null, 'not json');

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects an oversized body before parsing', async () => {
    const res = await call({ count: 1, avoid: ['x'.repeat(20000)] });

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects more than 60 avoid entries', async () => {
    const res = await call({ count: 1, avoid: Array(61).fill('Kopi') });

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('strips characters outside the allowed set from avoid entries', async () => {
    createMock.mockResolvedValueOnce(reply(onePair));

    await call({ count: 1, avoid: ['Ab{"role":"system"}c'] });

    const sent = JSON.stringify(createMock.mock.calls[0][0].messages);
    expect(sent).not.toContain('\\"role\\"');
    expect(sent).toContain('Abrolesystemc');
  });

  it('never sends a temperature', async () => {
    createMock.mockResolvedValueOnce(reply(onePair));

    await call({ count: 1 });

    expect(createMock.mock.calls[0][0]).not.toHaveProperty('temperature');
  });

  it('drops a pair whose two words are identical', async () => {
    createMock.mockResolvedValueOnce(
      reply(
        JSON.stringify({
          pairs: [
            { civilian: 'Kopi', undercover: 'kopi' },
            { civilian: 'Bakso', undercover: 'Siomay' },
          ],
        })
      )
    );

    const res = await call({ count: 2 });

    expect((await bodyOf(res)).data).toEqual([{ civilian: 'Bakso', undercover: 'Siomay' }]);
  });

  it('reports a truncated reply as bad_response', async () => {
    createMock.mockResolvedValueOnce(reply('{"pairs":[{"civi', 'length'));

    const res = await call({ count: 1 });

    expect(res.status).toBe(502);
    expect((await bodyOf(res)).error).toBe('bad_response');
  });

  it('reports unparseable content as bad_response', async () => {
    createMock.mockResolvedValueOnce(reply('Tentu! Ini pasangan katanya:'));

    const res = await call({ count: 1 });

    expect((await bodyOf(res)).error).toBe('bad_response');
  });

  it('reports schema-valid JSON with zero usable pairs as bad_response', async () => {
    createMock.mockResolvedValueOnce(reply(JSON.stringify({ pairs: [] })));

    const res = await call({ count: 1 });

    expect((await bodyOf(res)).error).toBe('bad_response');
  });

  it('maps an upstream outage to upstream_error', async () => {
    const { InternalServerError } = await import('openai/core/error');
    createMock.mockRejectedValueOnce(
      new InternalServerError(500, undefined, 'boom', new Headers())
    );

    const res = await call({ count: 1 });

    expect(res.status).toBe(502);
    expect((await bodyOf(res)).error).toBe('upstream_error');
  });

  it('maps a 400 from upstream to server_error, not upstream_error', async () => {
    const { BadRequestError } = await import('openai/core/error');
    createMock.mockRejectedValueOnce(
      new BadRequestError(400, undefined, 'bad schema', new Headers())
    );

    const res = await call({ count: 1 });

    expect(res.status).toBe(500);
    expect((await bodyOf(res)).error).toBe('server_error');
  });

  it('never leaks the API key or an exception message', async () => {
    createMock.mockRejectedValueOnce(new Error('failed with key test-key-123'));

    const res = await call({ count: 1 });
    const body = await res.text();

    expect(body).not.toContain('test-key-123');
    expect(body).not.toContain('failed with key');
  });
});
