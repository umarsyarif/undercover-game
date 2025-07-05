/**
 * Service layer type definitions for the Undercover game
 */

import { GameState, Player, GamePhase, PlayerRole } from '../types/gameTypes';

// Type alias for compatibility
type Role = PlayerRole;

/**
 * Modal state management
 */
export interface ModalState {
  [modalName: string]: boolean;
}

// =============================================================================
// Game Action Types
// =============================================================================

/**
 * Result of a game action execution
 */
export interface GameActionResult {
  /** Whether the action was successful */
  success: boolean;
  /** The new game state after the action (if successful) */
  newState?: GameState;
  /** Error message if the action failed */
  error?: string;
  /** Side effects to be executed after state update */
  sideEffects?: GameActionSideEffects;
}

/**
 * Side effects that should be executed after a game action
 */
export interface GameActionSideEffects {
  /** Modal to open */
  openModal?: string;
  /** Modal to close */
  closeModal?: string;
  /** Delay in milliseconds before executing other side effects */
  delay?: number;
  /** Custom callback to execute */
  callback?: () => void;
  /** Data to pass to the callback */
  callbackData?: any;
}

/**
 * Available game actions
 */
export type GameActionType =
  | 'selectCard'
  | 'submitPlayerName'
  | 'revealWordNext'
  | 'eliminatePlayer'
  | 'submitMrWhiteGuess'
  | 'startNewRound'
  | 'resetGame'
  | 'refreshWords';

// =============================================================================
// Game Configuration Types
// =============================================================================

/**
 * Configuration for initializing a new game
 */
export interface GameConfig {
  /** Total number of players */
  totalPlayers: number;
  /** Number of undercover agents */
  undercover: number;
  /** Number of Mr. White players */
  mrWhite: number;
  /** Number of civilian players */
  civilians: number;
}

/**
 * Validation result for game configuration
 */
export interface GameConfigValidation {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Reason for invalidity (if applicable) */
  reason?: string;
  /** Suggested fixes for the configuration */
  suggestions?: string[];
}

// =============================================================================
// Game State Management Types
// =============================================================================

/**
 * State change event
 */
export interface StateChangeEvent {
  /** Timestamp of the change */
  timestamp: number;
  /** Previous state */
  previousState: GameState;
  /** New state */
  newState: GameState;
  /** Action that caused the change */
  action?: GameActionType;
  /** Additional context about the change */
  context?: any;
}

/**
 * Game event for tracking and debugging
 */
export interface GameEvent {
  /** Unique event ID */
  id: string;
  /** Timestamp of the event */
  timestamp: number;
  /** Type of event */
  type: GameActionType | 'stateChange' | 'error' | 'validation';
  /** Event data */
  data: any;
  /** Current game phase when event occurred */
  phase: GamePhase;
  /** Current player when event occurred */
  currentPlayer?: Player;
}

/**
 * History entry for undo/redo functionality
 */
export interface HistoryEntry {
  /** Unique entry ID */
  id: string;
  /** Timestamp of the entry */
  timestamp: number;
  /** Game state at this point */
  state: GameState;
  /** Action that led to this state */
  action?: GameActionType;
  /** Description of the change */
  description?: string;
}

// =============================================================================
// Service Configuration Types
// =============================================================================

/**
 * Configuration options for GameStateManager
 */
export interface GameStateManagerConfig {
  /** Maximum number of history entries to keep */
  maxHistorySize?: number;
  /** Whether to enable event tracking */
  enableEvents?: boolean;
  /** Maximum number of events to keep */
  maxEventSize?: number;
  /** Whether to validate state after each change */
  validateOnChange?: boolean;
  /** Custom state validator function */
  customValidator?: (state: GameState) => StateValidationResult;
}

/**
 * Configuration options for useGameService hook
 */
