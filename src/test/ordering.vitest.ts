import { describe, it, expect } from 'vitest';
import { GameLogic } from '../services/gameLogic';
import type { Player } from '../types/gameTypes';

describe('Card Ordering Logic', () => {
  // Test data: 5 players with different IDs
  const createTestPlayers = (): Player[] => [
    {
      id: 1,
      name: 'Player 1',
      role: 'civilian',
      word: 'test',
      cardIndex: 2, // Selected card 2
      hasRevealed: true,
      isEliminated: false
    },
    {
      id: 2,
      name: 'Player 2',
      role: 'civilian',
      word: 'test',
      cardIndex: 0, // Selected card 0 (first)
      hasRevealed: true,
      isEliminated: false
    },
    {
      id: 3,
      name: 'Player 3',
      role: 'undercover',
      word: 'test2',
      cardIndex: 4, // Selected card 4 (last)
      hasRevealed: true,
      isEliminated: false
    },
    {
      id: 4,
      name: 'Player 4',
      role: 'civilian',
      word: 'test',
      cardIndex: 1, // Selected card 1
      hasRevealed: true,
      isEliminated: false
    },
    {
      id: 5,
      name: 'Player 5',
      role: 'civilian',
      word: 'test',
      cardIndex: 3, // Selected card 3
      hasRevealed: true,
      isEliminated: false
    }
  ];

  describe('Description Phase Ordering', () => {
    it('should order players by ID in ascending order', () => {
      const players = createTestPlayers();
      const orderedPlayers = GameLogic.getDescriptionPhaseOrder(players);
      
      const playerIds = orderedPlayers.map(p => p.id);
      expect(playerIds).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Voting Phase Ordering', () => {
    it('should maintain player ID order when no players are eliminated', () => {
      const players = createTestPlayers();
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      const playerIds = votingOrder.map(p => p.id);
      expect(playerIds).toEqual([1, 2, 3, 4, 5]);
    });

    it('should push eliminated players to the end while maintaining ID order', () => {
      const players = createTestPlayers();
      // Eliminate players 2 and 4
      players[1].isEliminated = true; // Player 2
      players[3].isEliminated = true; // Player 4
      
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      // Active players should come first in ID order
      const activeIds = votingOrder.filter(p => !p.isEliminated).map(p => p.id);
      expect(activeIds).toEqual([1, 3, 5]);
      
      // Eliminated players should be at the end in ID order
      const eliminatedIds = votingOrder.filter(p => p.isEliminated).map(p => p.id);
      expect(eliminatedIds).toEqual([2, 4]);
    });
  });
}); 