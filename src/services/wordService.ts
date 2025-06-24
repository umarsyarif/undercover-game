import { WordPair, WordApiRequest, WordApiResponse } from '../types/gameTypes';

const STORAGE_KEY = 'gameWords';

// Default word pairs
const defaultWords: WordPair[] = [
  { civilian: 'Apel', undercover: 'Jeruk', played: false },
  { civilian: 'Kucing', undercover: 'Anjing', played: false },
  { civilian: 'Mobil', undercover: 'Motor', played: false },
  { civilian: 'Kopi', undercover: 'Teh', played: false },
  { civilian: 'Buku', undercover: 'Majalah', played: false },
];

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

  // Fetch new words from API
  static async fetchNewWords(numberOfWords: number): Promise<WordPair[]> {
    const apiEndpoint = import.meta.env.VITE_WORD_API_ENDPOINT;
    
    if (!apiEndpoint) {
      throw new Error('API endpoint not configured');
    }

    const existingWords = this.getAllWords().map(word => ({
      civilian: word.civilian,
      undercover: word.undercover
    }));

    const requestBody: WordApiRequest = {
      number_of_words: numberOfWords,
      existing_words: existingWords
    };

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: WordApiResponse = await response.json();
      
      if (!data.output || !data.output.data || !Array.isArray(data.output.data)) {
        throw new Error('Invalid API response format');
      }

      return data.output.data.map(word => ({
        civilian: word.civilian,
        undercover: word.undercover,
        played: false
      }));
    } catch (error) {
      console.error('Error fetching new words:', error);
      throw error;
    }
  }

  // Add new words to storage
  static addNewWords(newWords: WordPair[]): void {
    const existingWords = this.getAllWords();
    const allWords = [...existingWords, ...newWords];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allWords));
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