export interface UseGameServiceConfig {
  /** Whether to enable undo/redo functionality */
  enableHistory?: boolean;
  /** Whether to track game events */
  enableEvents?: boolean;
  /** Whether to auto-save state to localStorage */
  autoSave?: boolean;
  /** Storage key for auto-save */
  storageKey?: string;
  /** Initial game configuration */
  initialConfig?: GameConfig;
  /** Whether to initialize game on mount */
  autoInitialize?: boolean;
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Result of state validation
 */
export interface StateValidationResult {
  /** Whether the state is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of warnings (non-critical issues) */
  warnings: string[];
  /** Suggested fixes */
  suggestions: string[];
}

/**
 * Validation context for detailed error reporting
 */
export interface ValidationContext {
  /** Current game phase */
  phase: GamePhase;
  /** Number of players */
  playerCount: number;
  /** Number of active players */
  activePlayerCount: number;
  /** Current player index */
  currentPlayerIndex: number;
  /** Whether game has started */
  gameStarted: boolean;
}

// =============================================================================
// Query Result Types
// =============================================================================

/**
 * Counts of remaining players by role
 */
export interface RoleCounts {
  /** Number of remaining civilians */
  civilians: number;
  /** Number of remaining undercover agents */
  undercovers: number;
  /** Number of remaining Mr. White players */
  mrWhites: number;
  /** Total number of active players */
  total: number;
}

/**
 * Game statistics for analysis
 */
export interface GameStats {
  /** Total number of rounds played */
  totalRounds: number;
  /** Number of players eliminated */
  playersEliminated: number;
  /** Current round number */
  currentRound: number;
  /** Game duration in milliseconds */
  gameDuration: number;
  /** Number of actions taken */
  actionsCount: number;
  /** Role distribution */
  roleDistribution: Record<Role, number>;
  /** Win condition if game ended */
  winCondition?: 'civilians' | 'undercover' | 'mrWhite';
}

/**
 * Debug information for troubleshooting
 */
export interface DebugInfo {
  /** Current game state summary */
  stateSummary: {
    phase: GamePhase;
    playerCount: number;
    activePlayerCount: number;
    currentPlayerIndex: number;
    selectedCard?: number;
    gameStarted: boolean;
  };
  /** Recent actions */
  recentActions: GameEvent[];
  /** State validation result */
  validation: StateValidationResult;
  /** Performance metrics */
  performance: {
    lastActionDuration: number;
    averageActionDuration: number;
    memoryUsage: number;
  };
  /** Configuration */
  config: {
    historyEnabled: boolean;
    eventsEnabled: boolean;
    autoSaveEnabled: boolean;
    maxHistorySize: number;
    maxEventSize: number;
  };
}

// =============================================================================
// Service Interface Types
// =============================================================================

/**
 * Interface for game service implementations
 */
export interface IGameService {
  /** Initialize a new game */
  initializeGame(config: GameConfig): GameState;
  /** Transition to the next game phase */
  transitionToPhase(state: GameState, phase: GamePhase): GameState;
  /** Check and update win conditions */
  checkAndUpdateWinConditions(state: GameState): GameState;
  /** Validate current game state */
  validateGameState(state: GameState): StateValidationResult;
  /** Get game statistics */
  getGameStats(state: GameState): GameStats;
}

/**
 * Interface for action service implementations
 */
export interface IGameActionService {
  /** Execute a card selection action */
  selectCard(state: GameState, cardIndex: number, playerName?: string): GameActionResult;
  /** Execute a player name submission */
  submitPlayerName(state: GameState, name: string): GameActionResult;
  /** Execute word reveal next action */
  revealWordNext(state: GameState): GameActionResult;
  /** Execute player elimination */
  eliminatePlayer(state: GameState): GameActionResult;
  /** Execute Mr. White guess submission */
  submitMrWhiteGuess(state: GameState, guess: string): GameActionResult;
}

/**
 * Interface for state manager implementations
 */
export interface IGameStateManager {
  /** Get current state */
  getState(): GameState;
  /** Update state */
  setState(newState: GameState): void;
  /** Subscribe to state changes */
  subscribe(callback: (newState: GameState, previousState: GameState) => void): () => void;
  /** Execute a game action */
  executeAction(action: GameActionType, ...args: any[]): Promise<GameActionResult>;
  /** Check if undo is available */
  canUndo(): boolean;
  /** Undo last action */
  undo(): boolean;
  /** Get action history */
  getHistory(): HistoryEntry[];
  /** Clear history */
  clearHistory(): void;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Type for subscription callback functions
 */
export type StateSubscriptionCallback = (newState: GameState, previousState: GameState) => void;

/**
 * Type for event callback functions
 */
export type EventCallback = (event: GameEvent) => void;

/**
 * Type for action execution parameters
 */
export type ActionParams<T extends GameActionType> = 
  T extends 'selectCard' ? [cardIndex: number, playerName?: string] :
  T extends 'submitPlayerName' ? [name: string] :
  T extends 'submitMrWhiteGuess' ? [guess: string] :
  T extends 'revealWordNext' | 'eliminatePlayer' | 'startNewRound' | 'resetGame' | 'refreshWords' ? [] :
  never;

/**
 * Type for modal names used in side effects
 */
export type ModalName = 
  | 'showNameModal'
  | 'showWordModal'
  | 'showTurnModal'
  | 'showEliminationModal'
  | 'showMrWhiteGuessModal'
  | 'showGameOverModal'
  | 'showWordManagementModal';

/**
 * Type for storage operations
 */
export interface StorageOperations {
  /** Save state to storage */
  save(key: string, state: GameState): boolean;
  /** Load state from storage */
  load(key: string): GameState | null;
  /** Remove state from storage */
  remove(key: string): boolean;
  /** Check if storage is available */
  isAvailable(): boolean;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Custom error class for game service errors
 */
export class GameServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'GameServiceError';
  }
}

/**
 * Error codes for different types of game service errors
 */
export enum GameServiceErrorCode {
  INVALID_CONFIG = 'INVALID_CONFIG',
  INVALID_STATE = 'INVALID_STATE',
  INVALID_ACTION = 'INVALID_ACTION',
  INVALID_PHASE = 'INVALID_PHASE',
  INVALID_PLAYER = 'INVALID_PLAYER',
  STORAGE_ERROR = 'STORAGE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}