import React from 'react';
import { useGameService } from '../hooks/useGameService';
import { GameHelpers } from '../utils/gameHelpers';

// GameUI and GameContainerProps will be defined inline for now
interface GameUIProps {
  gameState: any;
  config: any;
  modals: any;
  playerName: string;
  isRefreshing: boolean;
  computedValues: any;
  serviceQueries: any;
  handlers: any;
}

interface GameContainerProps {}

// Placeholder GameUI component
const GameUI: React.FC<GameUIProps> = (props) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Game Container Active
        </h1>
        <p className="text-gray-600">
          New service-based architecture is running.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Phase: {props.gameState?.phase || 'Unknown'}
        </p>
      </div>
    </div>
  );
};

/**
 * Container component that handles all business logic and state management
 * Separates concerns by keeping UI components pure and focused on presentation
 */
export const GameContainer: React.FC<GameContainerProps> = () => {
  const gameService = useGameService();

  // Business logic handlers
  const handlers = {
    // Game lifecycle
    onStart: async () => {
      if (gameService.isStartButtonEnabled()) {
        const result = await gameService.startNewGame({
          totalPlayers: gameService.config.totalPlayers,
          undercover: gameService.config.undercover,
          mrWhite: gameService.config.mrWhite
        });
        if (!result.success) {
          gameService.openModal('showWordManagementModal');
        }
      }
    },

    onRefreshWords: async () => {
      gameService.setIsRefreshing(true);
      try {
        const result = await gameService.startNewGame({
          totalPlayers: gameService.config.totalPlayers,
          undercover: gameService.config.undercover,
          mrWhite: gameService.config.mrWhite
        });
        if (!result.success) {
          gameService.openModal('showWordManagementModal');
        }
      } finally {
        gameService.setIsRefreshing(false);
      }
    },

    onWordsUpdated: async () => {
      const result = await gameService.startNewGame({
        totalPlayers: gameService.config.totalPlayers,
        undercover: gameService.config.undercover,
        mrWhite: gameService.config.mrWhite
      });
      return result.success;
    },

    onBackToSetup: () => {
      gameService.resetGame();
      gameService.closeModal('showGameOverModal');
    },

    // Player actions
    onNameSubmit: () => {
      if (gameService.playerName.trim()) {
        gameService.submitPlayerName(gameService.playerName.trim());
        gameService.setPlayerName('');
      }
    },

    onCardSelect: (cardIndex: number) => {
      gameService.selectCard(cardIndex);
    },

    onPlayerSelect: (playerId: number) => {
      gameService.selectPlayerForElimination(playerId);
    },

    onEliminatePlayer: () => {
      if (gameService.gameState.selectedPlayerToEliminate !== null) {
        gameService.eliminatePlayer(gameService.gameState.selectedPlayerToEliminate);
      }
    },

    // Phase transitions
    onWordRevealNext: () => {
      gameService.revealWordNext(gameService.config.totalPlayers);
    },

    onGoToVoting: () => {
      gameService.goToVoting();
    },

    onEliminationConfirm: () => {
      gameService.closeModal('showEliminationModal');
      gameService.transitionToPhase('description');
    },

    onMrWhiteGuess: () => {
      if (gameService.gameState.mrWhiteGuess?.trim()) {
        gameService.processMrWhiteGuess(gameService.gameState.mrWhiteGuess.trim());
      }
    },

    // Modal actions
    onTurnModalNext: () => {
      gameService.closeModal('showTurnModal');
    },

    // Configuration changes
    onConfigChange: (updates: Partial<typeof gameService.config>) => {
      gameService.updateConfig(updates);
    },

    // Input changes
    onPlayerNameChange: (name: string) => {
      gameService.setPlayerName(name);
    },

    onMrWhiteGuessChange: (guess: string) => {
      gameService.updateMrWhiteGuess(guess);
    },

    // Phase transitions
    onPhaseTransition: (phase: string) => {
      gameService.transitionToPhase(phase as any);
    }
  };

  // Computed values
  const computedValues = {
    currentPlayer: gameService.getCurrentPlayer(),
    orderedPlayers: gameService.getOrderedPlayers(),
    descriptionPhaseOrder: gameService.getDescriptionPhaseOrder(),
    votingPhaseOrder: gameService.getVotingPhaseOrder(),
    activePlayers: gameService.getActivePlayers(),
    remainingCounts: gameService.getRemainingCounts(),
    availableWordCount: gameService.getAvailableWordCount(),
    
    // Player configuration helpers
    civilians: gameService.config.totalPlayers - gameService.config.undercover - gameService.config.mrWhite,
    
    // Validation helpers
    canIncreaseUndercover: gameService.canIncreaseUndercover(),
    canDecreaseUndercover: gameService.canDecreaseUndercover(),
    canIncreaseMrWhite: gameService.canIncreaseMrWhite(),
    canDecreaseMrWhite: gameService.canDecreaseMrWhite(),
    
    // Game state helpers
    isStartButtonEnabled: gameService.isStartButtonEnabled(),
    
    // Sorted players for voting phase
    sortedPlayersForVoting: gameService.getVotingPhaseOrder(),
    
    // Winner players for game over
    winnerPlayers: (() => {
      const activePlayers = gameService.getActivePlayers();
      return activePlayers.filter(p => 
        gameService.gameState.winner === 'civilian' ? p.role === 'civilian' :
        gameService.gameState.winner === 'undercover' ? p.role === 'undercover' :
        gameService.gameState.winner === 'mrwhite' ? p.role === 'mrwhite' : false
      );
    })()
  };

  return (
    <GameUI
      // State
      gameState={gameService.gameState}
      config={gameService.config}
      modals={gameService.modals}
      playerName={gameService.playerName}
      isRefreshing={gameService.isRefreshing}
      
      // Computed values
      {...computedValues}
      
      // Handlers
      {...handlers}
      
      // Service queries (for components that need direct access)
      getPlayerByCardIndex={gameService.getPlayerByCardIndex}
      isCardAvailable={gameService.isCardAvailable}
      
      // Modal actions
      openModal={gameService.openModal}
      closeModal={gameService.closeModal}
    />
  );
};

export default GameContainer;