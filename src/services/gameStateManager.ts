import { GameService, GameConfig } from './gameService';
import { GameActionService, GameActionResult } from './gameActionService';
import { GameLogic } from './gameLogic';
import type { GameState, Player } from '../types/gameTypes';

export interface GameStateSubscriber {
  (newState: GameState, previousState: GameState): void;
}

export interface GameEventSubscriber {
  (event: GameEvent): void;
}

export interface GameEvent {
  type: string;
  payload?: any;
  timestamp: number;
}

export class GameStateManager {
  private state: GameState;
  private subscribers: Set<GameStateSubscriber> = new Set();
  private eventSubscribers: Set<GameEventSubscriber> = new Set();
  private history: GameState[] = [];
  private maxHistorySize = 10;

  constructor(initialState?: GameState) {
    this.state = initialState || GameService.resetGame();
    this.addToHistory(this.state);
  }

  // State management
  getState(): GameState {
    return { ...this.state };
  }

  setState(newState: GameState): void {
    const previousState = { ...this.state };
    this.state = { ...newState };
    this.addToHistory(this.state);
    this.notifySubscribers(this.state, previousState);
  }

  updateState(updates: Partial<GameState>): void {
    const newState = { ...this.state, ...updates };
    this.setState(newState);
  }

  // History management
  private addToHistory(state: GameState): void {
    this.history.push({ ...state });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  getHistory(): GameState[] {
    return [...this.history];
  }

  canUndo(): boolean {
    return this.history.length > 1;
  }

  undo(): boolean {
    if (!this.canUndo()) return false;
    
    this.history.pop(); // Remove current state
    const previousState = this.history[this.history.length - 1];
    
    if (previousState) {
      const currentState = { ...this.state };
      this.state = { ...previousState };
      this.notifySubscribers(this.state, currentState);
      this.emitEvent({ type: 'state_undone', timestamp: Date.now() });
      return true;
    }
    
    return false;
  }

  // Subscription management
  subscribe(subscriber: GameStateSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  subscribeToEvents(subscriber: GameEventSubscriber): () => void {
    this.eventSubscribers.add(subscriber);
    return () => this.eventSubscribers.delete(subscriber);
  }

  private notifySubscribers(newState: GameState, previousState: GameState): void {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(newState, previousState);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }

  private emitEvent(event: GameEvent): void {
    this.eventSubscribers.forEach(subscriber => {
      try {
        subscriber(event);
      } catch (error) {
        console.error('Error in event subscriber:', error);
      }
    });
  }

  // Game actions with error handling and events
  async executeAction(
    actionType: string,
    ...args: any[]
  ): Promise<GameActionResult> {
    const validation = GameActionService.validateAction(this.state, actionType);
    if (!validation.isValid) {
      const result: GameActionResult = {
        success: false,
        error: validation.reason
      };
      this.emitEvent({
        type: 'action_failed',
        payload: { actionType, error: validation.reason },
        timestamp: Date.now()
      });
      return result;
    }

    let result: GameActionResult;

    try {
      switch (actionType) {
        case 'selectCard':
          result = GameActionService.selectCard(this.state, args[0] as number, args[1] as string);
          break;
        case 'submitPlayerName':
          result = GameActionService.submitPlayerName(this.state, args[0] as string);
          break;
        case 'revealWordNext':
          result = GameActionService.revealWordNext(this.state);
          break;
        case 'selectPlayerForElimination':
          result = GameActionService.selectPlayerForElimination(this.state, args[0] as number);
          break;
        case 'eliminatePlayer':
          result = GameActionService.eliminatePlayer(this.state);
          break;
        case 'confirmElimination':
          result = GameActionService.confirmElimination(this.state);
          break;
        case 'processMrWhiteGuess':
          result = GameActionService.processMrWhiteGuess(this.state, args[0] as string);
          break;
        case 'startNewGame':
          result = GameActionService.startNewGame(args[0] as any);
          break;
        case 'startNewRound':
          result = GameActionService.startNewRound(this.state);
          break;
        case 'resetGame':
          result = GameActionService.resetGame();
          break;
        case 'transitionToPhase':
          result = GameActionService.transitionToPhase(this.state, args[0] as any);
          break;
        case 'refreshWords':
          result = GameActionService.refreshWords(this.state);
          break;
        default:
          result = {
            success: false,
            error: `Unknown action type: ${actionType}`
          };
      }

      if (result.success && result.newState) {
        this.setState(result.newState);
        this.emitEvent({
          type: 'action_executed',
          payload: { actionType, args, sideEffects: result.sideEffects },
          timestamp: Date.now()
        });
      } else if (!result.success) {
        this.emitEvent({
          type: 'action_failed',
          payload: { actionType, error: result.error },
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorResult: GameActionResult = {
        success: false,
        error: errorMessage
      };
      
      this.emitEvent({
        type: 'action_error',
        payload: { actionType, error: errorMessage },
        timestamp: Date.now()
      });
      
      return errorResult;
    }
  }

  // Convenience methods for common operations
  async initializeGame(config: GameConfig): Promise<boolean> {
    const result = await this.executeAction('startNewGame', config);
    return result.success;
  }

  async selectCard(cardIndex: number, playerName?: string): Promise<boolean> {
    const result = await this.executeAction('selectCard', cardIndex, playerName);
    return result.success;
  }

  async eliminatePlayer(playerId?: number): Promise<boolean> {
    if (playerId !== undefined) {
      const selectResult = await this.executeAction('selectPlayerForElimination', playerId);
      if (!selectResult.success) return false;
    }
    
    const eliminateResult = await this.executeAction('eliminatePlayer');
    return eliminateResult.success;
  }

  async processMrWhiteGuess(guess: string): Promise<boolean> {
    const result = await this.executeAction('processMrWhiteGuess', guess);
    return result.success;
  }

  // Game state queries
  getCurrentPlayer(): Player | null {
    return GameLogic.getCurrentPlayer(this.state);
  }

  getActivePlayers(): Player[] {
    return GameLogic.getActivePlayers(this.state.players);
  }

  getOrderedPlayers(): Player[] {
    return GameLogic.getOrderedPlayers(this.state.players);
  }

  getDescriptionPhaseOrder(): Player[] {
    return GameLogic.getDescriptionPhaseOrder(this.state.players);
  }

  getVotingPhaseOrder(): Player[] {
    return GameLogic.getVotingPhaseOrder(this.state.players);
  }

  getWinnerPlayers(): Player[] {
    return GameService.getWinnerPlayers(this.state);
  }

  getRemainingCounts(): ReturnType<typeof GameLogic.getRemainingCounts> {
    return GameLogic.getRemainingCounts(this.state.players);
  }

  getGameStatistics(): ReturnType<typeof GameService.getGameStatistics> {
    return GameService.getGameStatistics(this.state);
  }

  isCardAvailable(cardIndex: number): boolean {
    return GameLogic.isCardAvailable(this.state.players, cardIndex);
  }

  getPlayerByCardIndex(cardIndex: number): Player | null {
    return GameLogic.getPlayerByCardIndex(this.state.players, cardIndex);
  }

  canPlayerBeEliminated(playerId: number): boolean {
    return GameService.canPlayerBeEliminated(this.state, playerId);
  }

  // Game state validation
  validateCurrentState(): { isValid: boolean; errors: string[] } {
    return GameService.validateGameState(this.state);
  }

  // Debug and development helpers
  getDebugInfo(): {
    state: GameState;
    history: GameState[];
    statistics: ReturnType<typeof GameService.getGameStatistics>;
    validation: ReturnType<typeof GameService.validateGameState>;
  } {
    return {
      state: this.getState(),
      history: this.getHistory(),
      statistics: this.getGameStatistics(),
      validation: this.validateCurrentState()
    };
  }

  // Export/Import state for persistence
  exportState(): string {
    return JSON.stringify({
      state: this.state,
      timestamp: Date.now()
    });
  }

  importState(serializedState: string): boolean {
    try {
      const { state } = JSON.parse(serializedState);
      const validation = GameService.validateGameState(state);
      
      if (validation.isValid) {
        this.setState(state);
        this.emitEvent({
          type: 'state_imported',
          timestamp: Date.now()
        });
        return true;
      } else {
        console.error('Invalid state for import:', validation.errors);
        return false;
      }
    } catch (error) {
      console.error('Error importing state:', error);
      return false;
    }
  }

  // Cleanup
  destroy(): void {
    this.subscribers.clear();
    this.eventSubscribers.clear();
    this.history = [];
  }
}

// Singleton instance for global use
let globalGameStateManager: GameStateManager | null = null;

export function getGlobalGameStateManager(): GameStateManager {
  if (!globalGameStateManager) {
    globalGameStateManager = new GameStateManager();
  }
  return globalGameStateManager;
}

export function resetGlobalGameStateManager(): void {
  if (globalGameStateManager) {
    globalGameStateManager.destroy();
  }
  globalGameStateManager = new GameStateManager();
}