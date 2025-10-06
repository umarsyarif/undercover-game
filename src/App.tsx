import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Skull } from 'lucide-react';
import { WordManagementModal } from './components/WordManagementModal';
import { PlayerSetup } from './components/PlayerSetup';
import { CardSelectionPhase } from './components/CardSelectionPhase';
import { DescriptionPhase } from './components/DescriptionPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameOverPhase } from './components/GameOverPhase';
import { useGameState } from './hooks/useGameState';
import { useModalManager } from './hooks/useModalManager';
import { usePlayerManagement } from './hooks/usePlayerManagement';
import { useWordManagement } from './hooks/useWordManagement';
import { useGamePhases } from './hooks/useGamePhases';
import { GameLogic } from './services/gameLogic';
import type { Player } from './types/gameTypes';

function App() {
  // Initialize custom hooks
  const { gameState, updateGameState, initializeGame, resetGame, checkWinConditions, getRandomWordPair } = useGameState();
  const { modals, openModal, closeModal, closeAllModals } = useModalManager();
  const playerManagement = usePlayerManagement();
  const wordManagement = useWordManagement();
  
  // Initialize game phases hook with dependencies
  const gamePhases = useGamePhases(
    gameState,
    updateGameState,
    checkWinConditions,
    openModal,
    closeModal
  );

  // Helper functions that use GameLogic service
  const getCurrentPlayer = () => GameLogic.getCurrentPlayer(gameState);
  const getPlayerByCardIndex = (cardIndex: number): Player | undefined => {
    const player = GameLogic.getPlayerByCardIndex(gameState.players, cardIndex);
    return player || undefined;
  };
  const isCardAvailable = (cardIndex: number) => GameLogic.isCardAvailable(gameState.players, cardIndex);
  const getOrderedPlayers = () => GameLogic.getOrderedPlayers(gameState.players);
  const getDescriptionPhaseOrder = () => GameLogic.getDescriptionPhaseOrder(gameState.players);
  const getVotingPhaseOrder = () => GameLogic.getVotingPhaseOrder(gameState.players);
  const getActivePlayers = () => GameLogic.getActivePlayers(gameState.players);
  const getRemainingCounts = () => {
    const counts = GameLogic.getRemainingCounts(gameState.players);
    return {
      undercovers: counts.undercover,
      mrWhites: counts.mrWhite,
      total: counts.civilians + counts.undercover + counts.mrWhite
    };
  };

  // Game initialization handler
  const handleStart = () => {
    if (playerManagement.isStartButtonEnabled()) {
      const config = playerManagement.getPlayerConfig();
      const result = initializeGame(config);
      if (!result.success) {
        openModal('showWordManagementModal');
      }
    }
  };

  // Word refresh handler
  const handleRefreshWords = () => {
    wordManagement.handleRefreshWords(
      gameState,
      updateGameState,
      () => openModal('showWordManagementModal')
    );
  };

  // Words updated handler
  const handleWordsUpdated = () => {
    const config = playerManagement.getPlayerConfig();
    return wordManagement.handleWordsUpdated(initializeGame, config);
  };

  // Name submission handler
  const handleNameSubmit = () => {
    gamePhases.handleNameSubmit(playerManagement.playerName);
    playerManagement.resetPlayerName();
  };

  // Get current player for display
  const currentPlayer = getCurrentPlayer();

  // Handler functions using game phases hook
  const handleWordRevealNext = () => {
    gamePhases.handleWordRevealNext(playerManagement.totalPlayers);
  };

  // Back to setup handler
  const handleBackToSetup = () => {
    resetGame();
    closeModal('showGameOverModal');
  };
  
  // Continue with same players handler
  const handleContinueWithSamePlayers = () => {
    // Reset the random start player
    GameLogic.resetRandomStart();
    
    // Get a new word pair
    const newWordPair = getRandomWordPair();
    
    if (!newWordPair) {
      // If no words are available, show word management modal
      openModal('showWordManagementModal');
      return;
    }
    
    // Re-generate players with new roles but keep names
    const newPlayers = GameLogic.generatePlayers(
      gameState.players.length,
      gameState.undercoverCount,
      gameState.mrWhiteCount,
      newWordPair
    );

    // Reset player state but keep names
    const resetPlayers = gameState.players.map((player, index) => {
      const newPlayer = newPlayers.find(p => p.id === player.id) || newPlayers[index];
      return {
        ...newPlayer,
        id: player.id, // Keep original ID
        name: player.name, // Keep original name
      };
    });
    
    // Reset game state but keep players
    updateGameState({
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
    
    closeModal('showGameOverModal');
    
    // Show turn modal for the first player after a short delay
    setTimeout(() => {
      openModal('showTurnModal');
    }, 300);
  };

  // Render different screens based on game phase
  if (gameState.phase === 'setup') {
    return (
      <>
        <PlayerSetup
          totalPlayers={playerManagement.totalPlayers}
          civilians={playerManagement.civilians}
          undercover={playerManagement.undercover}
          mrWhite={playerManagement.mrWhite}
          onTotalPlayersChange={playerManagement.handleTotalPlayersChange}
          onUndercoverChange={playerManagement.handleUndercoverChange}
          onMrWhiteChange={playerManagement.handleMrWhiteChange}
          canIncreaseUndercover={playerManagement.canIncreaseUndercover}
          canDecreaseUndercover={playerManagement.canDecreaseUndercover}
          canIncreaseMrWhite={playerManagement.canIncreaseMrWhite}
          canDecreaseMrWhite={playerManagement.canDecreaseMrWhite}
          isStartButtonEnabled={playerManagement.isStartButtonEnabled}
          onStart={handleStart}
          availableWords={wordManagement.getAvailableWordCount()}
        />
        
        <WordManagementModal
          isOpen={modals.showWordManagementModal}
          onClose={() => closeModal('showWordManagementModal')}
          onWordsUpdated={handleWordsUpdated}
        />
      </>
    );
  }

  if (gameState.phase === 'card-selection') {
    return (
      <>
        <CardSelectionPhase
          gameState={gameState}
          totalPlayers={playerManagement.totalPlayers}
          isRefreshing={wordManagement.isRefreshing}
          onBack={handleBackToSetup}
          onCardSelect={gamePhases.handleCardSelect}
          onRefreshWords={handleRefreshWords}
          getPlayerByCardIndex={getPlayerByCardIndex}
          isCardAvailable={isCardAvailable}
          getRemainingCounts={getRemainingCounts}
        />

        {/* Turn Modal for non-first rounds */}
        <Dialog open={modals.showTurnModal} onOpenChange={() => closeModal('showTurnModal')}>
          <DialogContent 
            className="max-w-sm mx-auto [&>button]:hidden" 
            onPointerDownOutside={e => e.preventDefault()}
            onEscapeKeyDown={e => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-center text-lg">
                Giliran {currentPlayer?.name || `Player ${gameState.currentPlayerIndex + 1}`}
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-gray-600 mb-6">Silakan pilih kartu untuk melihat kata Anda</p>
              <Button onClick={gamePhases.handleTurnModalNext} className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 rounded-full">
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Name Input Modal */}
        <Dialog open={modals.showNameModal} onOpenChange={() => closeModal('showNameModal')}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
                <DialogTitle>Masukkan nama</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Masukkan nama"
                value={playerManagement.playerName}
                onChange={(e) => playerManagement.setPlayerName(e.target.value)}
                className="text-center"
                onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
              <p className="text-sm text-blue-600 text-center">
                Masukkan nama untuk membuka kata rahasia
              </p>
              <Button
                onClick={handleNameSubmit}
                disabled={!playerManagement.playerName.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-full"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Word Reveal Modal */}
        <Dialog open={modals.showWordModal} onOpenChange={() => closeModal('showWordModal')}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="sr-only">
                Word Reveal for {currentPlayer?.name || `Player ${gameState.currentPlayerIndex + 1}`}
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-6">
              <div className="text-6xl mb-4">
                {currentPlayer?.role === 'mrwhite' ? '❓' : '📝'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {currentPlayer?.name || `Player ${gameState.currentPlayerIndex + 1}`}
              </h3>
              <div className="bg-gray-100 p-6 rounded-lg mb-6">
                <p className="text-xl font-semibold">
                  {currentPlayer?.role === 'mrwhite' 
                    ? "You're Mr. White" 
                    : currentPlayer?.word}
                </p>
              </div>
              <Button
                onClick={handleWordRevealNext}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <WordManagementModal
          isOpen={modals.showWordManagementModal}
          onClose={() => closeModal('showWordManagementModal')}
          onWordsUpdated={handleWordsUpdated}
        />
      </>
    );
  }

  if (gameState.phase === 'description') {
    const orderedPlayers = getDescriptionPhaseOrder().filter(p => !p.isEliminated);
    
    return (
      <DescriptionPhase
        orderedPlayers={orderedPlayers}
        round={gameState.round}
        onBack={handleBackToSetup}
        onGoToVoting={gamePhases.handleGoToVoting}
        getRemainingCounts={getRemainingCounts}
      />
    );
  }

  if (gameState.phase === 'voting') {
    // Use the voting phase order which maintains description phase order but puts eliminated players at the end
    const sortedPlayers = getVotingPhaseOrder();
    
    return (
      <>
        <VotingPhase
          sortedPlayers={sortedPlayers}
          selectedPlayerToEliminate={gameState.selectedPlayerToEliminate}
          onBack={() => updateGameState({ phase: 'description' })}
          onPlayerSelect={gamePhases.handlePlayerSelect}
          onEliminatePlayer={gamePhases.handleEliminatePlayer}
          getRemainingCounts={getRemainingCounts}
        />

        {/* Elimination Confirmation Modal */}
        <Dialog open={modals.showEliminationModal} onOpenChange={() => closeModal('showEliminationModal')}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-lg text-red-600">
                Player Dieliminasi
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              {gameState.eliminatedPlayer && (
                <>
                  <div className="w-20 h-20 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Skull className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {gameState.eliminatedPlayer.name || `Player ${gameState.eliminatedPlayer.id}`}
                  </h3>
                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <p className="text-lg font-semibold">
                      Role: <span className="capitalize">{gameState.eliminatedPlayer.role}</span>
                    </p>
                  </div>
                  <Button
                    onClick={gamePhases.handleEliminationConfirm}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded-full"
                  >
                    Lanjutkan
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (gameState.phase === 'mr-white-guess') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 w-screen">
          {/* Header */}
          <div className="bg-purple-600 text-white p-4 text-center">
            <h2 className="text-xl font-bold">Mr. White's Last Chance</h2>
            <p className="text-purple-100 text-sm">
              Mr. White dapat menebak kata civilian untuk menang!
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center p-6">
            <Card className="max-w-md w-full p-8 text-center">
              <div className="text-6xl mb-4">❓</div>
              <h3 className="text-2xl font-bold mb-4">
                {gameState.eliminatedPlayer?.name || 'Mr. White'}
              </h3>
              <p className="text-gray-600 mb-6">
                Tebak kata yang dimiliki civilian untuk memenangkan permainan!
              </p>
              
              <div className="space-y-4">
                <Input
                  placeholder="Masukkan tebakan kata civilian"
                  value={gameState.mrWhiteGuess}
                  onChange={(e) => updateGameState({ mrWhiteGuess: e.target.value })}
                  className="text-center text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && gameState.mrWhiteGuess.trim() && gamePhases.handleMrWhiteGuess()}
                />
                <Button
                  onClick={() => {
                    console.log('Button clicked!');
                    console.log('Button disabled:', !gameState.mrWhiteGuess.trim());
                    console.log('Current input value:', gameState.mrWhiteGuess);
                    gamePhases.handleMrWhiteGuess();
                  }}
                  disabled={!gameState.mrWhiteGuess.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-full text-lg"
                >
                  Tebak!
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Mr. White Guess Modal */}
        <Dialog open={modals.showMrWhiteGuessModal} onOpenChange={() => closeModal('showMrWhiteGuessModal')}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-lg">
                Mr. White's Guess
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="text-6xl mb-4">❓</div>
              <p className="text-gray-600 mb-6">
                Mr. White menebak kata civilian...
              </p>
              <Button
                onClick={gamePhases.handleMrWhiteGuess}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-full"
              >
                Reveal Result
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (gameState.phase === 'game-over') {
    const activePlayers = getActivePlayers();
    const winnerPlayers = activePlayers.filter(p => 
      gameState.winner === 'civilian' ? p.role === 'civilian' :
      gameState.winner === 'undercover' ? p.role === 'undercover' :
      gameState.winner === 'mrwhite' ? p.role === 'mrwhite' : false
    );

    return (
      <>
        <GameOverPhase
          gameState={gameState}
          winnerPlayers={winnerPlayers}
          onBackToSetup={handleBackToSetup}
          onContinueWithSamePlayers={handleContinueWithSamePlayers}
        />

        {/* Game Over Modal */}
        <Dialog open={modals.showGameOverModal} onOpenChange={() => closeModal('showGameOverModal')}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-lg">
                Game Over
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-600 mb-6">
                Game has ended!
              </p>
              <Button
                onClick={() => closeModal('showGameOverModal')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded-full"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}

export default App;