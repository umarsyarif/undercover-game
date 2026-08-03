import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from './words';

const ENV = {
  AI_BASE_URL: 'https://9router.umeh.me/v1',
  AI_API_KEY: 'test-key-123',
  AI_MODEL: 'test-model',
};

const completion = {
  choices: [
    {
      finish_reason: 'stop',
      message: {
        content: JSON.stringify({
          pairs: [{ civilian: 'Kopi', undercover: 'Teh' }],
        }),
      },
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/words', () => {
  it('sends the compatibility User-Agent through the real OpenAI client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(completion), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', undefined);

    const response = await onRequestPost({
      request: new Request('https://undercover-game.test/api/words', {
        method: 'POST',
        body: JSON.stringify({ count: 1 }),
      }),
      env: ENV,
    } as never);

    expect(response.status).toBe(200);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('User-Agent')).toBe(
      'undercover-game/1.0'
    );
  });

  it('explicitly requires JSON-only pairs output in the emitted system message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(completion), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', undefined);

    const response = await onRequestPost({
      request: new Request('https://undercover-game.test/api/words', {
        method: 'POST',
        body: JSON.stringify({ count: 1 }),
      }),
      env: ENV,
    } as never);

    expect(response.status).toBe(200);

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    const systemMessage = request.messages.find(
      (message: { role: string }) => message.role === 'system'
    );

    expect(systemMessage.content).toContain('FORMAT OUTPUT:\nBalas hanya dengan JSON:');
    expect(systemMessage.content).toContain(
      '{"pairs":[{"civilian":"...","undercover":"..."}]}'
    );
    expect(systemMessage.content).toContain('Jangan gunakan markdown atau penjelasan.');
  });
});
