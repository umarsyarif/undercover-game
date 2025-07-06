import { GameService, GameConfig } from './gameService';
import { GameLogic } from './gameLogic';
import { WordService } from './wordService';
import type { GameState, Player } from '../types/gameTypes';

export interface GameActionResult {
  success: boolean;
  newState?: GameState;
  error?: string;
  sideEffects?: {
    openModal?: string;
    closeModal?: string;
    delay?: number;
  };
}

export class GameActionService {
  // Card selection actions
  static selectCard(
    gameState: GameState,
    cardIndex: number,
    playerName?: string
  ): GameActionResult {
    try {
      // Validate card availability
      if (!GameLogic.isCardAvailable(gameState.players, cardIndex)) {
        return {
          success: false,
          error: 'Card is already taken'
        };
      }

      // Assign player to card
      const newState = GameService.assignPlayerToCard(
        gameState,
        gameState.currentPlayerIndex,
        cardIndex,
        playerName
      );

      // Determine which modal to open
      const modalToOpen = gameState.round === 1 ? 'showNameModal' : 'showWordModal';

      return {
        success: true,
        newState,
        sideEffects: {
          openModal: modalToOpen
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static submitPlayerName(
    gameState: GameState,
    playerName: string
  ): GameActionResult {
    if (!playerName.trim()) {
      return {
        success: false,
        error: 'Player name cannot be empty'
      };
    }

    if (gameState.selectedCard === null) {
      return {
        success: false,
        error: 'No card selected'
      };
    }

    try {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].name = playerName.trim();
      updatedPlayers[gameState.currentPlayerIndex].cardIndex = gameState.selectedCard;

      const newState = {
        ...gameState,
        players: updatedPlayers
      };

      return {
        success: true,
        newState,
        sideEffects: {
          closeModal: 'showNameModal',
          openModal: 'showWordModal'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static revealWordNext(
    gameState: GameState,
    totalPlayers?: number
  ): GameActionResult {
    if (gameState.selectedCard === null) {
      return {
        success: false,
        error: 'No card selected'
      };
    }

    try {
      // Mark player as revealed
      let newState = GameService.markPlayerRevealed(
        gameState,
        gameState.currentPlayerIndex
      );

      // Update card index for rounds > 1
      if (gameState.round > 1) {
        const updatedPlayers = [...newState.players];
        updatedPlayers[gameState.currentPlayerIndex].cardIndex = gameState.selectedCard;
        newState = { ...newState, players: updatedPlayers };
      }

      const sideEffects: any = {
        closeModal: 'showWordModal',
        delay: 200 // Prevent word glimpse
      };

      // Use the total players from the state if not provided
      const effectiveTotalPlayers = totalPlayers ?? gameState.players.length;

      // Determine next action after delay
      if (gameState.currentPlayerIndex < effectiveTotalPlayers - 1) {
        // Advance to next player
        const advancedState = GameService.advanceToNextPlayer(newState, effectiveTotalPlayers);
        
        if (gameState.round > 1) {
          sideEffects.openModal = 'showTurnModal';
        }

        return {
          success: true,
          newState: advancedState,
          sideEffects
        };
      } else {
        // Move to description phase
        const finalState = {
          ...newState,
          phase: 'description' as const,
          currentPlayerIndex: 0,
          selectedCard: null
        };

        return {
          success: true,
          newState: finalState,
          sideEffects
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Voting phase actions
  static selectPlayerForElimination(
    gameState: GameState,
    playerId: number
  ): GameActionResult {
    if (!GameService.canPlayerBeEliminated(gameState, playerId)) {
      return {
        success: false,
        error: 'Player cannot be eliminated'
      };
    }

    const newState = {
      ...gameState,
      selectedPlayerToEliminate: playerId
    };

    return {
      success: true,
      newState
    };
  }

  static eliminatePlayer(
    gameState: GameState
  ): GameActionResult {
    if (!gameState.selectedPlayerToEliminate) {
      return {
        success: false,
        error: 'No player selected for elimination'
      };
    }

    try {
      // Eliminate the player
      let newState = GameService.eliminatePlayer(
        gameState,
        gameState.selectedPlayerToEliminate
      );

      // Check win conditions
      newState = GameService.checkAndUpdateWinConditions(newState);

      const sideEffects: any = {
        openModal: 'showEliminationModal'
      };

      // Check if Mr. White needs to guess
      const eliminatedPlayer = newState.eliminatedPlayer;
      if (eliminatedPlayer?.role === 'undercover') {
        const activeMrWhite = GameLogic.getActivePlayers(newState.players)
          .find(p => p.role === 'mrwhite');
        
        if (activeMrWhite && !newState.winner) {
          // Mr. White should get a chance to guess
          sideEffects.openModal = 'showMrWhiteGuessModal';
        }
      }

      return {
        success: true,
        newState,
        sideEffects
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static confirmElimination(
    gameState: GameState
  ): GameActionResult {
    try {
      let newState = { ...gameState };

      // Check if game should end or continue
      if (newState.winner) {
        newState.phase = 'game-over';
      } else {
        // Check if Mr. White should guess
        const eliminatedPlayer = newState.eliminatedPlayer;
        const activeMrWhite = GameLogic.getActivePlayers(newState.players)
          .find(p => p.role === 'mrwhite');
        
        if (eliminatedPlayer?.role === 'undercover' && activeMrWhite) {
          // Mr. White gets to guess
          return {
            success: true,
            newState,
            sideEffects: {
              closeModal: 'showEliminationModal',
              openModal: 'showMrWhiteGuessModal'
            }
          };
        } else {
          // Continue to next round or end game
          newState = GameService.checkAndUpdateWinConditions(newState);
          if (!newState.winner) {
            newState.phase = 'description';
          }
        }
      }

      return {
        success: true,
        newState,
        sideEffects: {
          closeModal: 'showEliminationModal'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Mr. White guess actions
  static processMrWhiteGuess(
    gameState: GameState,
    guess: string
  ): GameActionResult {
    if (!guess.trim()) {
      return {
        success: false,
        error: 'Guess cannot be empty'
      };
    }

    try {
      const newState = GameService.processMrWhiteGuess(gameState, guess);

      return {
        success: true,
        newState,
        sideEffects: {
          closeModal: 'showMrWhiteGuessModal',
          openModal: 'showGameOverModal'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Game management actions
  static startNewGame(config?: GameConfig): GameActionResult {
    try {
      if (!config) {
        return {
          success: false,
          error: 'Game configuration is required'
        };
      }
      const newState = GameService.initializeGame(config);
      
      return {
        success: true,
        newState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static startNewRound(gameState: GameState): GameActionResult {
    try {
      const newState = GameService.startNewRound(gameState);
      
      return {
        success: true,
        newState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static resetGame(): GameActionResult {
    const newState = GameService.resetGame();
    
    return {
      success: true,
      newState
    };
  }

  // Phase transition actions
  static transitionToPhase(
    gameState: GameState,
    targetPhase: string
  ): GameActionResult {
    if (!GameService.canTransition(gameState.phase, targetPhase)) {
      return {
        success: false,
        error: `Cannot transition from ${gameState.phase} to ${targetPhase}`
      };
    }

    const newState = {
      ...gameState,
      phase: targetPhase as any
    };

    // Reset relevant state based on phase
    switch (targetPhase) {
      case 'description':
        newState.selectedPlayerToEliminate = null;
        break;
      case 'voting':
        newState.selectedPlayerToEliminate = null;
        break;
      case 'setup':
        return this.resetGame();
    }

    return {
      success: true,
      newState
    };
  }

  // Utility actions
  static refreshWords(gameState: GameState): GameActionResult {
    try {
      const newWords = WordService.getRandomUnplayedWord();
      if (!newWords) {
        return {
          success: false,
          error: 'No available word pairs'
        };
      }

      // Update players with new words
      const updatedPlayers = gameState.players.map(player => {
        if (player.role === 'civilian') {
          return { ...player, word: newWords.civilian };
        } else if (player.role === 'undercover') {
          return { ...player, word: newWords.undercover };
        }
        return player;
      });

      const newState = {
        ...gameState,
        gameWords: newWords,
        players: updatedPlayers
      };

      return {
        success: true,
        newState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Direct state update action
  static updateGameState(
    gameState: GameState,
    updates: Partial<GameState>
  ): GameActionResult {
    try {
      const newState = {
        ...gameState,
        ...updates
      };
      
      return {
        success: true,
        newState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static validateAction(
    gameState: GameState,
    actionType: string
  ): { isValid: boolean; reason?: string } {
    const validation = GameService.validateGameState(gameState);
    if (!validation.isValid) {
      return {
        isValid: false,
        reason: `Invalid game state: ${validation.errors.join(', ')}`
      };
    }

    // Add action-specific validations here
    switch (actionType) {
      case 'selectCard':
        if (gameState.phase !== 'card-selection') {
          return { isValid: false, reason: 'Card selection not allowed in current phase' };
        }
        break;
      case 'eliminatePlayer':
        if (gameState.phase !== 'voting') {
          return { isValid: false, reason: 'Player elimination not allowed in current phase' };
        }
        break;
      // Add more validations as needed
    }

    return { isValid: true };
  }
}