import type { GameState, Player } from './gameTypes';
import type { GameConfig, ModalState } from '../services/types';

/**
 * Props for container components that handle business logic
 */
export interface GameContainerProps {
  // No props needed as container manages its own state
}

/**
 * Props for the main GameUI component that receives all state and handlers from container
 */
export interface GameUIProps {
  // State
  gameState: GameState;
  config: GameConfig;
  modals: ModalState;
  playerName: string;
  isRefreshing: boolean;
  
  // Computed values
  currentPlayer: Player | null;
  orderedPlayers: Player[];
  activePlayers: Player[];
  remainingCounts: {
    undercovers: number;
    mrWhites: number;
    total: number;
  };
  availableWordCount: number;
  civilians: number;
  canIncreaseUndercover: boolean | (() => boolean);
  canDecreaseUndercover: boolean | (() => boolean);
  canIncreaseMrWhite: boolean | (() => boolean);
  canDecreaseMrWhite: boolean | (() => boolean);
  isStartButtonEnabled: boolean | (() => boolean);
  sortedPlayersForVoting: Player[];
  winnerPlayers: Player[];
  
  // Service queries
  getPlayerByCardIndex: (cardIndex: number) => Player | null;
  isCardAvailable: (cardIndex: number) => boolean;
  
  // Game lifecycle handlers
  onStart: () => Promise<void>;
  onRefreshWords: () => Promise<void>;
  onWordsUpdated: () => Promise<boolean>;
  onBackToSetup: () => void;
  
  // Player action handlers
  onNameSubmit: () => void;
  onCardSelect: (cardIndex: number) => void;
  onPlayerSelect: (playerId: number) => void;
  onEliminatePlayer: () => void;
  
  // Phase transition handlers
  onWordRevealNext: () => void;
  onGoToVoting: () => void;
  onEliminationConfirm: () => void;
  onMrWhiteGuess: () => void;
  onTurnModalNext: () => void;
  onPhaseTransition: (phase: string) => void;
  
  // Configuration handlers
  onConfigChange: (updates: Partial<GameConfig>) => void;
  
  // Input handlers
  onPlayerNameChange: (name: string) => void;
  onMrWhiteGuessChange: (guess: string) => void;
  
  // Modal handlers
  openModal: (modalName: string) => void;
  closeModal: (modalName: string) => void;
}

/**
 * Props for phase-specific container components
 */
export interface SetupContainerProps {
  config: GameConfig;
  modals: ModalState;
  availableWordCount: number;
  civilians: number;
  canIncreaseUndercover: boolean;
  canDecreaseUndercover: boolean;
  canIncreaseMrWhite: boolean;
  canDecreaseMrWhite: boolean;
  isStartButtonEnabled: boolean;
  onStart: () => Promise<void>;
  onConfigChange: (updates: Partial<GameConfig>) => void;
  onWordsUpdated: () => Promise<boolean>;
  openModal: (modalName: keyof ModalState) => void;
  closeModal: (modalName: keyof ModalState) => void;
}

export interface CardSelectionContainerProps {
  gameState: GameState;
  config: GameConfig;
  modals: ModalState;
  playerName: string;
  isRefreshing: boolean;
  currentPlayer: Player | null;
  remainingCounts: {
    undercovers: number;
    mrWhites: number;
    total: number;
  };
  getPlayerByCardIndex: (cardIndex: number) => Player | null;
  isCardAvailable: (cardIndex: number) => boolean;
  onBackToSetup: () => void;
  onCardSelect: (cardIndex: number) => void;
  onRefreshWords: () => Promise<void>;
  onNameSubmit: () => void;
  onPlayerNameChange: (name: string) => void;
  onWordRevealNext: () => void;
  onTurnModalNext: () => void;
  onWordsUpdated: () => Promise<boolean>;
  openModal: (modalName: keyof ModalState) => void;
  closeModal: (modalName: keyof ModalState) => void;
}

export interface VotingContainerProps {
  gameState: GameState;
  modals: ModalState;
  sortedPlayersForVoting: Player[];
  remainingCounts: {
    undercovers: number;
    mrWhites: number;
    total: number;
  };
  onPhaseTransition: (phase: string) => void;
  onPlayerSelect: (playerId: number) => void;
  onEliminatePlayer: () => void;
  onEliminationConfirm: () => void;
  closeModal: (modalName: keyof ModalState) => void;
}

export interface GameOverContainerProps {
  gameState: GameState;
  modals: ModalState;
  winnerPlayers: Player[];
  onBackToSetup: () => void;
  closeModal: (modalName: keyof ModalState) => void;
}