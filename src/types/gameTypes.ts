export type GamePhase = 'setup' | 'card-selection' | 'name-input' | 'word-reveal' | 'word-transition' | 'description' | 'voting' | 'mr-white-guess' | 'game-over';
export type PlayerRole = 'civilian' | 'undercover' | 'mrwhite';

export interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  word: string;
  hasRevealed: boolean;
  cardIndex: number;
  isEliminated: boolean;
}

export interface GameState {
  phase: GamePhase;
  undercoverCount: number;
  mrWhiteCount: number;
  currentPlayerIndex: number;
  selectedCard: number | null;
  players: Player[];
  round: number;
  gameWords: { civilian: string; undercover: string };
  playerOrder: number[];
  selectedPlayerToEliminate: number | null;
  eliminatedPlayer: Player | null;
  winner: 'civilian' | 'undercover' | 'mrwhite' | null;
  mrWhiteGuess: string;
  showingWord: boolean;
}

export interface WordPair {
  civilian: string;
  undercover: string;
  played: boolean;
}

/** Maximum pairs a single /api/words call may request. */
export const MAX_WORDS_PER_REQUEST = 20;

/** Maximum `avoid` entries the function will accept. */
export const MAX_AVOID_ENTRIES = 60;

export interface WordApiRequest {
  /** How many pairs to generate. 1..MAX_WORDS_PER_REQUEST. */
  count: number;
  /** Words already in the player's pool — both halves of recent pairs. */
  avoid?: string[];
}

export interface WordApiResponse {
  data: Array<{ civilian: string; undercover: string }>;
}

export type WordApiErrorCode =
  | 'invalid_request'
  | 'upstream_error'
  | 'bad_response'
  | 'server_error';

/**
 * User-facing text per error code. The client renders from this table rather
 * than from the `message` it receives, so a malformed or unexpected response
 * can never put arbitrary text in front of a player.
 */
export const WORD_API_MESSAGES: Record<WordApiErrorCode, string> = {
  invalid_request: 'Permintaan tidak valid.',
  upstream_error: 'Layanan AI sedang sibuk. Coba lagi sebentar lagi.',
  bad_response: 'Layanan AI tidak mengembalikan kata yang valid.',
  server_error: 'Terjadi kesalahan di server.',
};

export interface WordApiError {
  error: WordApiErrorCode;
  /** Safe to render directly to the player. Never derived from an exception. */
  message: string;
}

/** Thrown by WordService when /api/words returns a non-2xx response. */
export class WordFetchError extends Error {
  constructor(
    public readonly code: WordApiErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'WordFetchError';
  }
}

export interface PlayerConfig {
  totalPlayers: number;
  undercover: number;
  mrWhite: number;
  civilians: number;
}
