import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WordService } from '../services/wordService';
import { WordFetchError } from '../types/gameTypes';
import type { WordPair } from '../types/gameTypes';

global.fetch = vi.fn();

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const respondWith = (body: unknown, ok = true, status = 200) =>
  (global.fetch as never as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });

describe('WordService', () => {
  beforeEach(() => {
    // clearAllMocks wipes call history but keeps implementations. resetAllMocks
    // would strip localStorageMock's getItem/setItem bodies, so storage would
    // silently stop persisting and every count assertion would see only the
    // five seeded defaults.
    vi.clearAllMocks();
    (global.fetch as never as ReturnType<typeof vi.fn>).mockReset();
    localStorageMock.clear();
    WordService.initializeWords();
  });

  afterEach(() => localStorageMock.clear());

  describe('fetchNewWords', () => {
    it('posts to the same-origin endpoint with count and avoid', async () => {
      respondWith({ data: [{ civilian: 'Bakso', undercover: 'Siomay' }] });

      await WordService.fetchNewWords(1);

      const [url, init] = (global.fetch as never as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('/api/words');
      expect(init.method).toBe('POST');

      const sent = JSON.parse(init.body);
      expect(sent.count).toBe(1);
      // The 5 seeded defaults contribute both halves.
      expect(sent.avoid).toContain('Apel');
      expect(sent.avoid).toContain('Jeruk');
    });

    it('caps avoid at 60 entries', async () => {
      const many: WordPair[] = Array.from({ length: 100 }, (_, i) => ({
        civilian: `C${i}`,
        undercover: `U${i}`,
        played: false,
      }));
      localStorageMock.setItem('gameWords', JSON.stringify(many));
      respondWith({ data: [{ civilian: 'Bakso', undercover: 'Siomay' }] });

      await WordService.fetchNewWords(1);

      const sent = JSON.parse(
        (global.fetch as never as ReturnType<typeof vi.fn>).mock.calls[0][1].body
      );
      expect(sent.avoid.length).toBeLessThanOrEqual(60);
    });

    it('returns pairs marked unplayed', async () => {
      respondWith({ data: [{ civilian: 'Bakso', undercover: 'Siomay' }] });

      const result = await WordService.fetchNewWords(1);

      expect(result).toEqual([{ civilian: 'Bakso', undercover: 'Siomay', played: false }]);
    });

    it('throws a typed error when the endpoint reports one', async () => {
      respondWith({ error: 'upstream_error', message: 'Layanan AI sedang sibuk.' }, false, 502);

      // respondWith queues a single response, so call once and assert twice
      // against the same rejection rather than making a second unmocked call.
      const error = await WordService.fetchNewWords(1).catch(e => e);

      expect(error).toBeInstanceOf(WordFetchError);
      expect(error).toMatchObject({ code: 'upstream_error' });
    });

    it('ignores an unrecognised error code and any message from the wire', async () => {
      respondWith(
        { error: 'totally_made_up', message: '<img src=x onerror=alert(1)>' },
        false,
        502
      );

      const error = await WordService.fetchNewWords(1).catch(e => e);

      expect(error).toBeInstanceOf(WordFetchError);
      expect(error.code).toBe('server_error');
      expect(error.message).toBe('Terjadi kesalahan di server.');
    });

    it('renders the local message for a valid code, not the served one', async () => {
      respondWith(
        { error: 'upstream_error', message: 'arbitrary text from the wire' },
        false,
        502
      );

      const error = await WordService.fetchNewWords(1).catch(e => e);

      expect(error.code).toBe('upstream_error');
      expect(error.message).toBe('Layanan AI sedang sibuk. Coba lagi sebentar lagi.');
    });

    it('rejects a response whose items are malformed', async () => {
      respondWith({ data: [{ civilian: 'Bakso' }] });

      await expect(WordService.fetchNewWords(1)).rejects.toMatchObject({
        code: 'bad_response',
      });
    });
  });

  describe('addNewWords', () => {
    it('reports how many were actually added', () => {
      const added = WordService.addNewWords([
        { civilian: 'Bakso', undercover: 'Siomay', played: false },
      ]);

      expect(added).toBe(1);
      expect(WordService.getTotalWordCount()).toBe(6);
    });

    it('drops a pair that already exists', () => {
      const added = WordService.addNewWords([
        { civilian: 'Kopi', undercover: 'Teh', played: false },
      ]);

      expect(added).toBe(0);
      expect(WordService.getTotalWordCount()).toBe(5);
    });

    it('drops a pair that exists reversed', () => {
      const added = WordService.addNewWords([
        { civilian: 'Teh', undercover: 'Kopi', played: false },
      ]);

      expect(added).toBe(0);
    });

    it('matches case-insensitively', () => {
      const added = WordService.addNewWords([
        { civilian: 'kopi', undercover: 'TEH', played: false },
      ]);

      expect(added).toBe(0);
    });

    it('drops duplicates within the same batch', () => {
      const added = WordService.addNewWords([
        { civilian: 'Bakso', undercover: 'Siomay', played: false },
        { civilian: 'Siomay', undercover: 'Bakso', played: false },
      ]);

      expect(added).toBe(1);
    });
  });
});
