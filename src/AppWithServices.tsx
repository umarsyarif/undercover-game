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
import { useGameService } from './hooks/useGameService';
import type { Player } from './types/gameTypes';

function AppWithServices() {
  const {
    gameState,
    config,
    modals,
    // Actions
    startNewGame,
    selectCard,
    submitPlayerName,
    revealWordNext,
    goToVoting,
    selectPlayerForElimination,
    eliminatePlayer,
    processMrWhiteGuess,
    updateMrWhiteGuess,
    transitionToPhase,
    resetGame,
    // Modal actions
    openModal,
    closeModal,
    // Config actions
    updateConfig,
    // Queries
    getCurrentPlayer,
    getPlayerByCardIndex,
    isCardAvailable,
    getOrderedPlayers,
    getDescriptionPhaseOrder,
    getVotingPhaseOrder,
    getActivePlayers,
    getRemainingCounts,
    getAvailableWordCount,
    isStartButtonEnabled,
    canIncreaseUndercover,
    canDecreaseUndercover,
    canIncreaseMrWhite,
    canDecreaseMrWhite,
    // State
    playerName,
    setPlayerName,
    isRefreshing,
    setIsRefreshing
  } = useGameService();

  // Event handlers
  const handleStart = async () => {
    if (isStartButtonEnabled()) {
      const result = await startNewGame({
        totalPlayers: config.totalPlayers,
        undercover: config.undercover,
        mrWhite: config.mrWhite
      });
      if (!result.success) {
        openModal('showWordManagementModal');
      }
    }
  };

  const handleRefreshWords = async () => {
    setIsRefreshing(true);
    try {
      const result = await startNewGame({
        totalPlayers: config.totalPlayers,
        undercover: config.undercover,
        mrWhite: config.mrWhite
      });
      if (!result.success) {
        openModal('showWordManagementModal');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleWordsUpdated = async () => {
    const result = await startNewGame({
      totalPlayers: config.totalPlayers,
      undercover: config.undercover,
      mrWhite: config.mrWhite
    });
    return result.success;
  };

  const handleNameSubmit = () => {
    if (playerName.trim()) {
      submitPlayerName(playerName.trim());
      setPlayerName('');
    }
  };

  const handleBackToSetup = () => {
    resetGame();
    closeModal('showGameOverModal');
  };

  const handleCardSelect = (cardIndex: number) => {
    selectCard(cardIndex);
  };

  const handleTurnModalNext = () => {
    closeModal('showTurnModal');
  };

  const handleWordRevealNext = () => {
    revealWordNext(config.totalPlayers);
  };

  const handleGoToVoting = () => {
    goToVoting();
  };

  const handlePlayerSelect = (playerId: number) => {
    selectPlayerForElimination(playerId);
  };

  const handleEliminatePlayer = () => {
    if (gameState.selectedPlayerToEliminate !== null) {
      eliminatePlayer(gameState.selectedPlayerToEliminate);
    }
  };

  const handleEliminationConfirm = () => {
    closeModal('showEliminationModal');
    transitionToPhase('description');
  };

  const handleMrWhiteGuess = () => {
    if (gameState.mrWhiteGuess?.trim()) {
      processMrWhiteGuess(gameState.mrWhiteGuess.trim());
    }
  };

  // Get current player for display
  const currentPlayer = getCurrentPlayer();

  // Render different screens based on game phase
  if (gameState.phase === 'setup') {
    return (
      <>
        <PlayerSetup
          totalPlayers={config.totalPlayers}
          civilians={config.totalPlayers - config.undercover - config.mrWhite}
          undercover={config.undercover}
          mrWhite={config.mrWhite}
          onTotalPlayersChange={(value) => updateConfig({ totalPlayers: value })}
          onUndercoverChange={(value) => updateConfig({ undercover: value })}
          onMrWhiteChange={(value) => updateConfig({ mrWhite: value })}
          canIncreaseUndercover={canIncreaseUndercover()}
          canDecreaseUndercover={canDecreaseUndercover()}
          canIncreaseMrWhite={canIncreaseMrWhite()}
          canDecreaseMrWhite={canDecreaseMrWhite()}
          isStartButtonEnabled={isStartButtonEnabled}
          onStart={handleStart}
          availableWords={getAvailableWordCount()}
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
          totalPlayers={config.totalPlayers}
          isRefreshing={isRefreshing}
          onBack={handleBackToSetup}
          onCardSelect={handleCardSelect}
          onRefreshWords={handleRefreshWords}
          getPlayerByCardIndex={getPlayerByCardIndex}
          isCardAvailable={isCardAvailable}
          getRemainingCounts={getRemainingCounts}
        />

        {/* Turn Modal for non-first rounds */}
        <Dialog open={modals.showTurnModal} onOpenChange={() => closeModal('showTurnModal')}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-lg">
                Giliran {currentPlayer?.name || `Player ${gameState.currentPlayerIndex + 1}`}
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-gray-600 mb-6">Silakan pilih kartu untuk melihat kata Anda</p>
              <Button onClick={handleTurnModalNext} className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 rounded-full">
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
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="text-center"
                onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
              <p className="text-sm text-blue-600 text-center">
                Masukkan nama untuk membuka kata rahasia
              </p>
              <Button
                onClick={handleNameSubmit}
                disabled={!playerName.trim()}
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
        onGoToVoting={handleGoToVoting}
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
          onBack={() => transitionToPhase('description')}
          onPlayerSelect={handlePlayerSelect}
          onEliminatePlayer={handleEliminatePlayer}
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
                    {gameState.eliminatedPlayer.role !== 'mrwhite' && (
                      <p className="text-sm text-gray-600 mt-1">
                        Word: {gameState.eliminatedPlayer.word}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleEliminationConfirm}
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
                  value={gameState.mrWhiteGuess || ''}
                  onChange={(e) => updateMrWhiteGuess(e.target.value)}
                  className="text-center text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && gameState.mrWhiteGuess?.trim() && handleMrWhiteGuess()}
                />
                <Button
                  onClick={handleMrWhiteGuess}
                  disabled={!gameState.mrWhiteGuess?.trim()}
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
                onClick={handleMrWhiteGuess}
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

export default AppWithServices;