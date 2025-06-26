import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Skull } from 'lucide-react';
import { WordService } from './services/wordService';
import { WordManagementModal } from './components/WordManagementModal';
import { PlayerSetup } from './components/PlayerSetup';
import { CardSelectionPhase } from './components/CardSelectionPhase';
import { DescriptionPhase } from './components/DescriptionPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameOverPhase } from './components/GameOverPhase';
import type { GamePhase, PlayerRole, Player, GameState, WordPair } from './types/gameTypes';

function App() {
  const [totalPlayers, setTotalPlayers] = useState(3);
  const [undercover, setUndercover] = useState(1);
  const [mrWhite, setMrWhite] = useState(0);
  const [civilians, setCivilians] = useState(2);
  const [playerName, setPlayerName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [showTurnModal, setShowTurnModal] = useState(false);
  const [showEliminationModal, setShowEliminationModal] = useState(false);
  const [showMrWhiteGuessModal, setShowMrWhiteGuessModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showWordManagementModal, setShowWordManagementModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    phase: 'setup',
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
  });

  // Initialize word service on component mount
  useEffect(() => {
    WordService.initializeWords();
  }, []);

  // Calculate civilians whenever other values change
  useEffect(() => {
    const calculatedCivilians = totalPlayers - undercover - mrWhite;
    setCivilians(calculatedCivilians);
  }, [totalPlayers, undercover, mrWhite]);

  // Auto-adjust undercover when total players change
  useEffect(() => {
    const maxAllowedSpecial = Math.floor((totalPlayers - 2) / 2);
    const currentSpecial = undercover + mrWhite;
    
    if (currentSpecial >= totalPlayers - 1) {
      const newUndercover = Math.max(1, Math.min(undercover, maxAllowedSpecial - mrWhite));
      if (newUndercover !== undercover) {
        setUndercover(newUndercover);
      }
    }
  }, [totalPlayers, mrWhite]);

  // Generate sequence-based player order
  const generatePlayerOrder = (totalPlayers: number): number[] => {
    const startPlayer = Math.floor(Math.random() * totalPlayers) + 1;
    const isForward = Math.random() < 0.5;
    const order: number[] = [];
    
    if (isForward) {
      for (let i = 0; i < totalPlayers; i++) {
        const playerNum = ((startPlayer - 1 + i) % totalPlayers) + 1;
        order.push(playerNum);
      }
    } else {
      for (let i = 0; i < totalPlayers; i++) {
        let playerNum = startPlayer - i;
        if (playerNum <= 0) {
          playerNum = totalPlayers + playerNum;
        }
        order.push(playerNum);
      }
    }
    
    return order;
  };

  // Get random word pair
  const getRandomWordPair = (): { civilian: string; undercover: string } | null => {
    const unplayedWord = WordService.getRandomUnplayedWord();
    if (!unplayedWord) {
      return null;
    }
    return {
      civilian: unplayedWord.civilian,
      undercover: unplayedWord.undercover
    };
  };

  // Initialize game
  const initializeGame = () => {
    // Check if words are available
    if (WordService.areAllWordsPlayed()) {
      setShowWordManagementModal(true);
      return;
    }

    const selectedWords = getRandomWordPair();
    if (!selectedWords) {
      setShowWordManagementModal(true);
      return;
    }

    const roles: PlayerRole[] = [];
    
    for (let i = 0; i < civilians; i++) roles.push('civilian');
    for (let i = 0; i < undercover; i++) roles.push('undercover');
    for (let i = 0; i < mrWhite; i++) roles.push('mrwhite');
    
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const players: Player[] = Array.from({ length: totalPlayers }, (_, index) => ({
      id: index + 1,
      name: '',
      role: roles[index],
      word: roles[index] === 'civilian' ? selectedWords.civilian : 
            roles[index] === 'undercover' ? selectedWords.undercover : '',
      hasRevealed: false,
      cardIndex: -1,
      isEliminated: false
    }));

    let playerOrder = generatePlayerOrder(totalPlayers);
    
    // Ensure Mr. White is not first in the order
    const mrWhitePlayer = players.find(p => p.role === 'mrwhite');
    if (mrWhitePlayer) {
      const mrWhiteOrderIndex = playerOrder.findIndex(playerId => playerId === mrWhitePlayer.id);
      if (mrWhiteOrderIndex === 0) {
        // Move Mr. White to a random position that's not first
        const newPosition = Math.floor(Math.random() * (playerOrder.length - 1)) + 1;
        playerOrder.splice(mrWhiteOrderIndex, 1);
        playerOrder.splice(newPosition, 0, mrWhitePlayer.id);
      }
    }

    setGameState({
      phase: 'card-selection',
      currentPlayerIndex: 0,
      selectedCard: null,
      players,
      round: 1,
      gameWords: selectedWords,
      playerOrder,
      selectedPlayerToEliminate: null,
      eliminatedPlayer: null,
      winner: null,
      mrWhiteGuess: '',
      showingWord: false
    });
  };

  // Handle refresh word pair
  const handleRefreshWords = async () => {
    if (isRefreshing) return;

    // Check if there are other unplayed words available
    const unplayedWords = WordService.getUnplayedWords();
    if (unplayedWords.length <= 1) {
      setShowWordManagementModal(true);
      return;
    }

    setIsRefreshing(true);

    // Mark current word pair as played
    WordService.markWordAsPlayed(gameState.gameWords.civilian, gameState.gameWords.undercover);

    // Get a new random word pair
    const newWordPair = getRandomWordPair();
    if (!newWordPair) {
      setShowWordManagementModal(true);
      setIsRefreshing(false);
      return;
    }

    // Update players with new words and reset card selections
    const updatedPlayers = gameState.players.map(player => ({
      ...player,
      word: player.role === 'civilian' ? newWordPair.civilian : 
            player.role === 'undercover' ? newWordPair.undercover : '',
      cardIndex: -1, // Reset card selection
      hasRevealed: false // Reset reveal status
    }));

    // Simulate animation delay
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        gameWords: newWordPair,
        players: updatedPlayers,
        selectedCard: null, // Reset selected card
        currentPlayerIndex: 0 // Reset to first player
      }));
      setIsRefreshing(false);
    }, 500);
  };

  // Validation functions
  const canIncreaseUndercover = () => {
    const newTotal = (undercover + 1) + mrWhite;
    const newCivilians = totalPlayers - newTotal;
    return newCivilians > newTotal;
  };

  const canDecreaseUndercover = () => {
    return undercover > 0 && (undercover > 1 || mrWhite > 0);
  };

  const canIncreaseMrWhite = () => {
    const newTotal = undercover + (mrWhite + 1);
    const newCivilians = totalPlayers - newTotal;
    return newCivilians > newTotal;
  };

  const canDecreaseMrWhite = () => {
    return mrWhite > 0;
  };

  const isStartButtonEnabled = () => {
    return totalPlayers >= 3 && 
           civilians >= 2 && 
           (undercover + mrWhite) > 0 && 
           civilians > (undercover + mrWhite);
  };

  const handleTotalPlayersChange = (value: number[]) => {
    setTotalPlayers(value[0]);
  };

  const handleUndercoverChange = (increment: boolean) => {
    if (increment && canIncreaseUndercover()) {
      setUndercover(prev => prev + 1);
    } else if (!increment && canDecreaseUndercover()) {
      setUndercover(prev => prev - 1);
    }
  };

  const handleMrWhiteChange = (increment: boolean) => {
    if (increment && canIncreaseMrWhite()) {
      setMrWhite(prev => prev + 1);
    } else if (!increment && canDecreaseMrWhite()) {
      setMrWhite(prev => prev - 1);
    }
  };

  const handleStart = () => {
    if (isStartButtonEnabled()) {
      initializeGame();
    }
  };

  const handleCardSelect = (cardIndex: number) => {
    const isCardTaken = gameState.players.some(p => p.cardIndex === cardIndex);
    if (isCardTaken) return;

    setGameState(prev => ({ ...prev, selectedCard: cardIndex }));
    
    if (gameState.round === 1) {
      setShowNameModal(true);
    } else {
      setShowWordModal(true);
    }
  };

  const handleNameSubmit = () => {
    if (playerName.trim() && gameState.selectedCard !== null) {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].name = playerName.trim();
      updatedPlayers[gameState.currentPlayerIndex].cardIndex = gameState.selectedCard;
      
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers
      }));
      
      setPlayerName('');
      setShowNameModal(false);
      setShowWordModal(true);
    }
  };

  const handleWordRevealNext = () => {
    if (gameState.selectedCard !== null) {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].hasRevealed = true;
      
      if (gameState.round > 1) {
        updatedPlayers[gameState.currentPlayerIndex].cardIndex = gameState.selectedCard;
      }
      
      setShowWordModal(false);
      
      if (gameState.currentPlayerIndex < totalPlayers - 1) {
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: prev.currentPlayerIndex + 1,
          selectedCard: null,
          players: updatedPlayers
        }));
        
        if (gameState.round > 1) {
          setShowTurnModal(true);
        }
      } else {
        setGameState(prev => ({
          ...prev,
          phase: 'description',
          currentPlayerIndex: 0,
          players: updatedPlayers
        }));
      }
    }
  };

  const handleTurnModalNext = () => {
    setShowTurnModal(false);
  };

  const handleGoToVoting = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'voting',
      selectedPlayerToEliminate: null
    }));
  };

  const handlePlayerSelect = (playerId: number) => {
    setGameState(prev => ({
      ...prev,
      selectedPlayerToEliminate: playerId
    }));
  };

  const handleEliminatePlayer = () => {
    if (gameState.selectedPlayerToEliminate === null) return;

    const playerToEliminate = gameState.players.find(p => p.id === gameState.selectedPlayerToEliminate);
    if (!playerToEliminate) return;

    const updatedPlayers = gameState.players.map(p => 
      p.id === gameState.selectedPlayerToEliminate 
        ? { ...p, isEliminated: true }
        : p
    );

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      eliminatedPlayer: playerToEliminate
    }));

    setShowEliminationModal(true);
  };

  const handleEliminationConfirm = () => {
    setShowEliminationModal(false);

    if (gameState.eliminatedPlayer?.role === 'mrwhite') {
      // Mr. White gets a chance to guess
      setGameState(prev => ({
        ...prev,
        phase: 'mr-white-guess'
      }));
      setShowMrWhiteGuessModal(true);
    } else {
      // Check win conditions
      checkWinConditions();
    }
  };

  const handleMrWhiteGuess = () => {
    const isCorrect = gameState.mrWhiteGuess.toLowerCase().trim() === gameState.gameWords.civilian.toLowerCase().trim();
    
    setShowMrWhiteGuessModal(false);

    if (isCorrect) {
      // Mr. White wins
      setGameState(prev => ({
        ...prev,
        winner: 'mrwhite',
        phase: 'game-over'
      }));
      setShowGameOverModal(true);
    } else {
      // Continue game, check other win conditions
      checkWinConditions();
    }
  };

  const checkWinConditions = () => {
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    const activeCivilians = activePlayers.filter(p => p.role === 'civilian');
    const activeUndercovers = activePlayers.filter(p => p.role === 'undercover');
    const activeMrWhites = activePlayers.filter(p => p.role === 'mrwhite');

    let winner: 'civilian' | 'undercover' | 'mrwhite' | null = null;

    // Civilians win if all Undercovers and Mr. White are eliminated
    if (activeUndercovers.length === 0 && activeMrWhites.length === 0) {
      winner = 'civilian';
    }
    // Undercover wins if only 1 Civilian remains with any number of Undercovers
    else if (activeCivilians.length === 1 && activeUndercovers.length > 0) {
      winner = 'undercover';
    }

    if (winner) {
      // Mark current word pair as played when game ends
      WordService.markWordAsPlayed(gameState.gameWords.civilian, gameState.gameWords.undercover);
      
      setGameState(prev => ({
        ...prev,
        winner,
        phase: 'game-over'
      }));
      setShowGameOverModal(true);
    } else {
      // Continue to next round - back to description phase
      setGameState(prev => ({
        ...prev,
        phase: 'description',
        round: prev.round + 1,
        selectedPlayerToEliminate: null,
        eliminatedPlayer: null
      }));
    }
  };

  const handleBackToSetup = () => {
    setGameState({
      phase: 'setup',
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
    });
    setShowGameOverModal(false);
  };

  const handleWordsUpdated = () => {
    // Restart the game initialization process
    initializeGame();
  };

  const getCurrentPlayer = () => gameState.players[gameState.currentPlayerIndex];
  const currentPlayer = getCurrentPlayer();

  const getPlayerByCardIndex = (cardIndex: number) => {
    return gameState.players.find(p => p.cardIndex === cardIndex);
  };

  const isCardAvailable = (cardIndex: number) => {
    return !gameState.players.some(p => p.cardIndex === cardIndex);
  };

  const getOrderedPlayers = () => {
    return gameState.playerOrder.map(playerNum => 
      gameState.players.find(p => p.id === playerNum)
    ).filter(Boolean) as Player[];
  };

  const getActivePlayers = () => {
    return gameState.players.filter(p => !p.isEliminated);
  };

  const getRemainingCounts = () => {
    const activePlayers = getActivePlayers();
    const undercovers = activePlayers.filter(p => p.role === 'undercover').length;
    const mrWhites = activePlayers.filter(p => p.role === 'mrwhite').length;
    return { undercovers, mrWhites, total: undercovers + mrWhites };
  };

  const getAvailableWordCount = () => {
    return WordService.getUnplayedWords().length;
  };

  // Render different screens based on game phase
  if (gameState.phase === 'setup') {
    return (
      <>
        <PlayerSetup
          totalPlayers={totalPlayers}
          civilians={civilians}
          undercover={undercover}
          mrWhite={mrWhite}
          onTotalPlayersChange={handleTotalPlayersChange}
          onUndercoverChange={handleUndercoverChange}
          onMrWhiteChange={handleMrWhiteChange}
          canIncreaseUndercover={canIncreaseUndercover}
          canDecreaseUndercover={canDecreaseUndercover}
          canIncreaseMrWhite={canIncreaseMrWhite}
          canDecreaseMrWhite={canDecreaseMrWhite}
          isStartButtonEnabled={isStartButtonEnabled}
          onStart={handleStart}
          availableWords={getAvailableWordCount()}
        />
        
        <WordManagementModal
          isOpen={showWordManagementModal}
          onClose={() => setShowWordManagementModal(false)}
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
          totalPlayers={totalPlayers}
          isRefreshing={isRefreshing}
          onBack={handleBackToSetup}
          onCardSelect={handleCardSelect}
          onRefreshWords={handleRefreshWords}
          getPlayerByCardIndex={getPlayerByCardIndex}
          isCardAvailable={isCardAvailable}
          getRemainingCounts={getRemainingCounts}
        />

        {/* Turn Modal for non-first rounds */}
        <Dialog open={showTurnModal} onOpenChange={setShowTurnModal}>
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
        <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
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
        <Dialog open={showWordModal} onOpenChange={setShowWordModal}>
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
          isOpen={showWordManagementModal}
          onClose={() => setShowWordManagementModal(false)}
          onWordsUpdated={handleWordsUpdated}
        />
      </>
    );
  }

  if (gameState.phase === 'description') {
    const orderedPlayers = getOrderedPlayers().filter(p => !p.isEliminated);
    
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
    // Sort active players to match description phase order, with eliminated players at the end
    const orderedActivePlayers = getOrderedPlayers().filter(p => !p.isEliminated);
    const eliminatedPlayers = getOrderedPlayers().filter(p => p.isEliminated);
    const sortedPlayers = [...orderedActivePlayers, ...eliminatedPlayers];
    
    return (
      <>
        <VotingPhase
          sortedPlayers={sortedPlayers}
          selectedPlayerToEliminate={gameState.selectedPlayerToEliminate}
          onBack={() => setGameState(prev => ({ ...prev, phase: 'description' }))}
          onPlayerSelect={handlePlayerSelect}
          onEliminatePlayer={handleEliminatePlayer}
          getRemainingCounts={getRemainingCounts}
        />

        {/* Elimination Confirmation Modal */}
        <Dialog open={showEliminationModal} onOpenChange={setShowEliminationModal}>
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
                  value={gameState.mrWhiteGuess}
                  onChange={(e) => setGameState(prev => ({ ...prev, mrWhiteGuess: e.target.value }))}
                  className="text-center text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && gameState.mrWhiteGuess.trim() && handleMrWhiteGuess()}
                />
                <Button
                  onClick={handleMrWhiteGuess}
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
        <Dialog open={showMrWhiteGuessModal} onOpenChange={setShowMrWhiteGuessModal}>
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
        <Dialog open={showGameOverModal} onOpenChange={setShowGameOverModal}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-lg">
                🎉 Game Complete!
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-gray-600 mb-6">
                The game has ended. Check the results!
              </p>
              <Button
                onClick={() => setShowGameOverModal(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded-full"
              >
                View Results
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