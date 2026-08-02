import OpenAI from 'openai';
import {
  APIConnectionError,
  APIUserAbortError,
  BadRequestError,
  InternalServerError,
  RateLimitError,
} from 'openai/core/error';
import { z } from 'zod';
import { WORD_PROMPT, buildInput } from './prompt';
import {
  MAX_WORDS_PER_REQUEST,
  MAX_AVOID_ENTRIES,
  type WordApiErrorCode,
} from '../../src/types/gameTypes';

/**
 * Provider is configuration. Any OpenAI-compatible endpoint works — 9router,
 * OpenAI itself, anything else — by changing these three secrets.
 */
interface Env {
  AI_BASE_URL: string;
  AI_API_KEY: string;
  AI_MODEL: string;
}

const MAX_BODY_BYTES = 8 * 1024;

const RequestSchema = z.object({
  count: z.number().int().min(1).max(MAX_WORDS_PER_REQUEST),
  avoid: z.array(z.string().min(1).max(40)).max(MAX_AVOID_ENTRIES).optional(),
});

const WordPairs = z.object({
  pairs: z.array(
    z.object({
      civilian: z.string().min(1).max(20),
      undercover: z.string().min(1).max(20),
    })
  ),
});

/**
 * Sent as response_format. Hand-written rather than derived from the zod schema
 * so there is no dependency on openai/helpers/zod. Keep the two in sync.
 */
const WORD_PAIRS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    pairs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          civilian: { type: 'string' },
          undercover: { type: 'string' },
        },
        required: ['civilian', 'undercover'],
        additionalProperties: false,
      },
    },
  },
  required: ['pairs'],
  additionalProperties: false,
} as const;

/** Fixed strings per code. Never derived from an exception. */
const MESSAGES: Record<WordApiErrorCode, string> = {
  invalid_request: 'Permintaan tidak valid.',
  upstream_error: 'Layanan AI sedang sibuk. Coba lagi sebentar lagi.',
  bad_response: 'Layanan AI tidak mengembalikan kata yang valid.',
  server_error: 'Terjadi kesalahan di server.',
};

const fail = (code: WordApiErrorCode, status: number) =>
  new Response(JSON.stringify({ error: code, message: MESSAGES[code] }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/** `avoid` reaches the prompt, so keep it to letters, spaces and hyphens. */
const sanitize = (word: string) => word.replace(/[^\p{L}\s-]/gu, '').trim();

/**
 * Not every OpenAI-compatible backend honours `strict`. Some wrap the JSON in a
 * markdown fence. Strip it before parsing rather than trusting the contract.
 */
const stripFence = (text: string) =>
  text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const raw = await context.request.text();
  if (raw.length > MAX_BODY_BYTES) return fail('invalid_request', 400);

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(JSON.parse(raw));
  } catch {
    return fail('invalid_request', 400);
  }

  const avoid = (body.avoid ?? []).map(sanitize).filter(w => w.length > 0);

  const client = new OpenAI({
    apiKey: context.env.AI_API_KEY,
    baseURL: context.env.AI_BASE_URL,
    timeout: 45_000, // SDK default is 10 minutes
    maxRetries: 1, // SDK default is 2
  });

  try {
    const completion = await client.chat.completions.create({
      model: context.env.AI_MODEL,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: WORD_PROMPT },
        { role: 'user', content: buildInput(body.count, avoid) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'word_pairs',
          strict: true,
          schema: WORD_PAIRS_JSON_SCHEMA,
        },
      },
      // No temperature — some reasoning models reject it outright.
    });

    const choice = completion.choices[0];

    // 'length' means the JSON was cut off mid-object; it would otherwise
    // surface as an indistinguishable parse error.
    if (choice?.finish_reason === 'length') {
      console.error('[api/words] reply truncated — raise max_tokens');
      return fail('bad_response', 502);
    }

    const content = choice?.message?.content;
    if (!content) return fail('bad_response', 502);

    let raw_json: unknown;
    try {
      raw_json = JSON.parse(stripFence(content));
    } catch {
      console.error('[api/words] reply was not JSON:', content.slice(0, 200));
      return fail('bad_response', 502);
    }

    const result = WordPairs.safeParse(raw_json);
    if (!result.success) return fail('bad_response', 502);

    const pairs = result.data.pairs
      .filter(p => p.civilian.toLowerCase() !== p.undercover.toLowerCase())
      .slice(0, body.count);

    if (pairs.length === 0) return fail('bad_response', 502);

    return new Response(JSON.stringify({ data: pairs }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error('[api/words]', err);

    if (
      err instanceof RateLimitError ||
      err instanceof InternalServerError ||
      err instanceof APIConnectionError ||
      err instanceof APIUserAbortError
    ) {
      return fail('upstream_error', 502);
    }

    // A 400 from upstream is our schema or params bug, not their outage.
    // If the provider rejects `response_format`, this is where it lands —
    // check the logged error before assuming the model is at fault.
    if (err instanceof BadRequestError) return fail('server_error', 500);

    return fail('server_error', 500);
  }
};
