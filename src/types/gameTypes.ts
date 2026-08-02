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
