import { useState, useEffect } from 'react';
import { WordService } from '../services/wordService';
import { GameLogic } from '../services/gameLogic';
import type { GameState, PlayerRole, Player, WordPair } from '../types/gameTypes';

interface GameConfig {
  totalPlayers: number;
  undercover: number;
  mrWhite: number;
  civilians: number;
}

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'setup',
    undercoverCount: 0,
    mrWhiteCount: 0,
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
  const initializeGame = (config: GameConfig) => {
    // Reset the random start player
    GameLogic.resetRandomStart();
    
    // Check if words are available
    if (WordService.areAllWordsPlayed()) {
      return { success: false, reason: 'no-words' };
    }

    const selectedWords = getRandomWordPair();
    if (!selectedWords) {
      return { success: false, reason: 'no-words' };
    }

    const newPlayers = GameLogic.generatePlayers(
      config.totalPlayers,
      config.undercover,
      config.mrWhite,
      selectedWords
    );

    setGameState({
      phase: 'card-selection',
      undercoverCount: config.undercover,
      mrWhiteCount: config.mrWhite,
      currentPlayerIndex: 0,
      selectedCard: null,
      players: newPlayers,
      round: 1,
      gameWords: selectedWords,
      playerOrder: [],
      selectedPlayerToEliminate: null,
      eliminatedPlayer: null,
      winner: null,
      mrWhiteGuess: '',
      showingWord: false
    });

    return { success: true };
  };

  // Reset game to setup phase
  const resetGame = () => {
    // Reset the random start player
    GameLogic.resetRandomStart();
    
    setGameState({
      phase: 'setup',
      undercoverCount: 0,
      mrWhiteCount: 0,
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
  };

  // Update game state
  const updateGameState = (updates: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...updates }));
  };

  // Get current player
  const getCurrentPlayer = () => gameState.players[gameState.currentPlayerIndex];

  // Get player by card index
  const getPlayerByCardIndex = (cardIndex: number) => {
    return gameState.players.find(p => p.cardIndex === cardIndex);
  };

  // Check if card is available
  const isCardAvailable = (cardIndex: number) => {
    return !gameState.players.some(p => p.cardIndex === cardIndex);
  };

  // Get ordered players
  const getOrderedPlayers = () => {
    return gameState.playerOrder.map(playerNum => 
      gameState.players.find(p => p.id === playerNum)
    ).filter(Boolean) as Player[];
  };

  // Get active players
  const getActivePlayers = () => {
    return gameState.players.filter(p => !p.isEliminated);
  };

  // Get remaining counts
  const getRemainingCounts = () => {
    const activePlayers = getActivePlayers();
    const undercovers = activePlayers.filter(p => p.role === 'undercover').length;
    const mrWhites = activePlayers.filter(p => p.role === 'mrwhite').length;
    return { undercovers, mrWhites, total: undercovers + mrWhites };
  };

  // Check win conditions
  const checkWinConditions = () => {
    const activePlayers = getActivePlayers();
    const activeCivilians = activePlayers.filter(p => p.role === 'civilian');
    const activeUndercovers = activePlayers.filter(p => p.role === 'undercover');
    const activeMrWhites = activePlayers.filter(p => p.role === 'mrwhite');

    let winner: 'civilian' | 'undercover' | 'mrwhite' | null = null;

    // Mr. White wins if they are the last player standing
    if (activePlayers.length === 1 && activeMrWhites.length === 1) {
      winner = 'mrwhite';
    }
    // Civilians win if all Undercovers and Mr. White are eliminated
    else if (activeUndercovers.length === 0 && activeMrWhites.length === 0) {
      winner = 'civilian';
    }
    // Undercover wins if only 1 Civilian remains with any number of Undercovers
    else if (activeCivilians.length === 1 && activeUndercovers.length > 0) {
      winner = 'undercover';
    }

    if (winner) {
      // Mark current word pair as played when game ends
      WordService.markWordAsPlayed(gameState.gameWords.civilian, gameState.gameWords.undercover);
      
      updateGameState({
        winner,
        phase: 'game-over'
      });
      
      return winner;
    }

    return null;
  };

  return {
    gameState,
    setGameState,
    updateGameState,
    initializeGame,
    resetGame,
    getCurrentPlayer,
    getPlayerByCardIndex,
    isCardAvailable,
    getOrderedPlayers,
    getActivePlayers,
    getRemainingCounts,
    checkWinConditions,
    getRandomWordPair
  };
};