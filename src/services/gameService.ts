import { GameLogic } from './gameLogic';
import { WordService } from './wordService';
import type { GameState, Player, PlayerRole, WordPair } from '../types/gameTypes';

export interface GameConfig {
  totalPlayers: number;
  undercover: number;
  mrWhite: number;
  civilians: number;
}

export interface GameAction {
  type: string;
  payload?: any;
}

export interface GameTransition {
  from: string;
  to: string;
  condition?: (gameState: GameState) => boolean;
}

export class GameService {
  // Game initialization
  static initializeGame(config: GameConfig): GameState {
    const validation = GameLogic.validateGameConfig(
      config.totalPlayers,
      config.undercover,
      config.mrWhite
    );
    
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    const gameWords = WordService.getRandomUnplayedWord();
    if (!gameWords) {
      throw new Error('No available word pairs');
    }

    const players = GameLogic.generatePlayers(
      config.totalPlayers,
      config.undercover,
      config.mrWhite,
      gameWords
    );

    const playerOrder = GameLogic.generatePlayerOrder(config.totalPlayers);

    return {
      phase: 'card-selection',
      undercoverCount: config.undercover,
      mrWhiteCount: config.mrWhite,
      currentPlayerIndex: 0,
      selectedCard: null,
      players,
      round: 1,
      gameWords,
      playerOrder,
      selectedPlayerToEliminate: null,
      eliminatedPlayer: null,
      winner: null,
      mrWhiteGuess: '',
      showingWord: false
    };
  }

  // Phase transitions
  static getValidTransitions(): GameTransition[] {
    return [
      { from: 'setup', to: 'card-selection' },
      { from: 'card-selection', to: 'description' },
      { from: 'description', to: 'voting' },
      { from: 'voting', to: 'description' },
      { from: 'voting', to: 'game-over' },
      { from: 'description', to: 'game-over' },
      { from: 'game-over', to: 'setup' },
      { from: 'game-over', to: 'card-selection' }
    ];
  }

  static canTransition(from: string, to: string): boolean {
    return this.getValidTransitions().some(
      transition => transition.from === from && transition.to === to
    );
  }

  // Player management
  static assignPlayerToCard(
    gameState: GameState,
    playerIndex: number,
    cardIndex: number,
    playerName?: string
  ): GameState {
    if (!GameLogic.isCardAvailable(gameState.players, cardIndex)) {
      throw new Error('Card is already taken');
    }

    const updatedPlayers = [...gameState.players];
    updatedPlayers[playerIndex].cardIndex = cardIndex;
    
    if (playerName) {
      updatedPlayers[playerIndex].name = playerName.trim();
    }

    return {
      ...gameState,
      players: updatedPlayers,
      selectedCard: cardIndex
    };
  }

  static markPlayerRevealed(
    gameState: GameState,
    playerIndex: number
  ): GameState {
    const updatedPlayers = [...gameState.players];
    updatedPlayers[playerIndex].hasRevealed = true;

    return {
      ...gameState,
      players: updatedPlayers
    };
  }

  static eliminatePlayer(
    gameState: GameState,
    playerId: number
  ): GameState {
    const updatedPlayers = [...gameState.players];
    const playerIndex = updatedPlayers.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    updatedPlayers[playerIndex].isEliminated = true;
    const eliminatedPlayer = updatedPlayers[playerIndex];

    return {
      ...gameState,
      players: updatedPlayers,
      eliminatedPlayer,
      selectedPlayerToEliminate: null
    };
  }

  // Game flow management
  static advanceToNextPlayer(
    gameState: GameState,
    totalPlayers: number
  ): GameState {
    if (gameState.currentPlayerIndex < totalPlayers - 1) {
      return {
        ...gameState,
        currentPlayerIndex: gameState.currentPlayerIndex + 1,
        selectedCard: null
      };
    } else {
      return {
        ...gameState,
        phase: 'description',
        currentPlayerIndex: 0,
        selectedCard: null
      };
    }
  }

