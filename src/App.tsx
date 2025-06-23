import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Minus, Plus, User, ArrowLeft, HelpCircle, Crown, Skull, Home } from 'lucide-react';

// Game words data
const gameWords = [
  { civilian: 'Apel', undercover: 'Jeruk' },
  { civilian: 'Kucing', undercover: 'Anjing' },
  { civilian: 'Mobil', undercover: 'Motor' },
  { civilian: 'Kopi', undercover: 'Teh' },
  { civilian: 'Buku', undercover: 'Majalah' },
];

type GamePhase = 'setup' | 'card-selection' | 'name-input' | 'word-reveal' | 'word-transition' | 'description' | 'voting' | 'mr-white-guess' | 'game-over';
type PlayerRole = 'civilian' | 'undercover' | 'mrwhite';

interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  word: string;
  hasRevealed: boolean;
  cardIndex: number;
  isEliminated: boolean;
}

interface GameState {
  phase: GamePhase;
  currentPlayerIndex: number;
  selectedCard: number | null;
  players: Player[];
  round: number;
  gameWords: { civilian: string; undercover: string };
  playerOrder: number[];
  selectedPlayerToEliminate: number | null;
  eliminatedPlayer: Player | null;
  winner: 'civilian' | 'undercover' | 'mrwhite' | null;
  mrWhiteGuess: string;
  showingWord: boolean;
}

