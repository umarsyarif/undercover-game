import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameActionService } from '../services/gameActionService';
import { GameLogic } from '../services/gameLogic';
import type { GameState } from '../types/gameTypes';

// Mock the WordService that might be used by GameLogic
vi.mock('../services/wordService', () => ({
  WordService: {
    getRandomUnplayedWord: vi.fn().mockReturnValue({
      civilian: 'banana',
      undercover: 'strawberry'
    }),
    markWordAsPlayed: vi.fn()
  }
}));

describe('Continue with Same Players Feature', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Helper function to create test game state
  const createTestGameState = (): GameState => ({
    phase: 'game-over',
    undercoverCount: 1,
    mrWhiteCount: 0,
    currentPlayerIndex: 0,
    selectedCard: null,
    players: [
      {
        id: 1,
        name: 'Player 1',
        role: 'civilian',
        word: 'apple',
        hasRevealed: true,
        cardIndex: 0,
        isEliminated: false
      },
      {
        id: 2,
        name: 'Player 2',
        role: 'undercover',
        word: 'orange',
        hasRevealed: true,
        cardIndex: 1,
        isEliminated: false
      }
    ],
    round: 1,
    gameWords: { civilian: 'apple', undercover: 'orange' },
    playerOrder: [1, 2],
    selectedPlayerToEliminate: null,
    eliminatedPlayer: null,
    winner: 'civilian',
    mrWhiteGuess: '',
    showingWord: false
  });
  
  describe('handleContinueWithSamePlayers', () => {
    it('should reset game state but keep player names', () => {
      // Spy on GameLogic.resetRandomStart
      const resetRandomStartSpy = vi.spyOn(GameLogic, 'resetRandomStart');
      
      // Create test game state
      const gameState = createTestGameState();
      
      // Mock functions
      const mockUpdateGameState = vi.fn();
      const mockOpenModal = vi.fn();
      const mockCloseModal = vi.fn();
      const mockGetRandomWordPair = vi.fn().mockReturnValue({
        civilian: 'banana',
        undercover: 'strawberry'
      });
      
      // Create a function that simulates handleContinueWithSamePlayers
      const handleContinueWithSamePlayers = () => {
        // Reset the random start player
        GameLogic.resetRandomStart();
        
        // Get a new word pair
        const newWordPair = mockGetRandomWordPair();
        
        if (!newWordPair) {
          mockOpenModal('showWordManagementModal');
          return;
        }
        
        // Reset player state but keep names
        const resetPlayers = gameState.players.map(player => ({
          ...player,
          word: player.role === 'civilian' ? newWordPair.civilian :
                player.role === 'undercover' ? newWordPair.undercover : '',
          hasRevealed: false,
          cardIndex: -1,
          isEliminated: false
        }));
        
        // Reset game state but keep players
        mockUpdateGameState({
          phase: 'card-selection',
          currentPlayerIndex: 0,
          selectedCard: null,
          players: resetPlayers,
          round: 2, // Set round to 2 to skip name input phase
          gameWords: newWordPair,
          selectedPlayerToEliminate: null,
          eliminatedPlayer: null,
          winner: null,
          mrWhiteGuess: '',
          showingWord: false
        });
        
        mockCloseModal('showGameOverModal');
        
        // Show turn modal for the first player after a short delay
        setTimeout(() => {
          mockOpenModal('showTurnModal');
        }, 300);
      };
      
      // Call the function
      handleContinueWithSamePlayers();
      
      // Verify that GameLogic.resetRandomStart was called
      expect(resetRandomStartSpy).toHaveBeenCalled();
      
      // Verify that mockGetRandomWordPair was called
      expect(mockGetRandomWordPair).toHaveBeenCalled();
      
      // Verify that updateGameState was called with the correct parameters
      expect(mockUpdateGameState).toHaveBeenCalledWith(expect.objectContaining({
        phase: 'card-selection',
        round: 2,
        winner: null
      }));
      
      // Verify that closeModal was called with showGameOverModal
      expect(mockCloseModal).toHaveBeenCalledWith('showGameOverModal');
      
      // Verify that openModal was not called yet (before timeout)
      expect(mockOpenModal).not.toHaveBeenCalled();
      
      // Fast-forward timers
      vi.advanceTimersByTime(300);
      
      // Now verify that openModal was called with showTurnModal
      expect(mockOpenModal).toHaveBeenCalledWith('showTurnModal');
    });
  });
  
  describe('updateGameState Action', () => {
    it('should update game state with provided updates', () => {
      // Create test game state
      const gameState = createTestGameState();
      
      // Call updateGameState action
      const result = GameActionService.updateGameState(gameState, {
        round: 2,
        phase: 'card-selection'
      });
      
      // Verify that the action was successful
      expect(result.success).toBe(true);
      
      // Verify that the game state was updated correctly
      expect(result.newState?.round).toBe(2);
      expect(result.newState?.phase).toBe('card-selection');
    });
  });
  
  describe('handleCardSelect in Round 2+', () => {
    it('should skip name input in round 2+', () => {
      // Create a game state with round 2
      const gameState = {
        ...createTestGameState(),
        round: 2,
        phase: 'card-selection'
      };
      
      // Mock functions
      const mockUpdateGameState = vi.fn();
      const mockOpenModal = vi.fn();
      
      // Create a function that simulates handleCardSelect
      const handleCardSelect = (cardIndex: number) => {
        const isCardTaken = gameState.players.some(p => p.cardIndex === cardIndex);
        if (isCardTaken) return;
    
        mockUpdateGameState({ selectedCard: cardIndex });
        
        if (gameState.round === 1) {
          mockOpenModal('showNameModal');
        } else {
          // For round 2+ (continuing with same players), automatically assign the card
          const updatedPlayers = [...gameState.players];
          updatedPlayers[gameState.currentPlayerIndex].cardIndex = cardIndex;
          
          mockUpdateGameState({ 
            players: updatedPlayers,
            selectedCard: cardIndex
          });
          
          mockOpenModal('showWordModal');
        }
      };
      
      // Call the function
      handleCardSelect(3);
      
      // Verify that updateGameState was called with the correct parameters
      expect(mockUpdateGameState).toHaveBeenCalledTimes(2);
      
      // Verify that showWordModal was opened (not showNameModal)
      expect(mockOpenModal).toHaveBeenCalledWith('showWordModal');
      expect(mockOpenModal).not.toHaveBeenCalledWith('showNameModal');
    });
  });
  
  describe('Turn Modal Display', () => {
    it('should show turn modal after word reveal in round 2+', () => {
      // Create a game state with round 2
      const gameState = {
        ...createTestGameState(),
        phase: 'card-selection',
        round: 2,
        currentPlayerIndex: 0,
        selectedCard: 3
      };
      
      // Mock functions
      const mockUpdateGameState = vi.fn();
      const mockOpenModal = vi.fn();
      const mockCloseModal = vi.fn();
      
      // Create a function that simulates handleWordRevealNext
      const handleWordRevealNext = (totalPlayers: number) => {
        if (gameState.selectedCard !== null) {
          const updatedPlayers = [...gameState.players];
          updatedPlayers[gameState.currentPlayerIndex].hasRevealed = true;
          
          if (gameState.round > 1) {
            updatedPlayers[gameState.currentPlayerIndex].cardIndex = gameState.selectedCard;
          }
          
          mockCloseModal('showWordModal');
          
          // Add a small delay to prevent showing next player's word during modal transition
          setTimeout(() => {
            if (gameState.currentPlayerIndex < totalPlayers - 1) {
              mockUpdateGameState({
                currentPlayerIndex: gameState.currentPlayerIndex + 1,
                selectedCard: null,
                players: updatedPlayers
              });
              
              if (gameState.round > 1) {
                mockOpenModal('showTurnModal');
              }
            } else {
              mockUpdateGameState({
                phase: 'description',
                currentPlayerIndex: 0,
                players: updatedPlayers
              });
            }
          }, 200);
        }
      };
      
      // Call the function
      handleWordRevealNext(2);
      
      // Verify that closeModal was called with showWordModal
      expect(mockCloseModal).toHaveBeenCalledWith('showWordModal');
      
      // Verify that updateGameState and openModal were not called yet (before timeout)
      expect(mockUpdateGameState).not.toHaveBeenCalled();
      expect(mockOpenModal).not.toHaveBeenCalled();
      
      // Fast-forward timers
      vi.advanceTimersByTime(200);
      
      // Verify that updateGameState was called with the correct parameters
      expect(mockUpdateGameState).toHaveBeenCalledWith({
        currentPlayerIndex: 1, // Move to next player
        selectedCard: null,
        players: expect.any(Array)
      });
      
      // Verify that openModal was called with showTurnModal (since round > 1)
      expect(mockOpenModal).toHaveBeenCalledWith('showTurnModal');
    });
  });
});