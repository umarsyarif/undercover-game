import type { Player, PlayerRole, GameState } from '../types/gameTypes';

export class GameLogic {
  // Store the random start player for consistent ordering across phases
  private static startPlayerId: number | null = null;
  private static isForward: boolean = true;
  private static shouldRandomizeStart: boolean = false;

  // Reset the random start player (call this when starting a new game)
  static resetRandomStart(): void {
    this.startPlayerId = null;
    this.isForward = true;
    this.shouldRandomizeStart = true;
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

  // Check win conditions. This is the single source of truth — useGameState
  // delegates to it, and the tests exercise the same code the game runs.
  static checkWinConditions(players: Player[]): 'civilian' | 'undercover' | 'mrwhite' | null {
    const active = players.filter(p => !p.isEliminated);
    const civilians = active.filter(p => p.role === 'civilian');
    const undercovers = active.filter(p => p.role === 'undercover');
    const mrWhites = active.filter(p => p.role === 'mrwhite');

    // Mr. White outlasts everyone.
    if (active.length === 1 && mrWhites.length === 1) {
      return 'mrwhite';
    }

    // Every infiltrator is gone.
    if (undercovers.length === 0 && mrWhites.length === 0) {
      return 'civilian';
    }

    // Only one civilian is left, so the infiltrators can no longer be outvoted.
    // Undercover takes the win when present; otherwise it is Mr. White's.
    if (civilians.length === 1) {
      return undercovers.length > 0 ? 'undercover' : 'mrwhite';
    }

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

    // Sort players by ID first
    const sortedPlayers = [...players].sort((a, b) => a.id - b.id);
    
    // If we haven't set a start player yet, use the default ID order unless
    // a new game explicitly requested a randomized start.
    if (this.startPlayerId === null) {
      if (!this.shouldRandomizeStart) {
        this.startPlayerId = sortedPlayers.find(p => p.role !== 'mrwhite')?.id ?? sortedPlayers[0].id;
      } else {
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
    }
    
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
    
    // Mr. White must not speak first. Consumers filter out eliminated players
    // after calling this, so the guarantee has to hold for the first ACTIVE
    // player, not merely for index 0.
    const firstActive = result.findIndex(p => !p.isEliminated);

    if (firstActive !== -1 && result[firstActive].role === 'mrwhite') {
      const replacement = result.findIndex(
        (p, i) => i > firstActive && !p.isEliminated && p.role !== 'mrwhite'
      );

      if (replacement !== -1) {
        [result[firstActive], result[replacement]] =
          [result[replacement], result[firstActive]];
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
