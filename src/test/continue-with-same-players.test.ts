import { describe, it, expect, beforeEach } from 'vitest';
import { GameLogic } from '../services/gameLogic';
import type { Player } from '../types/gameTypes';

/**
 * "Lanjut" (continue with the same players) re-rolls roles and words while
 * keeping every player's name and id. These tests pin that contract.
 */
describe('Continue with same players', () => {
  const namedPlayers = (): Player[] => [
    { id: 1, name: 'Ana',  role: 'civilian',   word: 'Kopi', cardIndex: 0, hasRevealed: true, isEliminated: false },
    { id: 2, name: 'Budi', role: 'civilian',   word: 'Kopi', cardIndex: 1, hasRevealed: true, isEliminated: true  },
    { id: 3, name: 'Citra', role: 'undercover', word: 'Teh', cardIndex: 2, hasRevealed: true, isEliminated: false },
    { id: 4, name: 'Dedi', role: 'mrwhite',    word: '',     cardIndex: 3, hasRevealed: true, isEliminated: false },
  ];

  beforeEach(() => {
    GameLogic.resetRandomStart();
  });

  it('clears elimination, reveal and card state for the new round', () => {
    const generated = GameLogic.generatePlayers(4, 1, 1, {
      civilian: 'Bakso',
      undercover: 'Siomay',
    });

    expect(generated.every(p => p.isEliminated === false)).toBe(true);
    expect(generated.every(p => p.hasRevealed === false)).toBe(true);
    expect(generated.every(p => p.cardIndex === -1)).toBe(true);
  });

  it('assigns the requested role counts and the new word pair', () => {
    const generated = GameLogic.generatePlayers(4, 1, 1, {
      civilian: 'Bakso',
      undercover: 'Siomay',
    });

    expect(generated.filter(p => p.role === 'undercover')).toHaveLength(1);
    expect(generated.filter(p => p.role === 'mrwhite')).toHaveLength(1);
    expect(generated.filter(p => p.role === 'civilian')).toHaveLength(2);

    for (const p of generated) {
      if (p.role === 'civilian')   expect(p.word).toBe('Bakso');
      if (p.role === 'undercover') expect(p.word).toBe('Siomay');
      if (p.role === 'mrwhite')    expect(p.word).toBe('');
    }
  });

  it('resetRandomStart clears the cached start player and direction', () => {
    const players = namedPlayers().map(p => ({ ...p, isEliminated: false }));

    const withRandom = (values: number[]) => {
      const original = Math.random;
      let i = 0;
      Math.random = () => values[Math.min(i++, values.length - 1)];
      try {
        GameLogic.resetRandomStart();
        return GameLogic.getDescriptionPhaseOrder(players).map(p => p.id);
      } finally {
        Math.random = original;
      }
    };

    // First value picks the start player, second picks the direction.
    const forwardFromFirst = withRandom([0, 0]);
    const backwardFromLast = withRandom([0.99, 0.99]);

    expect(forwardFromFirst).not.toEqual(backwardFromLast);

    // Without a reset the cached choice is reused, so the order is stable.
    const stableA = GameLogic.getDescriptionPhaseOrder(players).map(p => p.id);
    const stableB = GameLogic.getDescriptionPhaseOrder(players).map(p => p.id);
    expect(stableA).toEqual(stableB);
  });

  it('never starts the speaking order with Mr. White', () => {
    const players = namedPlayers().map(p => ({ ...p, isEliminated: false }));

    for (let i = 0; i < 30; i++) {
      GameLogic.resetRandomStart();
      const order = GameLogic.getDescriptionPhaseOrder(players);
      expect(order[0].role).not.toBe('mrwhite');
    }
  });

  describe('refreshing words mid-setup', () => {
    it('carries names onto freshly generated players without restoring old roles', () => {
      const previous: Player[] = [
        { id: 1, name: 'Ana',  role: 'undercover', word: 'Teh',  cardIndex: 2, hasRevealed: true, isEliminated: true },
        { id: 2, name: 'Budi', role: 'civilian',   word: 'Kopi', cardIndex: 0, hasRevealed: true, isEliminated: false },
        { id: 3, name: 'Citra', role: 'mrwhite',   word: '',     cardIndex: 1, hasRevealed: true, isEliminated: false },
      ];

      const fresh = GameLogic.generatePlayers(3, 1, 0, {
        civilian: 'Bakso',
        undercover: 'Siomay',
      });

      const carried = fresh.map(p => ({
        ...p,
        name: previous.find(o => o.id === p.id)?.name ?? '',
      }));

      // Names survive...
      expect(carried.map(p => p.name)).toEqual(['Ana', 'Budi', 'Citra']);

      // ...and nothing else does.
      expect(carried.every(p => p.isEliminated === false)).toBe(true);
      expect(carried.every(p => p.hasRevealed === false)).toBe(true);
      expect(carried.every(p => p.cardIndex === -1)).toBe(true);
      expect(carried.filter(p => p.role === 'mrwhite')).toHaveLength(0);
      expect(carried.every(p => p.word !== 'Kopi' && p.word !== 'Teh')).toBe(true);
    });
  });
});