  static startNewRound(gameState: GameState): GameState {
    const gameWords = WordService.getRandomUnplayedWord();
    if (!gameWords) {
      throw new Error('No available word pairs for new round');
    }

    // Re-assign roles and words
    const totalPlayers = gameState.players.length;
    const undercoverCount = gameState.players.filter(p => p.role === 'undercover').length;
    const mrWhiteCount = gameState.players.filter(p => p.role === 'mrwhite').length;

    const newPlayers = GameLogic.generatePlayers(
      totalPlayers,
      undercoverCount,
      mrWhiteCount,
      gameWords
    );
    console.log(newPlayers);

    // Preserve player names and other properties
    const updatedPlayers = gameState.players.map((player, index) => ({
      ...newPlayers[index],
      id: player.id,
      name: player.name,
      isEliminated: false,
      hasRevealed: false,
      isReady: true,
      cardIndex: -1
    }));

    return {
      ...gameState,
      phase: 'card-selection',
      round: gameState.round + 1,
      currentPlayerIndex: 0,
      selectedCard: null,
      players: updatedPlayers,
      gameWords,
      selectedPlayerToEliminate: null,
      eliminatedPlayer: null,
      mrWhiteGuess: ''
    };
  }

  // Win condition checking
  static checkAndUpdateWinConditions(gameState: GameState): GameState {
    const winner = GameLogic.checkWinConditions(gameState.players);
    
    if (winner) {
      return {
        ...gameState,
        phase: 'game-over',
        winner
      };
    }

    return gameState;
  }

  // Mr. White guess handling
  static processMrWhiteGuess(
    gameState: GameState,
    guess: string
  ): GameState {
    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedCivilianWord = gameState.gameWords.civilian.toLowerCase().trim();
    
    const isCorrect = normalizedGuess === normalizedCivilianWord;
    
    if (isCorrect) {
      return {
        ...gameState,
        phase: 'game-over',
        winner: 'mrwhite',
        mrWhiteGuess: guess
      };
    } else {
      return {
        ...gameState,
        phase: 'game-over',
        winner: 'civilian',
        mrWhiteGuess: guess
      };
    }
  }

  // Game state validation
  static validateGameState(gameState: GameState): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate phase
    const validPhases = ['setup', 'card-selection', 'description', 'voting', 'game-over'];
    if (!validPhases.includes(gameState.phase)) {
      errors.push(`Invalid phase: ${gameState.phase}`);
    }

    // Validate player count
    if (gameState.players.length === 0) {
      errors.push('No players in game');
    }

    // Validate current player index
    if (gameState.currentPlayerIndex < 0 || gameState.currentPlayerIndex >= gameState.players.length) {
      errors.push('Invalid current player index');
    }

    // Validate round
    if (gameState.round < 1) {
      errors.push('Invalid round number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Game statistics
  static getGameStatistics(gameState: GameState): {
    totalPlayers: number;
    activePlayers: number;
    eliminatedPlayers: number;
    remainingCounts: ReturnType<typeof GameLogic.getRemainingCounts>;
    gameStatus: ReturnType<typeof GameLogic.getGameStatus>;
  } {
    const activePlayers = GameLogic.getActivePlayers(gameState.players);
    const eliminatedPlayers = gameState.players.filter(p => p.isEliminated);
    const remainingCounts = GameLogic.getRemainingCounts(gameState.players);
    const gameStatus = GameLogic.getGameStatus(gameState);

    return {
      totalPlayers: gameState.players.length,
      activePlayers: activePlayers.length,
      eliminatedPlayers: eliminatedPlayers.length,
      remainingCounts,
      gameStatus
    };
  }

  // Reset game
  static resetGame(): GameState {
    return {
      phase: 'setup',
      undercoverCount: 0,
      mrWhiteCount: 0,
      currentPlayerIndex: 0,
      selectedCard: null,
      players: [],
      round: 1,
      gameWords: { civilian: '', undercover: '' },
      playerOrder: [],
      selectedPlayerToEliminate: null,
      eliminatedPlayer: null,
      winner: null,
      mrWhiteGuess: '',
      showingWord: false
    };
  }

  // Utility methods
  static getWinnerPlayers(gameState: GameState): Player[] {
    if (!gameState.winner) return [];

    switch (gameState.winner) {
      case 'civilian':
        return gameState.players.filter(p => p.role === 'civilian');
      case 'undercover':
        return gameState.players.filter(p => p.role === 'undercover');
      case 'mrwhite':
        return gameState.players.filter(p => p.role === 'mrwhite');
      default:
        return [];
    }
  }

  static canPlayerBeEliminated(gameState: GameState, playerId: number): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    return player ? !player.isEliminated : false;
  }

  static getNextPhase(currentPhase: string, gameState: GameState): string {
    switch (currentPhase) {
      case 'setup':
        return 'card-selection';
      case 'card-selection':
        return 'description';
      case 'description':
        return 'voting';
      case 'voting':
        const winner = GameLogic.checkWinConditions(gameState.players);
        return winner ? 'game-over' : 'description';
      case 'game-over':
        return 'setup';
      default:
        return currentPhase;
    }
  }
}