function App() {
  const [totalPlayers, setTotalPlayers] = useState(3);
  const [undercover, setUndercover] = useState(1);
  const [mrWhite, setMrWhite] = useState(0);
  const [civilians, setCivilians] = useState(2);
  const [playerName, setPlayerName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [showTurnModal, setShowTurnModal] = useState(false);
  const [showPlayerTurnModal, setShowPlayerTurnModal] = useState(false);
  const [showEliminationModal, setShowEliminationModal] = useState(false);
  const [showMrWhiteGuessModal, setShowMrWhiteGuessModal] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    phase: 'setup',
    currentPlayerIndex: 0,
    selectedCard: null,
    players: [],
    round: 1,
    gameWords: gameWords[0],
    playerOrder: [],
    selectedPlayerToEliminate: null,
    eliminatedPlayer: null,
    winner: null,
    mrWhiteGuess: '',
    showingWord: false
  });

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

  // Show player turn modal when starting card selection
  useEffect(() => {
    if (gameState.phase === 'card-selection' && gameState.currentPlayerIndex === 0 && gameState.round === 1) {
      setShowPlayerTurnModal(true);
    }
  }, [gameState.phase, gameState.currentPlayerIndex, gameState.round]);

  // Generate sequence-based player order with Mr. White restriction
  const generatePlayerOrder = (totalPlayers: number, players: Player[]): number[] => {
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    while (attempts < maxAttempts) {
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
      
      // Check if first player is Mr. White
      const firstPlayerId = order[0];
      const firstPlayer = players.find(p => p.id === firstPlayerId);
      
      // If first player is not Mr. White, or if there's no Mr. White in the game, use this order
      if (!firstPlayer || firstPlayer.role !== 'mrwhite') {
        return order;
      }
      
      attempts++;
    }
    
    // Fallback: if we can't generate a valid order, manually ensure Mr. White is not first
    const startPlayer = Math.floor(Math.random() * totalPlayers) + 1;
    const order: number[] = [];
    
    for (let i = 0; i < totalPlayers; i++) {
      const playerNum = ((startPlayer - 1 + i) % totalPlayers) + 1;
      order.push(playerNum);
    }
    
    // If first player is still Mr. White, swap with second player
    const firstPlayerId = order[0];
    const firstPlayer = players.find(p => p.id === firstPlayerId);
    
    if (firstPlayer && firstPlayer.role === 'mrwhite' && order.length > 1) {
      [order[0], order[1]] = [order[1], order[0]];
    }
    
    return order;
  };

  // Check if player names are preserved (not empty)
  const areNamesPreserved = () => {
    return gameState.players.length > 0 && gameState.players.every(player => player.name.trim() !== '');
  };

  // Initialize game
  const initializeGame = () => {
    const selectedWords = gameWords[Math.floor(Math.random() * gameWords.length)];
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

    const playerOrder = generatePlayerOrder(totalPlayers, players);

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

  // Start new game with same settings and preserved names
  const startNewGame = () => {
    const selectedWords = gameWords[Math.floor(Math.random() * gameWords.length)];
    const roles: PlayerRole[] = [];
    
    for (let i = 0; i < civilians; i++) roles.push('civilian');
    for (let i = 0; i < undercover; i++) roles.push('undercover');
    for (let i = 0; i < mrWhite; i++) roles.push('mrwhite');
    
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Keep existing player names but reset their game state
    const newPlayers: Player[] = gameState.players.map((player, index) => ({
      id: player.id,
      name: player.name, // Keep existing name
      role: roles[index],
      word: roles[index] === 'civilian' ? selectedWords.civilian : 
            roles[index] === 'undercover' ? selectedWords.undercover : '',
      hasRevealed: false,
      cardIndex: -1, // Reset card selection
      isEliminated: false
    }));

    const playerOrder = generatePlayerOrder(totalPlayers, newPlayers);

    setGameState({
      phase: 'card-selection',
      currentPlayerIndex: 0,
      selectedCard: null,
      players: newPlayers,
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
    
    // Show name modal only if round 1 AND names are not preserved
    if (gameState.round === 1 && !areNamesPreserved()) {
      setShowNameModal(true);
    } else {
      setShowWordModal(true);
      setGameState(prev => ({ ...prev, showingWord: true }));
    }
  };

  const handleNameSubmit = () => {
    if (playerName.trim() && gameState.selectedCard !== null) {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].name = playerName.trim();
      updatedPlayers[gameState.currentPlayerIndex].cardIndex = gameState.selectedCard;
      
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        showingWord: true
      }));
      
      setPlayerName('');
      setShowNameModal(false);
      setShowWordModal(true);
    }
  };

  const handleWordRevealNext = () => {
    // Hide word immediately
    setGameState(prev => ({ ...prev, showingWord: false }));
    
    // Start transition phase
    setTimeout(() => {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].hasRevealed = true;
      
      // Always update the card index when word is revealed
      if (gameState.selectedCard !== null) {
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
        
        // Show player turn modal for next player
        setShowPlayerTurnModal(true);
      } else {
        setGameState(prev => ({
          ...prev,
          phase: 'description',
          currentPlayerIndex: 0,
          players: updatedPlayers
        }));
      }
    }, 300); // Smooth transition delay
  };

  const handlePlayerTurnModalNext = () => {
    setShowPlayerTurnModal(false);
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
      setGameState(prev => ({
        ...prev,
        winner,
        phase: 'game-over'
      }));
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
      gameWords: gameWords[0],
      playerOrder: [],
      selectedPlayerToEliminate: null,
      eliminatedPlayer: null,
      winner: null,
      mrWhiteGuess: '',
      showingWord: false
    });
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

  // Helper function to get card colors
  const getCardColor = (player: Player, index: number) => {
    const colors = ['bg-green-500', 'bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-orange-500', 'bg-teal-500', 'bg-violet-500'];
    return colors[index % colors.length];
  };

  // Get players in consistent order for voting (same as description phase order, but eliminated at end)
  const getPlayersForVoting = () => {
    const orderedPlayers = getOrderedPlayers();
    const activePlayers = orderedPlayers.filter(p => !p.isEliminated);
    const eliminatedPlayers = orderedPlayers.filter(p => p.isEliminated);
    
    return [...activePlayers, ...eliminatedPlayers];
  };

  // Render different screens based on game phase
  if (gameState.phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 w-screen">
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 w-screen">
          <div className="w-full max-w-lg mx-auto">
            <div className="flex flex-col gap-8 p-6 sm:p-8">
              {/* Header */}
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Undercover</h1>
                <p className="text-lg text-gray-600">Atur Pemain</p>
              </div>

              {/* Player Configuration */}
              <div className="space-y-8">
                {/* Total Players Slider */}
                <Card className="p-6 shadow-md">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-base font-medium text-gray-700">Pemain</label>
                      <span className="text-2xl font-bold text-blue-600">{totalPlayers}</span>
                    </div>
                    <Slider
                      value={[totalPlayers]}
                      onValueChange={handleTotalPlayersChange}
                      max={20}
                      min={3}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>3</span>
                      <span>20</span>
                    </div>
                  </div>
                </Card>

                {/* Role Distribution */}
                <Card className="p-6 shadow-md space-y-6">
                  {/* Civilians Display */}
                  <div className="flex items-center justify-center">
                    <div className="bg-blue-500 text-white px-8 py-3 rounded-full text-base font-medium">
                      {civilians} Civilian
                    </div>
                  </div>

                  {/* Undercover */}
                  <div className="flex items-center justify-center relative">
                    {canDecreaseUndercover() && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute left-0 h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-50"
                        onClick={() => handleUndercoverChange(false)}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                    )}
                    
                    <div className="bg-black text-white px-8 py-3 rounded-full text-base font-medium">
                      {undercover} Undercover
                    </div>
                    
                    {canIncreaseUndercover() && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-0 h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-50"
                        onClick={() => handleUndercoverChange(true)}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    )}
                  </div>

                  {/* Mr. White */}
                  <div className="flex items-center justify-center relative">
                    {canDecreaseMrWhite() && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute left-0 h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-50"
                        onClick={() => handleMrWhiteChange(false)}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                    )}
                    
                    <div className="bg-white text-black border-2 border-gray-300 px-8 py-3 rounded-full text-base font-medium">
                      {mrWhite} Mr. White
                    </div>
                    
                    {canIncreaseMrWhite() && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-0 h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-50"
                        onClick={() => handleMrWhiteChange(true)}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Error Message */}
                {!isStartButtonEnabled() && totalPlayers >= 3 && (
                  <div className="text-center text-sm text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
                    {civilians < 2 ? 'Minimal 2 civilian diperlukan' : 
                     (undercover + mrWhite) === 0 ? 'Minimal 1 undercover atau Mr. White diperlukan' :
                     'Civilian harus lebih banyak dari undercover dan Mr. White'}
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-1/2 lg:right-auto lg:transform lg:-translate-x-1/2 lg:w-full lg:max-w-lg lg:px-0">
              <div className="px-6 sm:px-8 lg:px-6">
                <Button
                  onClick={handleStart}
                  disabled={!isStartButtonEnabled()}
                  className={`w-full py-4 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-200 ${
                    isStartButtonEnabled()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Mulai
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'card-selection') {
    const remainingCounts = getRemainingCounts();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 w-screen">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSetup}
            className="text-white hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-xl font-bold text-cyan-400">Player {gameState.currentPlayerIndex + 1}</h2>
            <p className="text-gray-300">Pilih kartu</p>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Game Status */}
        <div className="p-4 flex justify-center gap-4">
          <div className="bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="font-medium">Penyusup tersisa</span>
            <div className="flex gap-1">
              {remainingCounts.undercovers > 0 && (
                <span className="bg-black text-white px-2 py-1 rounded text-sm">
                  {remainingCounts.undercovers}U
                </span>
              )}
              {remainingCounts.mrWhites > 0 && (
                <span className="bg-white text-black border border-gray-400 px-2 py-1 rounded text-sm">
                  {remainingCounts.mrWhites}W
                </span>
              )}
            </div>
          </div>
          <div className="bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-gray-600">Round</span>
            <span className="ml-2 font-medium">{gameState.round}</span>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl w-full">
            {Array.from({ length: totalPlayers }, (_, index) => {
              const playerAtCard = getPlayerByCardIndex(index);
              const isSelected = gameState.selectedCard === index;
              const isAvailable = isCardAvailable(index);
              
              return (
                <Card
                  key={index}
                  className={`aspect-[3/4] transition-all duration-200 flex flex-col items-center justify-center shadow-lg relative ${
                    playerAtCard 
                      ? 'bg-green-500 text-white cursor-default' 
                      : isSelected 
                        ? 'bg-yellow-500 hover:bg-yellow-600 cursor-pointer ring-4 ring-blue-500 scale-105' 
                        : 'bg-yellow-400 hover:bg-yellow-500 cursor-pointer'
                  } ${!isAvailable && !playerAtCard ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => isAvailable && handleCardSelect(index)}
                >
                  {playerAtCard ? (
                    <>
                      <div className="text-4xl font-bold mb-2">
                        {playerAtCard.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <div className="text-sm font-medium text-center px-2">
                        {playerAtCard.name || `Player ${playerAtCard.id}`}
                      </div>
                    </>
                  ) : (
                    <User className="h-16 w-16 text-white drop-shadow-lg" />
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Player Turn Modal */}
        <Dialog open={showPlayerTurnModal} onOpenChange={setShowPlayerTurnModal}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="text-center text-lg">
                {currentPlayer?.name || `Player ${gameState.currentPlayerIndex + 1}`} memilih kartu
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="h-10 w-10 text-white" />
              </div>
              <p className="text-gray-600 mb-6">Silakan pilih kartu untuk melanjutkan</p>
              <Button onClick={handlePlayerTurnModalNext} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded-full">
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
            <div className={`text-center py-6 ${
                gameState.showingWord ? 'opacity-100' : 'opacity-0'
              }`}>
              <div className="text-6xl mb-4">
                {currentPlayer?.role === 'mrwhite' ? '❓' : '📝'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {currentPlayer?.name || `Player ${gameState.currentPlayerIndex + 1}`}
              </h3>
              <div className={`bg-gray-100 p-6 rounded-lg mb-6 transition-opacity duration-300 ${
                gameState.showingWord ? 'opacity-100' : 'opacity-0'
              }`}>
                <p className="text-xl font-semibold">
                  {gameState.showingWord ? (
                    currentPlayer?.role === 'mrwhite' 
                      ? "You're Mr. White" 
                      : currentPlayer?.word
                  ) : ''}
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
      </div>
    );
  }

  if (gameState.phase === 'description') {
    const orderedPlayers = getOrderedPlayers().filter(p => !p.isEliminated);
    const remainingCounts = getRemainingCounts();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 w-screen">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSetup}
            className="text-white hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-xl font-bold text-green-400">Deskripsi Waktu</h2>
            <p className="text-gray-300 text-sm">
              Jelaskan kata rahasiamu dalam urutan yang ditunjukkan
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Game Status */}
        <div className="p-4 flex justify-center gap-4">
          <div className="bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="font-medium">Penyusup tersisa</span>
            <div className="flex gap-1">
              {remainingCounts.undercovers > 0 && (
                <span className="bg-black text-white px-2 py-1 rounded text-sm">
                  {remainingCounts.undercovers}U
                </span>
              )}
              {remainingCounts.mrWhites > 0 && (
                <span className="bg-white text-black border border-gray-400 px-2 py-1 rounded text-sm">
                  {remainingCounts.mrWhites}W
                </span>
              )}
            </div>
          </div>
          <div className="bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-gray-600">Round</span>
            <span className="ml-2 font-medium">{gameState.round}</span>
          </div>
        </div>

        {/* Player Order Cards - Grid Layout */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600">
                Urutan berbicara (Player aktif):
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {orderedPlayers.map((player, index) => (
                <Card
                  key={player.id}
                  className={`aspect-[3/4] ${getCardColor(player, player.id - 1)} text-white flex flex-col items-center justify-center shadow-lg relative`}
                >
                  <div className="absolute -top-2 -right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-gray-200">
                    {index + 1}
                  </div>
                  
                  <div className="text-4xl font-bold mb-2">
                    {player.name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  
                  <div className="text-sm font-medium text-center px-2">
                    {player.name || `Player ${player.id}`}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Vote Button */}
        <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-1/2 lg:right-auto lg:transform lg:-translate-x-1/2 lg:w-full lg:max-w-lg lg:px-0">
          <div className="px-6 sm:px-8 lg:px-6">
            <Button 
              onClick={handleGoToVoting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 text-lg font-semibold rounded-2xl shadow-lg"
            >
              Pergi ke Voting
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'voting') {
    const playersForVoting = getPlayersForVoting();
    const remainingCounts = getRemainingCounts();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 w-screen">
        {/* Header */}
        <div className="bg-orange-600 text-white p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGameState(prev => ({ ...prev, phase: 'description' }))}
            className="text-white hover:bg-orange-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-xl font-bold">Waktu Eliminasi</h2>
            <p className="text-orange-100 text-sm">
              Diskusikan siapa yang harus dihilangkan dan kemudian pilih semua secara bersamaan dengan menunjuk jari!
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-orange-700">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Game Status */}
        <div className="p-4 flex justify-center gap-4">
          <div className="bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-2">
            <Skull className="h-4 w-4" />
            <span className="font-medium">Penyusup tersisa</span>
            <div className="flex gap-1">
              {remainingCounts.undercovers > 0 && (
                <span className="bg-black text-white px-2 py-1 rounded text-sm">
                  {remainingCounts.undercovers}U
                </span>
              )}
              {remainingCounts.mrWhites > 0 && (
                <span className="bg-white text-black border border-gray-400 px-2 py-1 rounded text-sm">
                  {remainingCounts.mrWhites}W
                </span>
              )}
            </div>
          </div>
          <div className="bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-gray-600">Peran Khusus</span>
            <span className="ml-2 text-gray-400">
              {remainingCounts.mrWhites > 0 ? 'Ada Mr. White' : 'Tidak ada'}
            </span>
          </div>
        </div>

        {/* Players Grid - Same order as description phase */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {playersForVoting.map((player) => {
                const isSelected = gameState.selectedPlayerToEliminate === player.id;
                const isEliminated = player.isEliminated;
                const isClickable = !isEliminated;
                const bgColor = getCardColor(player, player.id - 1);
                
                return (
                  <Card
                    key={player.id}
                    className={`aspect-[3/4] transition-all duration-200 shadow-lg relative ${
                      isEliminated 
                        ? `${bgColor} opacity-40 cursor-not-allowed text-white` 
                        : isSelected 
                          ? `${bgColor} ring-4 ring-orange-500 scale-105 text-white cursor-pointer` 
                          : `${bgColor} hover:scale-105 text-white cursor-pointer`
                    }`}
                    onClick={() => isClickable && handlePlayerSelect(player.id)}
                  >
                    {/* Selection badge */}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-white">
                        ✓
                      </div>
                    )}
                    
                    {/* Eliminated badge */}
                    {isEliminated && (
                      <div className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-white">
                        ✕
                      </div>
                    )}
                    
                    <div className="flex flex-col items-center justify-center h-full p-4">
                      <div className="text-4xl font-bold mb-2">
                        {player.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <div className="text-sm font-medium text-center">
                        {player.name || `Player ${player.id}`}
                      </div>
                      {isSelected && (
                        <div className="mt-2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          Eliminasi
                        </div>
                      )}
                      {isEliminated && (
                        <div className="mt-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          Eliminated
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Eliminate Button */}
        <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-1/2 lg:right-auto lg:transform lg:-translate-x-1/2 lg:w-full lg:max-w-lg lg:px-0">
          <div className="px-6 sm:px-8 lg:px-6">
            <Button 
              onClick={handleEliminatePlayer}
              disabled={gameState.selectedPlayerToEliminate === null}
              className={`w-full py-4 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-200 ${
                gameState.selectedPlayerToEliminate !== null
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Eliminasi
            </Button>
          </div>
        </div>

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
      </div>
    );
  }

  if (gameState.phase === 'mr-white-guess') {
    return (
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
                onClick={() => setShowMrWhiteGuessModal(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-full"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
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
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 w-screen">
        {/* Header */}
        <div className="bg-yellow-600 text-white p-4 text-center">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Crown className="h-6 w-6" />
            Game Over
          </h2>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="text-8xl mb-6">
              {gameState.winner === 'civilian' ? '🏆' : 
               gameState.winner === 'undercover' ? '🎭' : '❓'}
            </div>
            
            <h3 className="text-3xl font-bold mb-4 capitalize">
              {gameState.winner === 'civilian' ? 'Civilians Win!' :
               gameState.winner === 'undercover' ? 'Undercover Wins!' :
               'Mr. White Wins!'}
            </h3>

            {/* Winner Details */}
            <div className="bg-gray-100 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-semibold mb-3">Winners:</h4>
              <div className="space-y-2">
                {winnerPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-center gap-2">
                    <span className="font-medium">{player.name || `Player ${player.id}`}</span>
                    <span className="text-sm text-gray-600 capitalize">({player.role})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Statistics */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <h4 className="font-semibold mb-2">Game Statistics:</h4>
              <div className="text-sm space-y-1">
                <p>Rounds Played: {gameState.round}</p>
                <p>Civilian Word: {gameState.gameWords.civilian}</p>
                <p>Undercover Word: {gameState.gameWords.undercover}</p>
                <p>Total Players: {gameState.players.length}</p>
                <p>Players Eliminated: {gameState.players.filter(p => p.isEliminated).length}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleBackToSetup}
                variant="outline"
                className="flex-1 py-3 rounded-full text-lg border-2 border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Home className="h-5 w-5" />
              </Button>
              <Button
                onClick={startNewGame}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full text-lg"
              >
                Lanjut
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

export default App;