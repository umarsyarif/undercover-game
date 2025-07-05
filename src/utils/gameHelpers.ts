import type { Player, GameState } from '../types/gameTypes';
import { GameLogic } from '../services/gameLogic';

/**
 * Consolidated game helper functions to eliminate redundancy across components
 * These are pure functions that don't depend on React state
 */

/**
 * Player-related helper functions
 */
export const PlayerHelpers = {
  /**
   * Get current player based on game state
   */
  getCurrentPlayer: (gameState: GameState): Player | null => {
    return GameLogic.getCurrentPlayer(gameState);
  },

  /**
   * Get player by card index
   */
  getPlayerByCardIndex: (players: Player[], cardIndex: number): Player | null => {
    return GameLogic.getPlayerByCardIndex(players, cardIndex);
  },

  /**
   * Check if card is available for selection
   */
  isCardAvailable: (players: Player[], cardIndex: number): boolean => {
    return GameLogic.isCardAvailable(players, cardIndex);
  },

  /**
   * Get ordered players for display
   */
  getOrderedPlayers: (players: Player[]): Player[] => {
    return GameLogic.getOrderedPlayers(players);
  },

  /**
   * Get ordered players for description phase (based on card selection order)
   */
  getDescriptionPhaseOrder: (players: Player[]): Player[] => {
    return GameLogic.getDescriptionPhaseOrder(players);
  },

  /**
   * Get ordered players for voting phase (same as description order, but eliminated players at the end)
   */
  getVotingPhaseOrder: (players: Player[]): Player[] => {
    return GameLogic.getVotingPhaseOrder(players);
  },

  /**
   * Get active (non-eliminated) players
   */
  getActivePlayers: (players: Player[]): Player[] => {
    return GameLogic.getActivePlayers(players);
  },

  /**
   * Get remaining player counts by role
   */
  getRemainingCounts: (players: Player[]) => {
    const counts = GameLogic.getRemainingCounts(players);
    return {
      undercovers: counts.undercover,
      mrWhites: counts.mrWhite,
      civilians: counts.civilians,
      total: counts.civilians + counts.undercover + counts.mrWhite
    };
  },

  /**
   * Get sorted players for voting phase (active first, then eliminated)
   * @deprecated Use getVotingPhaseOrder instead
   */
  getSortedPlayersForVoting: (players: Player[]): Player[] => {
    return GameLogic.getVotingPhaseOrder(players);
  },

  /**
   * Get winner players based on game result
   */
  getWinnerPlayers: (players: Player[], winner: string | null): Player[] => {
    const activePlayers = GameLogic.getActivePlayers(players);
    return activePlayers.filter(p => 
      winner === 'civilian' ? p.role === 'civilian' :
      winner === 'undercover' ? p.role === 'undercover' :
      winner === 'mrwhite' ? p.role === 'mrwhite' : false
    );
  }
};

/**
 * Configuration validation helpers
 */
export const ConfigHelpers = {
  /**
   * Calculate civilians count
   */
  getCiviliansCount: (totalPlayers: number, undercover: number, mrWhite: number): number => {
    return totalPlayers - undercover - mrWhite;
  },

  /**
   * Check if undercover count can be increased
   */
  canIncreaseUndercover: (totalPlayers: number, undercover: number, mrWhite: number): boolean => {
    return undercover < Math.floor(totalPlayers / 3) && (undercover + mrWhite) < totalPlayers - 1;
  },

  /**
   * Check if undercover count can be decreased
   */
  canDecreaseUndercover: (undercover: number): boolean => {
    return undercover > 1;
  },

  /**
   * Check if Mr. White count can be increased
   */
  canIncreaseMrWhite: (totalPlayers: number, undercover: number, mrWhite: number): boolean => {
    return mrWhite < 1 && (undercover + mrWhite) < totalPlayers - 1;
  },

  /**
   * Check if Mr. White count can be decreased
   */
  canDecreaseMrWhite: (mrWhite: number): boolean => {
    return mrWhite > 0;
  },

  /**
   * Check if start button should be enabled
   */
  isStartButtonEnabled: (totalPlayers: number, undercover: number, mrWhite: number, availableWords: number): boolean => {
    const civilians = ConfigHelpers.getCiviliansCount(totalPlayers, undercover, mrWhite);
    return totalPlayers >= 3 && civilians >= 1 && undercover >= 1 && availableWords > 0;
  }
};

/**
 * Phase transition helpers
 */
export const PhaseHelpers = {
  /**
   * Determine next phase after card selection
   */
  getNextPhaseAfterCardSelection: (currentPlayerIndex: number, totalPlayers: number): 'card-selection' | 'description' => {
    return currentPlayerIndex >= totalPlayers - 1 ? 'description' : 'card-selection';
  },

  /**
   * Check if all players have selected cards
   */
  allPlayersSelected: (players: Player[]): boolean => {
    return players.every(player => player.cardIndex !== undefined);
  },

  /**
   * Get count of players who have selected cards
   */
  getSelectedPlayersCount: (players: Player[]): number => {
    return players.filter(player => player.cardIndex !== undefined).length;
  },

  /**
   * Get next player index
   */
  getNextPlayerIndex: (currentIndex: number, totalPlayers: number): number => {
    return (currentIndex + 1) % totalPlayers;
  }
};

/**
 * Game state validation helpers
 */
export const ValidationHelpers = {
  /**
   * Validate game state for phase transitions
   */
  validatePhaseTransition: (gameState: GameState, targetPhase: GameState['phase']): boolean => {
    switch (targetPhase) {
      case 'card-selection':
        return gameState.phase === 'setup';
      case 'description':
        return gameState.phase === 'card-selection' && PhaseHelpers.allPlayersSelected(gameState.players);
      case 'voting':
        return gameState.phase === 'description';
      case 'mr-white-guess':
        return gameState.phase === 'voting' && gameState.eliminatedPlayer?.role === 'mrwhite';
      case 'game-over':
        return ['voting', 'mr-white-guess'].includes(gameState.phase);
      default:
        return false;
    }
  },

  /**
   * Validate player configuration
   */
  validatePlayerConfig: (totalPlayers: number, undercover: number, mrWhite: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (totalPlayers < 3) {
      errors.push('Minimum 3 players required');
    }
    
    if (undercover < 1) {
      errors.push('At least 1 undercover required');
    }
    
    if (undercover > Math.floor(totalPlayers / 3)) {
      errors.push('Too many undercover players');
    }
    
    if (mrWhite > 1) {
      errors.push('Maximum 1 Mr. White allowed');
    }
    
    const civilians = ConfigHelpers.getCiviliansCount(totalPlayers, undercover, mrWhite);
    if (civilians < 1) {
      errors.push('At least 1 civilian required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

/**
 * Export all helpers as a single object for convenience
 */
export const GameHelpers = {
  Player: PlayerHelpers,
  Config: ConfigHelpers,
  Phase: PhaseHelpers,
  Validation: ValidationHelpers
};

export default GameHelpers;