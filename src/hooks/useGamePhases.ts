import { useCallback } from 'react';
import type { GameState } from '../types/gameTypes';

type ModalName = 'showNameModal' | 'showWordModal' | 'showTurnModal' | 'showEliminationModal' | 'showMrWhiteGuessModal' | 'showGameOverModal' | 'showWordManagementModal';

export const useGamePhases = (
  gameState: GameState,
  updateGameState: (updates: Partial<GameState>) => void,
  checkWinConditions: () => 'civilian' | 'undercover' | 'mrwhite' | null,
  openModal: (modalName: ModalName) => void,
  closeModal: (modalName: ModalName) => void
) => {

  // Handle card selection
  const handleCardSelect = (cardIndex: number) => {
    const isCardTaken = gameState.players.some(p => p.cardIndex === cardIndex);
    if (isCardTaken) return;

    updateGameState({ selectedCard: cardIndex });
    
    if (gameState.round === 1) {
      openModal('showNameModal');
    } else {
      openModal('showWordModal');
    }
  };

  // Handle name submission
  const handleNameSubmit = (playerName: string) => {
    if (playerName.trim() && gameState.selectedCard !== null) {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].name = playerName.trim();
      updatedPlayers[gameState.currentPlayerIndex].cardIndex = gameState.selectedCard;
      
      updateGameState({ players: updatedPlayers });
      
      closeModal('showNameModal');
      openModal('showWordModal');
    }
  };

  // Handle word reveal next
  const handleWordRevealNext = (totalPlayers: number) => {
    if (gameState.selectedCard !== null) {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].hasRevealed = true;
      
      if (gameState.round > 1) {
        updatedPlayers[gameState.currentPlayerIndex].cardIndex = gameState.selectedCard;
      }
      
      closeModal('showWordModal');
      
      // Add a small delay to prevent showing next player's word during modal transition
      setTimeout(() => {
        if (gameState.currentPlayerIndex < totalPlayers - 1) {
          updateGameState({
            currentPlayerIndex: gameState.currentPlayerIndex + 1,
            selectedCard: null,
            players: updatedPlayers
          });
          
          if (gameState.round > 1) {
            openModal('showTurnModal');
          }
        } else {
          updateGameState({
            phase: 'description',
            currentPlayerIndex: 0,
            players: updatedPlayers
          });
        }
      }, 200); // 200ms delay to ensure modal is fully closed
    }
  };

  // Handle turn modal next
  const handleTurnModalNext = () => {
    closeModal('showTurnModal');
  };

  // Handle go to voting
  const handleGoToVoting = () => {
    updateGameState({
      phase: 'voting',
      selectedPlayerToEliminate: null
    });
  };

  // Handle player selection for elimination
  const handlePlayerSelect = (playerId: number) => {
    updateGameState({ selectedPlayerToEliminate: playerId });
  };

  // Handle player elimination
  const handleEliminatePlayer = () => {
    if (gameState.selectedPlayerToEliminate === null) return;

    const playerToEliminate = gameState.players.find(p => p.id === gameState.selectedPlayerToEliminate);
    if (!playerToEliminate) return;

    const updatedPlayers = gameState.players.map(p => 
      p.id === gameState.selectedPlayerToEliminate 
        ? { ...p, isEliminated: true }
        : p
    );

    updateGameState({
      players: updatedPlayers,
      eliminatedPlayer: playerToEliminate
    });

    openModal('showEliminationModal');
  };

  // Handle elimination confirmation
  const handleEliminationConfirm = () => {
    closeModal('showEliminationModal');

    if (gameState.eliminatedPlayer?.role === 'mrwhite') {
      // Mr. White gets a chance to guess
      updateGameState({ phase: 'mr-white-guess' });
      // Don't open modal - use the main interface instead
    } else {
      // Check win conditions
      const winner = checkWinConditions();
      if (winner) {
        openModal('showGameOverModal');
      }
    }
  };

  // Handle Mr. White guess
  const handleMrWhiteGuess = useCallback(() => {
    console.log('Mr. White guess function called');
    console.log('Current guess:', gameState.mrWhiteGuess);
    console.log('Civilian word:', gameState.gameWords.civilian);
    
    const isCorrect = gameState.mrWhiteGuess.toLowerCase().trim() === gameState.gameWords.civilian.toLowerCase().trim();
    console.log('Is guess correct:', isCorrect);
    
    if (isCorrect) {
      // Mr. White wins
      updateGameState({
        winner: 'mrwhite',
        phase: 'game-over'
      });
      openModal('showGameOverModal');
    } else {
      // Mr. White's guess is wrong, continue the game
      // Clear the guess and continue with the next phase
      updateGameState({
        mrWhiteGuess: '',
        phase: 'voting'
      });
      
      // Check if there are other win conditions
      checkWinConditions();
    }
  }, [gameState.mrWhiteGuess, gameState.gameWords.civilian, updateGameState, openModal, checkWinConditions]);

  // Handle phase transitions
  const goToPhase = (phase: GameState['phase']) => {
    updateGameState({ phase });
  };

  // Handle back to description from voting
  const handleBackToDescription = () => {
    updateGameState({ phase: 'description' });
  };

  // Continue to next round
  const continueToNextRound = () => {
    updateGameState({
      phase: 'description',
      round: gameState.round + 1,
      selectedPlayerToEliminate: null,
      eliminatedPlayer: null
    });
  };

  return {
    handleCardSelect,
    handleNameSubmit,
    handleWordRevealNext,
    handleTurnModalNext,
    handleGoToVoting,
    handlePlayerSelect,
    handleEliminatePlayer,
    handleEliminationConfirm,
    handleMrWhiteGuess,
    goToPhase,
    handleBackToDescription,
    continueToNextRound
  };
};