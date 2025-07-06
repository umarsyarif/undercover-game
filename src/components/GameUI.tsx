import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Skull } from 'lucide-react';
import { WordManagementModal } from './WordManagementModal';
import { PlayerSetup } from './PlayerSetup';
import { CardSelectionPhase } from './CardSelectionPhase';
import { DescriptionPhase } from './DescriptionPhase';
import { VotingPhase } from './VotingPhase';
import { GameOverPhase } from './GameOverPhase';
import type { GameUIProps } from '../types/containerTypes';

/**
 * Pure UI component that handles presentation logic only
 * All business logic is handled by the container component
 */
export const GameUI: React.FC<GameUIProps> = ({
  // State
  gameState,
  config,
  modals,
  playerName,
  isRefreshing,
  
  // Computed values
  currentPlayer,
  orderedPlayers,
  activePlayers,
  remainingCounts,
  availableWordCount,
  civilians,
  canIncreaseUndercover,
  canDecreaseUndercover,
  canIncreaseMrWhite,
  canDecreaseMrWhite,
  isStartButtonEnabled,
  sortedPlayersForVoting,
  winnerPlayers,
  
  // Service queries
  getPlayerByCardIndex,
  isCardAvailable,
  
  // Handlers
  onStart,
  onRefreshWords,
  onWordsUpdated,
  onBackToSetup,
  onNameSubmit,
  onCardSelect,
  onPlayerSelect,
  onEliminatePlayer,
  onWordRevealNext,
  onGoToVoting,
  onEliminationConfirm,
  onMrWhiteGuess,
  onTurnModalNext,
  onPhaseTransition,
  onConfigChange,
  onPlayerNameChange,
  onMrWhiteGuessChange,
  openModal,
  closeModal
}) => {
  // Render different screens based on game phase
  if (gameState.phase === 'setup') {
    return (
      <>
        <PlayerSetup
          totalPlayers={config.totalPlayers}
          civilians={civilians}
          undercover={config.undercover}
          mrWhite={config.mrWhite}
          onTotalPlayersChange={(value) => onConfigChange({ totalPlayers: value[0] })}
          onUndercoverChange={(value) => onConfigChange({ undercover: value ? 1 : 0 })}
          onMrWhiteChange={(value) => onConfigChange({ mrWhite: value ? 1 : 0 })}
          canIncreaseUndercover={typeof canIncreaseUndercover === 'function' ? canIncreaseUndercover() : canIncreaseUndercover}
          canDecreaseUndercover={typeof canDecreaseUndercover === 'function' ? canDecreaseUndercover() : canDecreaseUndercover}
          canIncreaseMrWhite={typeof canIncreaseMrWhite === 'function' ? canIncreaseMrWhite() : canIncreaseMrWhite}
          canDecreaseMrWhite={typeof canDecreaseMrWhite === 'function' ? canDecreaseMrWhite() : canDecreaseMrWhite}
          isStartButtonEnabled={typeof isStartButtonEnabled === 'function' ? isStartButtonEnabled() : isStartButtonEnabled}
          onStart={onStart}
          availableWords={availableWordCount}
        />
        
        <WordManagementModal
          isOpen={modals.showWordManagementModal}
          onClose={() => closeModal('showWordManagementModal')}
          onWordsUpdated={onWordsUpdated}
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
          onBack={onBackToSetup}
          onCardSelect={onCardSelect}
          onRefreshWords={onRefreshWords}
          getPlayerByCardIndex={getPlayerByCardIndex}
          isCardAvailable={isCardAvailable}
          getRemainingCounts={() => remainingCounts}
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
              <Button onClick={onTurnModalNext} className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 rounded-full">
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
                onChange={(e) => onPlayerNameChange(e.target.value)}
                className="text-center"
                onKeyPress={(e) => e.key === 'Enter' && onNameSubmit()}
              />
              <p className="text-sm text-blue-600 text-center">
                Masukkan nama untuk membuka kata rahasia
              </p>
              <Button
                onClick={onNameSubmit}
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
                onClick={onWordRevealNext}
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
          onWordsUpdated={onWordsUpdated}
        />
      </>
    );
  }

  if (gameState.phase === 'description') {
    const orderedPlayersFiltered = orderedPlayers.filter(p => !p.isEliminated);
    
    return (
      <DescriptionPhase
        orderedPlayers={orderedPlayersFiltered}
        round={gameState.round}
        onBack={onBackToSetup}
        onGoToVoting={onGoToVoting}
        getRemainingCounts={() => remainingCounts}
      />
    );
  }

  if (gameState.phase === 'voting') {
    return (
      <>
        <VotingPhase
          sortedPlayers={sortedPlayersForVoting}
          selectedPlayerToEliminate={gameState.selectedPlayerToEliminate}
          onBack={() => onPhaseTransition('description')}
          onPlayerSelect={onPlayerSelect}
          onEliminatePlayer={onEliminatePlayer}
          getRemainingCounts={() => remainingCounts}
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
                    onClick={onEliminationConfirm}
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
                  onChange={(e) => onMrWhiteGuessChange(e.target.value)}
                  className="text-center text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && gameState.mrWhiteGuess?.trim() && onMrWhiteGuess()}
                />
                <Button
                  onClick={onMrWhiteGuess}
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
                onClick={onMrWhiteGuess}
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
    return (
      <>
        <GameOverPhase
          gameState={gameState}
          winnerPlayers={winnerPlayers}
          onBackToSetup={onBackToSetup}
          onContinueWithSamePlayers={onRefreshWords}
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
};

export default GameUI;