import { useState, useEffect, useCallback, useRef } from 'react';
import { GameStateManager, GameStateSubscriber, GameEventSubscriber, GameEvent } from '../services/gameStateManager';
import { GameService, GameConfig } from '../services/gameService';
import { GameActionResult } from '../services/gameActionService';
import { GameLogic } from '../services/gameLogic';
import type { GameState, Player } from '../types/gameTypes';

export interface UseGameServiceOptions {
  enableHistory?: boolean;
  enableEvents?: boolean;
  autoSave?: boolean;
  storageKey?: string;
}

export interface GameServiceHook {
  // State
  gameState: GameState;
  isLoading: boolean;
  error: string | null;
  config: GameConfig;
  modals: { [key: string]: boolean };
  playerName: string;
  isRefreshing: boolean;
  
  // Actions
  executeAction: (actionType: string, ...args: any[]) => Promise<GameActionResult>;
  initializeGame: (config: GameConfig) => Promise<boolean>;
  selectCard: (cardIndex: number, playerName?: string) => Promise<boolean>;
  submitPlayerName: (playerName: string) => Promise<boolean>;
  revealWordNext: (totalPlayers: number) => Promise<boolean>;
  selectPlayerForElimination: (playerId: number) => Promise<boolean>;
  eliminatePlayer: (playerId?: number) => Promise<boolean>;
  confirmElimination: () => Promise<boolean>;
  processMrWhiteGuess: (guess: string) => Promise<boolean>;
  startNewRound: () => Promise<boolean>;
  resetGame: () => Promise<boolean>;
  transitionToPhase: (phase: string) => Promise<boolean>;
  refreshWords: () => Promise<boolean>;
  updateMrWhiteGuess: (guess: string) => void;
  startNewGame: (config?: GameConfig) => Promise<{success: boolean}>;
  goToVoting: () => Promise<boolean>;
  openModal: (modalName: string) => void;
  closeModal: (modalName: string) => void;
  updateConfig: (config: Partial<GameConfig>) => void;
  setPlayerName: (name: string) => void;
  setIsRefreshing: (refreshing: boolean) => void;
  
  // Queries
  getCurrentPlayer: () => Player | null;
  getActivePlayers: () => Player[];
  getOrderedPlayers: () => Player[];
  getDescriptionPhaseOrder: () => Player[];
  getVotingPhaseOrder: () => Player[];
  getWinnerPlayers: () => Player[];
  getRemainingCounts: () => ReturnType<typeof GameLogic.getRemainingCounts>;
  getGameStatistics: () => ReturnType<typeof GameService.getGameStatistics>;
  isCardAvailable: (cardIndex: number) => boolean;
  getPlayerByCardIndex: (cardIndex: number) => Player | null;
  canPlayerBeEliminated: (playerId: number) => boolean;
  getAvailableWordCount: () => number;
  isStartButtonEnabled: () => boolean;
  canIncreaseUndercover: () => boolean;
  canDecreaseUndercover: () => boolean;
  canIncreaseMrWhite: () => boolean;
  canDecreaseMrWhite: () => boolean;
  
  // History (if enabled)
  canUndo: () => boolean;
  undo: () => boolean;
  getHistory: () => GameState[];
  
  // Events (if enabled)
  events: GameEvent[];
  clearEvents: () => void;
  
  // Utilities
  validateCurrentState: () => { isValid: boolean; errors: string[] };
  exportState: () => string;
  importState: (serializedState: string) => boolean;
  getDebugInfo: () => any;
}

