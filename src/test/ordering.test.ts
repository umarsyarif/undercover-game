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
    it('should order players with a random starting point', () => {
      const players = createTestPlayers();
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const orderedPlayers = GameLogic.getDescriptionPhaseOrder(players);
      
      // All players should be present
      expect(orderedPlayers).toHaveLength(5);
      
      // All player IDs should be present
      const playerIds = orderedPlayers.map(p => p.id);
      expect(playerIds).toContain(1);
      expect(playerIds).toContain(2);
      expect(playerIds).toContain(3);
      expect(playerIds).toContain(4);
      expect(playerIds).toContain(5);
    });

    it('should maintain player information while reordering', () => {
      const players = createTestPlayers();
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const orderedPlayers = GameLogic.getDescriptionPhaseOrder(players);
      
      // Check that all players are present
      expect(orderedPlayers).toHaveLength(5);
      
      // Check that player information is preserved
      const player1 = orderedPlayers.find(p => p.id === 1);
      expect(player1).toBeDefined();
      expect(player1?.name).toBe('Player 1');
      expect(player1?.cardIndex).toBe(2);
      
      const player5 = orderedPlayers.find(p => p.id === 5);
      expect(player5).toBeDefined();
      expect(player5?.name).toBe('Player 5');
      expect(player5?.cardIndex).toBe(3);
    });

    it('should handle players with unselected cards (cardIndex -1)', () => {
      const players = createTestPlayers();
      // Make player 1 have no card selected
      players[0].cardIndex = -1;
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const orderedPlayers = GameLogic.getDescriptionPhaseOrder(players);
      
      // All players should be present
      expect(orderedPlayers).toHaveLength(5);
      
      // Player 1 should have unselected card
      const player1 = orderedPlayers.find(p => p.id === 1);
      expect(player1).toBeDefined();
      expect(player1?.cardIndex).toBe(-1);
    });

    it('should handle multiple players with unselected cards', () => {
      const players = createTestPlayers();
      // Make players 1 and 3 have no card selected
      players[0].cardIndex = -1; // Player 1
      players[2].cardIndex = -1; // Player 3
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const orderedPlayers = GameLogic.getDescriptionPhaseOrder(players);
      
      // All players should be present
      expect(orderedPlayers).toHaveLength(5);
      
      // Players 1 and 3 should have unselected cards
      const player1 = orderedPlayers.find(p => p.id === 1);
      const player3 = orderedPlayers.find(p => p.id === 3);
      expect(player1).toBeDefined();
      expect(player3).toBeDefined();
      expect(player1?.cardIndex).toBe(-1);
      expect(player3?.cardIndex).toBe(-1);
    });
  });

  describe('Voting Phase Ordering', () => {
    it('should maintain description phase order when no players are eliminated', () => {
      const players = createTestPlayers();
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const descriptionOrder = GameLogic.getDescriptionPhaseOrder(players);
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      // The voting order should match the description order when no players are eliminated
      expect(votingOrder.map(p => p.id)).toEqual(descriptionOrder.map(p => p.id));
    });

    it('should push eliminated players to the end while maintaining order', () => {
      const players = createTestPlayers();
      // Eliminate players 2 and 4
      players[1].isEliminated = true; // Player 2
      players[3].isEliminated = true; // Player 4
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      // Active and eliminated players should be separated
      const activeIds = votingOrder.filter(p => !p.isEliminated).map(p => p.id);
      const eliminatedIds = votingOrder.filter(p => p.isEliminated).map(p => p.id);
      
      // Active players should be first
      expect(activeIds).toContain(1);
      expect(activeIds).toContain(3);
      expect(activeIds).toContain(5);
      
      // Eliminated players should be at the end
      expect(eliminatedIds).toContain(2);
      expect(eliminatedIds).toContain(4);
      
      // Check that all active players come before any eliminated player
      const lastActiveIndex = votingOrder.map(p => !p.isEliminated).lastIndexOf(true);
      const firstEliminatedIndex = votingOrder.map(p => p.isEliminated).indexOf(true);
      expect(lastActiveIndex).toBeLessThan(firstEliminatedIndex);
    });

    it('should handle all players eliminated', () => {
      const players = createTestPlayers();
      // Eliminate all players
      players.forEach(player => player.isEliminated = true);
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      // All players should be eliminated
      votingOrder.forEach(player => {
        expect(player.isEliminated).toBe(true);
      });
      
      // All player IDs should be present
      const playerIds = votingOrder.map(p => p.id);
      expect(playerIds).toContain(1);
      expect(playerIds).toContain(2);
      expect(playerIds).toContain(3);
      expect(playerIds).toContain(4);
      expect(playerIds).toContain(5);
    });

    it('should handle only one player remaining active', () => {
      const players = createTestPlayers();
      // Eliminate all players except Player 1
      players[1].isEliminated = true; // Player 2
      players[2].isEliminated = true; // Player 3
      players[3].isEliminated = true; // Player 4
      players[4].isEliminated = true; // Player 5
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      // Only one active player should be first
      expect(votingOrder[0].id).toBe(1);
      expect(votingOrder[0].isEliminated).toBe(false);
      
      // All other players should be eliminated and at the end
      for (let i = 1; i < votingOrder.length; i++) {
        expect(votingOrder[i].isEliminated).toBe(true);
      }
      
      // All eliminated player IDs should be present
      const eliminatedIds = votingOrder.filter(p => p.isEliminated).map(p => p.id);
      expect(eliminatedIds).toContain(2);
      expect(eliminatedIds).toContain(3);
      expect(eliminatedIds).toContain(4);
      expect(eliminatedIds).toContain(5);
    });

    it('should maintain order when players have unselected cards', () => {
      const players = createTestPlayers();
      // Make player 1 have no card selected
      players[0].cardIndex = -1;
      // Eliminate player 2
      players[1].isEliminated = true;
      
      // Reset the random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      // Active players should come first
      const activeIds = votingOrder.filter(p => !p.isEliminated).map(p => p.id);
      expect(activeIds).toContain(1);
      expect(activeIds).toContain(3);
      expect(activeIds).toContain(4);
      expect(activeIds).toContain(5);
      
      // Eliminated player should be last
      const eliminatedIds = votingOrder.filter(p => p.isEliminated).map(p => p.id);
      expect(eliminatedIds).toEqual([2]);
    });
  });

  describe('Mr. White Ordering Rule', () => {
    it('should ensure Mr. White is never first in the description phase order', () => {
      // Create test players with one Mr. White
      const players: Player[] = [
        {
          id: 1,
          name: 'Player 1',
          role: 'mrwhite',
          word: '',
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
          role: 'civilian',
          word: 'test',
          cardIndex: 2,
          hasRevealed: true,
          isEliminated: false
        }
      ];
      
      // Reset random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      // Run the test multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const orderedPlayers = GameLogic.getDescriptionPhaseOrder(players);
        
        // First player should never be Mr. White
        expect(orderedPlayers[0].role).not.toBe('mrwhite');
        
        // Reset for next iteration
        GameLogic.resetRandomStart();
      }
    });
    
    it('should maintain the same order in voting phase with Mr. White not first', () => {
      // Create test players with one Mr. White
      const players: Player[] = [
        {
          id: 1,
          name: 'Player 1',
          role: 'mrwhite',
          word: '',
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
          role: 'civilian',
          word: 'test',
          cardIndex: 2,
          hasRevealed: true,
          isEliminated: false
        }
      ];
      
      // Reset random start to ensure consistent test behavior
      GameLogic.resetRandomStart();
      
      const descriptionOrder = GameLogic.getDescriptionPhaseOrder(players);
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      // First player should never be Mr. White in either phase
      expect(descriptionOrder[0].role).not.toBe('mrwhite');
      expect(votingOrder[0].role).not.toBe('mrwhite');
      
      // The order should be the same in both phases (since no eliminations)
      expect(votingOrder.map(p => p.id)).toEqual(descriptionOrder.map(p => p.id));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty player array', () => {
      const players: Player[] = [];
      
      const descriptionOrder = GameLogic.getDescriptionPhaseOrder(players);
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      expect(descriptionOrder).toEqual([]);
      expect(votingOrder).toEqual([]);
    });

    it('should handle single player', () => {
      const players = [createTestPlayers()[0]];
      
      const descriptionOrder = GameLogic.getDescriptionPhaseOrder(players);
      const votingOrder = GameLogic.getVotingPhaseOrder(players);
      
      expect(descriptionOrder).toHaveLength(1);
      expect(votingOrder).toHaveLength(1);
      expect(descriptionOrder[0].id).toBe(1);
      expect(votingOrder[0].id).toBe(1);
    });
  });
}); 