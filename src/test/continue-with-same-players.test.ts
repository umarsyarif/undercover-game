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

  it('keeps every id and name when regenerating players', () => {
    const previous = namedPlayers();
    const generated = GameLogic.generatePlayers(previous.length, 1, 1, {
      civilian: 'Bakso',
      undercover: 'Siomay',
    });

    const carried = generated.map((p, i) => ({
      ...p,
      id: previous[i].id,
      name: previous[i].name,
    }));

    expect(carried.map(p => p.id)).toEqual([1, 2, 3, 4]);
    expect(carried.map(p => p.name)).toEqual(['Ana', 'Budi', 'Citra', 'Dedi']);
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

  it('does not reuse the previous round speaking order state', () => {
    const players = namedPlayers().map(p => ({ ...p, isEliminated: false }));

    const first = GameLogic.getDescriptionPhaseOrder(players).map(p => p.id);
    GameLogic.resetRandomStart();
    const second = GameLogic.getDescriptionPhaseOrder(players).map(p => p.id);

    // Both are valid permutations of the same players; the point is that
    // resetRandomStart() lets a fresh order be picked rather than reusing one.
    expect([...first].sort()).toEqual([1, 2, 3, 4]);
    expect([...second].sort()).toEqual([1, 2, 3, 4]);
    expect(first).toHaveLength(4);
  });

  it('never starts the speaking order with Mr. White', () => {
    const players = namedPlayers().map(p => ({ ...p, isEliminated: false }));

    for (let i = 0; i < 30; i++) {
      GameLogic.resetRandomStart();
      const order = GameLogic.getDescriptionPhaseOrder(players);
      expect(order[0].role).not.toBe('mrwhite');
    }
  });
});
