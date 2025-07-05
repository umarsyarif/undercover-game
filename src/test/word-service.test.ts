import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WordService } from '../services/wordService';
import { WordApiResponse } from '../types/gameTypes';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('WordService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    // Reset fetch mock
    vi.resetAllMocks();
    // Initialize words
    WordService.initializeWords();
  });

  afterEach(() => {
    // Clear localStorage after each test
    localStorageMock.clear();
  });

  describe('fetchNewWords', () => {
    it('should handle the new API response structure', async () => {
      // Mock API response with the new structure
      const mockResponse: WordApiResponse = {
        data: [
          { civilian: 'Bakso', undercover: 'Siomay' },
          { civilian: 'Gunung', undercover: 'Pantai' },
          { civilian: 'Rebahan', undercover: 'Nongkrong' },
          { civilian: 'Penyanyi', undercover: 'Aktor' },
          { civilian: 'Bantal', undercover: 'Guling' }
        ]
      };

      // Mock fetch implementation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // Set environment variable for API endpoint
      vi.stubEnv('VITE_WORD_API_ENDPOINT', 'https://api.example.com/words');

      // Call fetchNewWords
      const result = await WordService.fetchNewWords(5);

      // Verify fetch was called with correct parameters
      expect(fetch).toHaveBeenCalledWith('https://api.example.com/words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String)
      });

      // Verify result
      expect(result).toHaveLength(5);
      expect(result[0].civilian).toBe('Bakso');
      expect(result[0].undercover).toBe('Siomay');
      expect(result[0].played).toBe(false);
    });

    it('should throw an error when API response is invalid', async () => {
      // Mock invalid API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      });

      // Set environment variable for API endpoint
      vi.stubEnv('VITE_WORD_API_ENDPOINT', 'https://api.example.com/words');

      // Expect fetchNewWords to throw an error
      await expect(WordService.fetchNewWords(5)).rejects.toThrow('Invalid API response format');
    });

    it('should throw an error when API endpoint is not configured', async () => {
      // Clear environment variable for API endpoint
      vi.stubEnv('VITE_WORD_API_ENDPOINT', '');

      // Expect fetchNewWords to throw an error
      await expect(WordService.fetchNewWords(5)).rejects.toThrow('API endpoint not configured');
    });
  });
}); 