export function useGameService(options: UseGameServiceOptions = {}): GameServiceHook {
  const {
    enableHistory = true,
    enableEvents = true,
    autoSave = false,
    storageKey = 'undercover-game-state'
  } = options;

  const [gameState, setGameState] = useState<GameState>(() => {
    if (autoSave && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const { state } = JSON.parse(saved);
          const validation = GameService.validateGameState(state);
          if (validation.isValid) {
            return state;
          }
        } catch (error) {
          console.warn('Failed to load saved game state:', error);
        }
      }
    }
    return GameService.resetGame();
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [config, setConfig] = useState<GameConfig>({ totalPlayers: 6, undercover: 1, mrWhite: 1, civilians: 4 });
  const [modals, setModals] = useState<{ [key: string]: boolean }>({});
  const [playerName, setPlayerNameState] = useState<string>('');
  const [isRefreshing, setIsRefreshingState] = useState<boolean>(false);
  
  const gameManagerRef = useRef<GameStateManager | null>(null);
  const maxEvents = 50;

  // Initialize game manager
  useEffect(() => {
    gameManagerRef.current = new GameStateManager(gameState);
    
    // Subscribe to state changes
    const stateSubscriber: GameStateSubscriber = (newState, previousState) => {
      setGameState(newState);
      setError(null);
      
      // Auto-save if enabled
      if (autoSave && typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            state: newState,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.warn('Failed to save game state:', error);
        }
      }
    };
    
    const unsubscribeState = gameManagerRef.current.subscribe(stateSubscriber);
    
    // Subscribe to events if enabled
    let unsubscribeEvents: (() => void) | undefined;
    if (enableEvents) {
      const eventSubscriber: GameEventSubscriber = (event) => {
        setEvents(prev => {
          const newEvents = [...prev, event];
          return newEvents.slice(-maxEvents); // Keep only recent events
        });
      };
      
      unsubscribeEvents = gameManagerRef.current.subscribeToEvents(eventSubscriber);
    }
    
    return () => {
      unsubscribeState();
      unsubscribeEvents?.();
      gameManagerRef.current?.destroy();
    };
  }, []); // Only run once

  // Action wrapper with loading and error handling
  const executeAction = useCallback(async (actionType: string, ...args: any[]): Promise<GameActionResult> => {
    if (!gameManagerRef.current) {
      const errorResult: GameActionResult = {
        success: false,
        error: 'Game manager not initialized'
      };
      setError(errorResult.error!);
      return errorResult;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await gameManagerRef.current.executeAction(actionType, ...args);
      
      if (!result.success && result.error) {
        setError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Convenience action methods
  const initializeGame = useCallback(async (config: GameConfig): Promise<boolean> => {
    const result = await executeAction('startNewGame', config);
    return result.success;
  }, [executeAction]);

  const selectCard = useCallback(async (cardIndex: number, playerName?: string): Promise<boolean> => {
    const result = await executeAction('selectCard', cardIndex, playerName);
    return result.success;
  }, [executeAction]);

  const submitPlayerName = useCallback(async (playerName: string): Promise<boolean> => {
    const result = await executeAction('submitPlayerName', playerName);
    return result.success;
  }, [executeAction]);

  const revealWordNext = useCallback(async (totalPlayers: number): Promise<boolean> => {
    const result = await executeAction('revealWordNext', totalPlayers);
    return result.success;
  }, [executeAction]);

  const selectPlayerForElimination = useCallback(async (playerId: number): Promise<boolean> => {
    const result = await executeAction('selectPlayerForElimination', playerId);
    return result.success;
  }, [executeAction]);

  const eliminatePlayer = useCallback(async (playerId?: number): Promise<boolean> => {
    if (playerId !== undefined) {
      // First select the player to eliminate
      const selectResult = await executeAction('selectPlayerForElimination', playerId);
      if (!selectResult.success) return false;
    }
    // Then eliminate the selected player
    const result = await executeAction('eliminatePlayer');
    return result.success;
  }, [executeAction]);

  const confirmElimination = useCallback(async (): Promise<boolean> => {
    const result = await executeAction('confirmElimination');
    return result.success;
  }, [executeAction]);

  const processMrWhiteGuess = useCallback(async (guess: string): Promise<boolean> => {
    const result = await executeAction('processMrWhiteGuess', guess);
    return result.success;
  }, [executeAction]);

  const updateMrWhiteGuess = useCallback((guess: string) => {
    if (gameManagerRef.current) {
      gameManagerRef.current.updateState({ mrWhiteGuess: guess });
    }
  }, []);

  const startNewRound = useCallback(async (): Promise<boolean> => {
    const result = await executeAction('startNewRound');
    return result.success;
  }, [executeAction]);

  const resetGame = useCallback(async (): Promise<boolean> => {
    const result = await executeAction('resetGame');
    return result.success;
  }, [executeAction]);

  const transitionToPhase = useCallback(async (phase: string): Promise<boolean> => {
    const result = await executeAction('transitionToPhase', phase);
    return result.success;
  }, [executeAction]);

  const refreshWords = useCallback(async (): Promise<boolean> => {
    const result = await executeAction('refreshWords');
    return result.success;
  }, [executeAction]);

  // Query methods
  const getCurrentPlayer = useCallback((): Player | null => {
    return gameManagerRef.current?.getCurrentPlayer() || null;
  }, [gameState.currentPlayerIndex, gameState.players]);

  const getActivePlayers = useCallback((): Player[] => {
    return gameManagerRef.current?.getActivePlayers() || [];
  }, [gameState.players]);

  const getOrderedPlayers = useCallback((): Player[] => {
    return gameManagerRef.current?.getOrderedPlayers() || [];
  }, [gameState.players]);

  const getDescriptionPhaseOrder = useCallback((): Player[] => {
    return gameManagerRef.current?.getDescriptionPhaseOrder() || [];
  }, [gameState.players]);

  const getVotingPhaseOrder = useCallback((): Player[] => {
    return gameManagerRef.current?.getVotingPhaseOrder() || [];
  }, [gameState.players]);

  const getWinnerPlayers = useCallback((): Player[] => {
    return gameManagerRef.current?.getWinnerPlayers() || [];
  }, [gameState.winner, gameState.players]);

  const getRemainingCounts = useCallback(() => {
    return gameManagerRef.current?.getRemainingCounts() || {
      civilians: 0,
      undercover: 0,
      mrWhite: 0
    };
  }, [gameState.players]);

  const getGameStatistics = useCallback(() => {
    return gameManagerRef.current?.getGameStatistics() || {
      totalPlayers: 0,
      activePlayers: 0,
      eliminatedPlayers: 0,
      remainingCounts: { civilians: 0, undercover: 0, mrWhite: 0 },
      gameStatus: {
        phase: gameState.phase,
        round: gameState.round,
        currentPlayer: 'Unknown',
        remainingCounts: { civilians: 0, undercover: 0, mrWhite: 0 }
      }
    };
  }, [gameState]);

  const isCardAvailable = useCallback((cardIndex: number): boolean => {
    return gameManagerRef.current?.isCardAvailable(cardIndex) || false;
  }, [gameState.players]);

  const getPlayerByCardIndex = useCallback((cardIndex: number): Player | null => {
    return gameManagerRef.current?.getPlayerByCardIndex(cardIndex) || null;
  }, [gameState.players]);

  const canPlayerBeEliminated = useCallback((playerId: number): boolean => {
    return gameManagerRef.current?.canPlayerBeEliminated(playerId) || false;
  }, [gameState.players]);

  // History methods
  const canUndo = useCallback((): boolean => {
    return enableHistory && (gameManagerRef.current?.canUndo() || false);
  }, [enableHistory, gameState]);

  const undo = useCallback((): boolean => {
    return enableHistory && (gameManagerRef.current?.undo() || false);
  }, [enableHistory]);

  const getHistory = useCallback((): GameState[] => {
    return enableHistory ? (gameManagerRef.current?.getHistory() || []) : [];
  }, [enableHistory, gameState]);

  // Event methods
  const clearEvents = useCallback((): void => {
    setEvents([]);
  }, []);

  // Utility methods
  const validateCurrentState = useCallback(() => {
    return gameManagerRef.current?.validateCurrentState() || {
      isValid: false,
      errors: ['Game manager not initialized']
    };
  }, [gameState]);

  const exportState = useCallback((): string => {
    return gameManagerRef.current?.exportState() || '{}';
  }, [gameState]);

  const importState = useCallback((serializedState: string): boolean => {
    return gameManagerRef.current?.importState(serializedState) || false;
  }, []);

  const getDebugInfo = useCallback(() => {
    return gameManagerRef.current?.getDebugInfo() || {};
  }, [gameState]);

  const openModal = useCallback((modalName: string) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName: string) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<GameConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Additional methods for compatibility
  const startNewGame = useCallback(async (config?: GameConfig): Promise<{success: boolean}> => {
    if (config) {
      // If config is provided, update it first
      updateConfig(config);
      // Then initialize the game with the updated config
      const result = await executeAction('startNewGame', config);
      return { success: result.success };
    } else {
      // If no config provided, just reset the game
      const result = await executeAction('resetGame');
      return { success: result.success };
    }
  }, [executeAction, updateConfig]);

  const goToVoting = useCallback(async (): Promise<boolean> => {
    const result = await executeAction('transitionToPhase', 'voting');
    return result.success;
  }, [executeAction]);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
  }, []);

  const setIsRefreshing = useCallback((refreshing: boolean) => {
    setIsRefreshingState(refreshing);
  }, []);

  const getAvailableWordCount = useCallback((): number => {
    return 100; // Mock implementation
  }, []);

  const isStartButtonEnabled = useCallback((): boolean => {
    return config.totalPlayers >= 3;
  }, [config]);

  const canIncreaseUndercover = useCallback((): boolean => {
    return config.undercover < config.totalPlayers - 2;
  }, [config]);

  const canDecreaseUndercover = useCallback((): boolean => {
    return config.undercover > 0;
  }, [config]);

  const canIncreaseMrWhite = useCallback((): boolean => {
    return config.mrWhite < config.totalPlayers - 2;
  }, [config]);

  const canDecreaseMrWhite = useCallback((): boolean => {
    return config.mrWhite > 0;
  }, [config]);

  return {
    // State
    gameState,
    isLoading,
    error,
    config,
    modals,
    playerName,
    isRefreshing,
    
    // Actions
    executeAction,
    initializeGame,
    selectCard,
    submitPlayerName,
    revealWordNext,
    selectPlayerForElimination,
    eliminatePlayer,
    confirmElimination,
    processMrWhiteGuess,
    startNewRound,
    resetGame,
    transitionToPhase,
    refreshWords,
    updateMrWhiteGuess,
    startNewGame,
    goToVoting,
    openModal,
    closeModal,
    updateConfig,
    setPlayerName,
    setIsRefreshing,
  
    // Queries
    getCurrentPlayer,
    getActivePlayers,
    getOrderedPlayers,
    getDescriptionPhaseOrder,
    getVotingPhaseOrder,
    getWinnerPlayers,
    getRemainingCounts,
    getGameStatistics,
    isCardAvailable,
    getPlayerByCardIndex,
    canPlayerBeEliminated,
    getAvailableWordCount,
    isStartButtonEnabled,
    canIncreaseUndercover,
    canDecreaseUndercover,
    canIncreaseMrWhite,
    canDecreaseMrWhite,
    
    // History
    canUndo,
    undo,
    getHistory,
    
    // Events
    events: enableEvents ? events : [],
    clearEvents,
    
    // Utilities
    validateCurrentState,
    exportState,
    importState,
    getDebugInfo
  };
}