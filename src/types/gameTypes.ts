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

export interface WordApiRequest {
  number_of_words: number;
  existing_words: Array<{
    civilian: string;
    undercover: string;
  }>;
}

export interface WordApiResponse {
  data: Array<{
    civilian: string;
    undercover: string;
  }>;
}

export interface PlayerConfig {
  totalPlayers: number;
  undercover: number;
  mrWhite: number;
  civilians: number;
}
