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

    if (gameState.needsNameEntry) {
      updateGameState({ selectedCard: cardIndex });
      openModal('showNameModal');
      return;
    }

    // Names are already known, so claim the card and go straight to the word.
    const updatedPlayers = gameState.players.map((player, index) =>
      index === gameState.currentPlayerIndex ? { ...player, cardIndex } : player
    );

    updateGameState({ players: updatedPlayers, selectedCard: cardIndex });
    openModal('showWordModal');
  };

  // Handle name submission
  const handleNameSubmit = (playerName: string) => {
    if (!playerName.trim() || gameState.selectedCard === null) return;

    const selectedCard = gameState.selectedCard;
    const updatedPlayers = gameState.players.map((player, index) =>
      index === gameState.currentPlayerIndex
        ? { ...player, name: playerName.trim(), cardIndex: selectedCard }
        : player
    );

    updateGameState({ players: updatedPlayers });

    closeModal('showNameModal');
    openModal('showWordModal');
  };

  // Handle word reveal next
  const handleWordRevealNext = (totalPlayers: number) => {
    if (gameState.selectedCard === null) return;

    const selectedCard = gameState.selectedCard;
    const updatedPlayers = gameState.players.map((player, index) =>
      index === gameState.currentPlayerIndex
        ? { ...player, hasRevealed: true, cardIndex: selectedCard }
        : player
    );

    closeModal('showWordModal');

    // Small delay so the next player's word is not visible during the
    // modal close transition.
    setTimeout(() => {
      if (gameState.currentPlayerIndex < totalPlayers - 1) {
        updateGameState({
          currentPlayerIndex: gameState.currentPlayerIndex + 1,
          selectedCard: null,
          players: updatedPlayers
        });

        if (!gameState.needsNameEntry) {
          openModal('showTurnModal');
        }
      } else {
        updateGameState({
          phase: 'description',
          currentPlayerIndex: 0,
          players: updatedPlayers
        });
      }
    }, 200);
  };

  // Handle turn modal next
  const handleTurnModalNext = () => {
    closeModal('showTurnModal');
    // The player will now select a card from the card selection screen
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
      // Mr. White gets one chance to guess the civilian word.
      updateGameState({ phase: 'mr-white-guess' });
      return;
    }

    const winner = checkWinConditions();
    if (winner) {
      openModal('showGameOverModal');
      return;
    }

    // No winner yet: start the next round of descriptions.
    updateGameState({
      phase: 'description',
      round: gameState.round + 1,
      eliminatedPlayer: null,
      selectedPlayerToEliminate: null
    });
  };

  // Handle Mr. White guess
  const handleMrWhiteGuess = useCallback(() => {
    const isCorrect =
      gameState.mrWhiteGuess.toLowerCase().trim() ===
      gameState.gameWords.civilian.toLowerCase().trim();
    if (isCorrect) {
      updateGameState({ winner: 'mrwhite', phase: 'game-over' });
      openModal('showGameOverModal');
      return;
    }

    // Wrong guess. Mr. White is already eliminated, so the remaining players
    // may already satisfy a win condition — check before starting a new round.
    const winner = checkWinConditions();
    if (winner) {
      openModal('showGameOverModal');
      return;
    }

    updateGameState({
      mrWhiteGuess: '',
      phase: 'description',
      round: gameState.round + 1,
      eliminatedPlayer: null,
      selectedPlayerToEliminate: null
    });
  }, [
    gameState.mrWhiteGuess,
    gameState.gameWords.civilian,
    gameState.round,
    updateGameState,
    openModal,
    checkWinConditions
  ]);

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
