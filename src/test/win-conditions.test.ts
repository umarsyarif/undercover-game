import { describe, it, expect } from 'vitest';
import { GameLogic } from '../services/gameLogic';
import type { Player } from '../types/gameTypes';

describe('Game Win Conditions', () => {
  // Helper function to create test players
  const createTestPlayers = (): Player[] => [
    {
      id: 1,
      name: 'Player 1',
      role: 'civilian',
      word: 'test',
      cardIndex: 0,
      hasRevealed: true,
      isEliminated: false
    },
    {
      id: 2,
      name: 'Player 2',
      role: 'civilian',
      word: 'test',
      cardIndex: 1,
      hasRevealed: true,
      isEliminated: false
    },
    {
      id: 3,
      name: 'Player 3',
      role: 'undercover',
      word: 'test2',
      cardIndex: 2,
      hasRevealed: true,
      isEliminated: false
    },
    {
      id: 4,
      name: 'Player 4',
      role: 'mrwhite',
      word: '',
      cardIndex: 3,
      hasRevealed: true,
      isEliminated: false
    }
  ];

  describe('Civilian Win Condition', () => {
    it('should declare civilians as winners when all undercovers and Mr. White are eliminated', () => {
      const players = createTestPlayers();
      
      // Eliminate undercover and Mr. White players
      players[2].isEliminated = true; // Undercover
      players[3].isEliminated = true; // Mr. White
      
      const winner = GameLogic.checkWinConditions(players);
      expect(winner).toBe('civilian');
    });
  });

  describe('Undercover Win Condition', () => {
    it('should declare undercover as winner when they equal or outnumber civilians', () => {
      const players = createTestPlayers();
      
      // Eliminate one civilian and Mr. White
      players[0].isEliminated = true; // Civilian
      players[3].isEliminated = true; // Mr. White
      
      const winner = GameLogic.checkWinConditions(players);
      expect(winner).toBe('undercover');
    });
  });

  describe('Mr. White Win Conditions', () => {
    it('should declare Mr. White as winner when they are the last player standing', () => {
      const players = createTestPlayers();
      
      // Eliminate all players except Mr. White
      players[0].isEliminated = true; // Civilian
      players[1].isEliminated = true; // Civilian
      players[2].isEliminated = true; // Undercover
      
      const winner = GameLogic.checkWinConditions(players);
      expect(winner).toBe('mrwhite');
    });
    
    it('should not declare a winner when Mr. White is still alive with other players', () => {
      const players = createTestPlayers();
      
      // Eliminate undercover only
      players[2].isEliminated = true; // Undercover
      
      const winner = GameLogic.checkWinConditions(players);
      expect(winner).toBeNull();
    });
  });

  describe('No Win Condition', () => {
    it('should return null when no win condition is met', () => {
      const players = createTestPlayers();
      
      // No players eliminated
      const winner = GameLogic.checkWinConditions(players);
      expect(winner).toBeNull();
    });
  });
}); 