import { z } from 'zod';
import {
  WordFetchError,
  WORD_API_MESSAGES,
  MAX_AVOID_ENTRIES,
  type WordPair,
  type WordApiRequest,
} from '../types/gameTypes';

const STORAGE_KEY = 'gameWords';

const WordApiErrorSchema = z.object({
  error: z.enum(['invalid_request', 'upstream_error', 'bad_response', 'server_error']),
});

const WordApiResponseSchema = z.object({
  data: z.array(
    z.object({
      civilian: z.string().min(1),
      undercover: z.string().min(1),
    })
  ).min(1),
});

// Default word pairs
/**
 * The pool starts empty. A new player fetches their own words from the AI
 * rather than inheriting a fixed set — a handful of seeded pairs meant every
 * group's first few rounds were identical, and they polluted the `avoid` list
 * so the model kept regenerating them.
 */
const defaultWords: WordPair[] = [];

export class WordService {
  // Initialize words in localStorage if not exists
  static initializeWords(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWords));
    }
  }

  // Get all words from localStorage
  static getAllWords(): WordPair[] {
    this.initializeWords();
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultWords;
  }

  // Get unplayed words
  static getUnplayedWords(): WordPair[] {
    const allWords = this.getAllWords();
    return allWords.filter(word => !word.played);
  }

  // Get a random unplayed word pair
  static getRandomUnplayedWord(): WordPair | null {
    const unplayedWords = this.getUnplayedWords();
    if (unplayedWords.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * unplayedWords.length);
    return unplayedWords[randomIndex];
  }

  // Mark a word pair as played
  static markWordAsPlayed(civilian: string, undercover: string): void {
    const allWords = this.getAllWords();
    const updatedWords = allWords.map(word => {
      if (word.civilian === civilian && word.undercover === undercover) {
        return { ...word, played: true };
      }
      return word;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWords));
  }

  // Reset all words to unplayed
  static resetAllWords(): void {
    const allWords = this.getAllWords();
    const resetWords = allWords.map(word => ({ ...word, played: false }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resetWords));
  }

  // Check if all words are played
  static areAllWordsPlayed(): boolean {
    const unplayedWords = this.getUnplayedWords();
    return unplayedWords.length === 0;
  }

  /** Words sent as `avoid`, newest first, both halves of each pair. */
  private static recentWords(limit: number): string[] {
    const words: string[] = [];
    for (const pair of this.getAllWords().slice(-Math.ceil(limit / 2)).reverse()) {
      words.push(pair.civilian, pair.undercover);
    }
    return words.slice(0, limit);
  }

  /** Canonical key for a pair, order- and case-insensitive. */
  private static pairKey(civilian: string, undercover: string): string {
    return [civilian.trim().toLowerCase(), undercover.trim().toLowerCase()]
      .sort()
      .join('|');
  }

  // Fetch new words from the /api/words Pages Function
  static async fetchNewWords(numberOfWords: number): Promise<WordPair[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: numberOfWords,
          avoid: this.recentWords(MAX_AVOID_ENTRIES),
        } satisfies WordApiRequest),
        signal: controller.signal,
      });
    } catch {
      throw new WordFetchError('upstream_error', 'Gagal menghubungi server. Periksa koneksi.');
    } finally {
      clearTimeout(timer);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new WordFetchError('bad_response', 'Jawaban server tidak bisa dibaca.');
    }

    if (!response.ok) {
      // Validate the code rather than casting it — an unexpected value would
      // otherwise be typed as a WordApiErrorCode without being one. The
      // message is always taken from the local table, never from the wire.
      const parsedError = WordApiErrorSchema.safeParse(body);
      const code = parsedError.success ? parsedError.data.error : 'server_error';
      throw new WordFetchError(code, WORD_API_MESSAGES[code]);
    }

    const parsed = WordApiResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new WordFetchError('bad_response', 'Server mengirim kata yang tidak valid.');
    }

    return parsed.data.data.map(word => ({
      civilian: word.civilian,
      undercover: word.undercover,
      played: false,
    }));
  }

  /**
   * Append new pairs, skipping any that already exist — including reversed
   * and differently-cased duplicates. Returns how many were actually added.
   */
  static addNewWords(newWords: WordPair[]): number {
    const existing = this.getAllWords();
    const seen = new Set(existing.map(w => this.pairKey(w.civilian, w.undercover)));

    const fresh: WordPair[] = [];
    for (const word of newWords) {
      const key = this.pairKey(word.civilian, word.undercover);
      if (seen.has(key)) continue;
      seen.add(key);
      fresh.push(word);
    }

    if (fresh.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, ...fresh]));
    }

    return fresh.length;
  }

  // Get total word count
  static getTotalWordCount(): number {
    return this.getAllWords().length;
  }

  // Get played word count
  static getPlayedWordCount(): number {
    const allWords = this.getAllWords();
    return allWords.filter(word => word.played).length;
  }
}
