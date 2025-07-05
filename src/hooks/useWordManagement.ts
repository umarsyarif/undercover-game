import { useState } from 'react';
import { WordService } from '../services/wordService';
import type { GameState, Player } from '../types/gameTypes';

export const useWordManagement = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get available word count
  const getAvailableWordCount = () => {
    return WordService.getUnplayedWords().length;
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

  // Handle refresh word pair
  const handleRefreshWords = async (
    gameState: GameState,
    updateGameState: (updates: Partial<GameState>) => void,
    onShowWordManagement: () => void
  ) => {
    if (isRefreshing) return;

    // Check if there are other unplayed words available
    const unplayedWords = WordService.getUnplayedWords();
    if (unplayedWords.length <= 1) {
      onShowWordManagement();
      return;
    }

    setIsRefreshing(true);

    // Mark current word pair as played
    WordService.markWordAsPlayed(gameState.gameWords.civilian, gameState.gameWords.undercover);

    // Get a new random word pair
    const newWordPair = getRandomWordPair();
    if (!newWordPair) {
      onShowWordManagement();
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
      updateGameState({
        gameWords: newWordPair,
        players: updatedPlayers,
        selectedCard: null, // Reset selected card
        currentPlayerIndex: 0 // Reset to first player
      });
      setIsRefreshing(false);
    }, 500);
  };

  // Check if words are available for game start
  const checkWordsAvailable = () => {
    return !WordService.areAllWordsPlayed();
  };

  // Handle words updated callback
  const handleWordsUpdated = (
    initializeGame: (config: any) => { success: boolean; reason?: string },
    playerConfig: any
  ) => {
    // Restart the game initialization process
    return initializeGame(playerConfig);
  };

  return {
    isRefreshing,
    setIsRefreshing,
    getAvailableWordCount,
    getRandomWordPair,
    handleRefreshWords,
    checkWordsAvailable,
    handleWordsUpdated
  };
};