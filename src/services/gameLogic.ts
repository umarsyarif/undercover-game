import type { Player, PlayerRole, GameState } from '../types/gameTypes';

export class GameLogic {
  // Store the random start player for consistent ordering across phases
  private static startPlayerId: number | null = null;
  private static isForward: boolean = true;

  // Reset the random start player (call this when starting a new game)
  static resetRandomStart(): void {
    this.startPlayerId = null;
    this.isForward = true;
  }

  // Generate player order for the game
  static generatePlayerOrder(totalPlayers: number): number[] {
    const order = Array.from({ length: totalPlayers }, (_, i) => i + 1);
    
    // Fisher-Yates shuffle algorithm
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    
    return order;
  }

  // Generate players with roles and words
  static generatePlayers(
    totalPlayers: number,
    undercover: number,
    mrWhite: number,
    gameWords: { civilian: string; undercover: string }
  ): Player[] {
    const players: Player[] = [];
    const roles: PlayerRole[] = [];

    // Create role array
    for (let i = 0; i < undercover; i++) {
      roles.push('undercover');
    }
    for (let i = 0; i < mrWhite; i++) {
      roles.push('mrwhite');
    }
    const civilians = totalPlayers - undercover - mrWhite;
    for (let i = 0; i < civilians; i++) {
      roles.push('civilian');
    }

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Create players
    for (let i = 0; i < totalPlayers; i++) {
      const role = roles[i];
      const word = role === 'civilian' ? gameWords.civilian :
                   role === 'undercover' ? gameWords.undercover : '';

      players.push({
        id: i + 1,
        name: '',
        role,
        word,
        cardIndex: -1,
        hasRevealed: false,
        isEliminated: false
      });
    }

    return players;
  }

  // Check win conditions
  static checkWinConditions(players: Player[]): 'civilian' | 'undercover' | 'mrwhite' | null {
    const activePlayers = players.filter(p => !p.isEliminated);
    const activeCivilians = activePlayers.filter(p => p.role === 'civilian');
    const activeUndercover = activePlayers.filter(p => p.role === 'undercover');
    const activeMrWhite = activePlayers.filter(p => p.role === 'mrwhite');

    // If Mr. White is the last player standing, they win
    if (activePlayers.length === 1 && activeMrWhite.length === 1) {
      return 'mrwhite';
    }

    // If Mr. White is eliminated and didn't guess correctly, check other conditions
    const mrWhiteEliminated = players.some(p => p.role === 'mrwhite' && p.isEliminated);
    
    // If all undercover agents are eliminated
    if (activeUndercover.length === 0) {
      // If Mr. White is still alive, they haven't won yet
      if (activeMrWhite.length > 0) {
        return null; // Game continues, Mr. White needs to guess
      }
      return 'civilian';
    }

    // If undercover agents equal or outnumber civilians (and Mr. White is eliminated or doesn't exist)
    if (activeUndercover.length >= activeCivilians.length && activeMrWhite.length === 0) {
      return 'undercover';
    }

    // Game continues
    return null;
  }

  // Get current player
  static getCurrentPlayer(gameState: GameState): Player | null {
    if (gameState.currentPlayerIndex >= 0 && gameState.currentPlayerIndex < gameState.players.length) {
      return gameState.players[gameState.currentPlayerIndex];
    }
    return null;
  }

  // Get player by card index
  static getPlayerByCardIndex(players: Player[], cardIndex: number): Player | null {
    return players.find(p => p.cardIndex === cardIndex) || null;
  }

  // Check if card is available
  static isCardAvailable(players: Player[], cardIndex: number): boolean {
    return !players.some(p => p.cardIndex === cardIndex);
  }

  // Get ordered players for display
  static getOrderedPlayers(players: Player[]): Player[] {
    return [...players].sort((a, b) => {
      if (a.cardIndex === -1 && b.cardIndex === -1) return a.id - b.id;
      if (a.cardIndex === -1) return 1;
      if (b.cardIndex === -1) return -1;
      return a.cardIndex - b.cardIndex;
    });
  }

