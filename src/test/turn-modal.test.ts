import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGamePhases } from '../hooks/useGamePhases';
import type { GameState, Player } from '../types/gameTypes';

const player = (id: number, name: string): Player => ({
  id,
  name,
  role: 'civilian',
  word: 'Kopi',
  cardIndex: -1,
  hasRevealed: false,
  isEliminated: false,
});

const stateWith = (players: Player[], currentPlayerIndex: number): GameState => ({
  phase: 'card-selection',
  undercoverCount: 1,
  mrWhiteCount: 0,
  currentPlayerIndex,
  selectedCard: 0,
  players,
  round: 1,
  gameWords: { civilian: 'Kopi', undercover: 'Teh' },
  playerOrder: [],
  selectedPlayerToEliminate: null,
  eliminatedPlayer: null,
  winner: null,
  mrWhiteGuess: '',
  showingWord: false,
});

describe('turn modal announces the NEXT player', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const revealAndAdvance = (players: Player[], currentPlayerIndex: number) => {
    const openModal = vi.fn();
    const { result } = renderHook(() =>
      useGamePhases(
        stateWith(players, currentPlayerIndex),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        openModal,
        vi.fn()
      )
    );

    result.current.handleWordRevealNext(players.length);
    vi.runAllTimers();

    return openModal;
  };

  it('stays silent when the next player has no name yet', () => {
    // The regression: player 1 is named, so a predicate reading the CURRENT
    // player would wrongly announce unnamed player 2.
    const openModal = revealAndAdvance([player(1, 'Ana'), player(2, '')], 0);

    expect(openModal).not.toHaveBeenCalledWith('showTurnModal');
  });

  it('announces the next player when they already have a name', () => {
    const openModal = revealAndAdvance([player(1, 'Ana'), player(2, 'Budi')], 0);

    expect(openModal).toHaveBeenCalledWith('showTurnModal');
  });

  it('announces nobody after the last player reveals', () => {
    const openModal = revealAndAdvance([player(1, 'Ana'), player(2, 'Budi')], 1);

    expect(openModal).not.toHaveBeenCalledWith('showTurnModal');
  });
});