  // Get ordered players for description phase with randomized start
  static getDescriptionPhaseOrder(players: Player[]): Player[] {
    if (!players || players.length === 0) return [];
    
    // If we haven't set a random start player yet, do it now
    if (this.startPlayerId === null) {
      // Get all non-Mr. White players
      const nonMrWhitePlayers = players.filter(p => p.role !== 'mrwhite');
      
      // If there are no non-Mr. White players, use any player
      if (nonMrWhitePlayers.length === 0) {
        this.startPlayerId = players[Math.floor(Math.random() * players.length)].id;
      } else {
        // Pick a random non-Mr. White player as the starting point
        this.startPlayerId = nonMrWhitePlayers[Math.floor(Math.random() * nonMrWhitePlayers.length)].id;
      }
      
      // Randomly decide if we're going forward or backward
      this.isForward = Math.random() < 0.5;
    }
    
    // Sort players by ID first
    const sortedPlayers = [...players].sort((a, b) => a.id - b.id);
    
    // Find the index of the start player
    const startIndex = sortedPlayers.findIndex(p => p.id === this.startPlayerId);
    if (startIndex === -1) return sortedPlayers; // Fallback if start player not found
    
    // Reorder the players starting from the random player
    const result = [];
    
    if (this.isForward) {
      // Forward order (e.g., 3,4,5,1,2 if starting with player 3)
      for (let i = 0; i < sortedPlayers.length; i++) {
        const index = (startIndex + i) % sortedPlayers.length;
        result.push(sortedPlayers[index]);
      }
    } else {
      // Reverse order (e.g., 3,2,1,5,4 if starting with player 3)
      for (let i = 0; i < sortedPlayers.length; i++) {
        let index = startIndex - i;
        if (index < 0) index = sortedPlayers.length + index;
        result.push(sortedPlayers[index]);
      }
    }
    
    // Check if Mr. White is first and handle it if needed
    if (result.length > 0 && result[0].role === 'mrwhite') {
      // Find a non-Mr. White player to swap with
      const nonMrWhiteIndex = result.findIndex(p => p.role !== 'mrwhite');
      
      // If there's a non-Mr. White player, swap them to the first position
      if (nonMrWhiteIndex > 0) {
        [result[0], result[nonMrWhiteIndex]] = [result[nonMrWhiteIndex], result[0]];
      }
    }
    
    return result;
  }

  // Get ordered players for voting phase (same order as description, but eliminated players at the end)
  static getVotingPhaseOrder(players: Player[]): Player[] {
    if (!players || players.length === 0) return [];
    
    // Get the description phase order first
    const descriptionOrder = this.getDescriptionPhaseOrder(players);
    
    // Split into active and eliminated players while maintaining the description order
    const activePlayers = descriptionOrder.filter(p => !p.isEliminated);
    const eliminatedPlayers = descriptionOrder.filter(p => p.isEliminated);
    
    // Return active players first, then eliminated players
    return [...activePlayers, ...eliminatedPlayers];
  }

  // Get active (non-eliminated) players
  static getActivePlayers(players: Player[]): Player[] {
    return players.filter(p => !p.isEliminated);
  }

  // Get remaining role counts
  static getRemainingCounts(players: Player[]): {
    civilians: number;
    undercover: number;
    mrWhite: number;
  } {
    const activePlayers = this.getActivePlayers(players);
    
    return {
      civilians: activePlayers.filter(p => p.role === 'civilian').length,
      undercover: activePlayers.filter(p => p.role === 'undercover').length,
      mrWhite: activePlayers.filter(p => p.role === 'mrwhite').length
    };
  }

  // Validate game configuration
  static validateGameConfig(totalPlayers: number, undercover: number, mrWhite: number): {
    isValid: boolean;
    reason?: string;
  } {
    const civilians = totalPlayers - undercover - mrWhite;
    
    if (totalPlayers < 3) {
      return { isValid: false, reason: 'At least 3 players are required' };
    }
    
    if (civilians < 2) {
      return { isValid: false, reason: 'At least 2 civilians are required' };
    }
    
    if (undercover + mrWhite === 0) {
      return { isValid: false, reason: 'At least one undercover agent or Mr. White is required' };
    }
    
    if (civilians <= undercover + mrWhite) {
      return { isValid: false, reason: 'Civilians must outnumber undercover agents and Mr. White combined' };
    }
    
    return { isValid: true };
  }

  // Get game status summary
  static getGameStatus(gameState: GameState): {
    phase: string;
    round: number;
    currentPlayer: string;
    remainingCounts: ReturnType<typeof GameLogic.getRemainingCounts>;
  } {
    const currentPlayer = this.getCurrentPlayer(gameState);
    const remainingCounts = this.getRemainingCounts(gameState.players);
    
    return {
      phase: gameState.phase,
      round: gameState.round,
      currentPlayer: currentPlayer?.name || 'Unknown',
      remainingCounts
    };
  }
}