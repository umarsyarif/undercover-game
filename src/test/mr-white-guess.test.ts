import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGamePhases } from '../hooks/useGamePhases';
import type { GameState, Player } from '../types/gameTypes';

const player = (id: number, role: Player['role'], isEliminated = false): Player => ({
  id,
  name: `P${id}`,
  role,
  word: role === 'mrwhite' ? '' : 'Kopi',
  cardIndex: id - 1,
  hasRevealed: true,
  isEliminated,
});

const stateWith = (guess: string): GameState => ({
  phase: 'mr-white-guess',
  undercoverCount: 1,
  mrWhiteCount: 1,
  currentPlayerIndex: 0,
  selectedCard: null,
  players: [
    player(1, 'civilian'),
    player(2, 'civilian'),
    player(3, 'undercover'),
    player(4, 'mrwhite', true), // already voted out
  ],
  round: 2,
  gameWords: { civilian: 'Kopi', undercover: 'Teh' },
  playerOrder: [],
  selectedPlayerToEliminate: null,
  eliminatedPlayer: player(4, 'mrwhite', true),
  winner: null,
  mrWhiteGuess: guess,
  showingWord: false,
});

const run = (guess: string) => {
  const updateGameState = vi.fn();
  const checkWinConditions = vi.fn(() => null);
  const declareWinner = vi.fn();
  const openModal = vi.fn();

  const { result } = renderHook(() =>
    useGamePhases(
      stateWith(guess),
      updateGameState,
      checkWinConditions,
      declareWinner,
      openModal,
      vi.fn()
    )
  );

  result.current.handleMrWhiteGuess();

  return { updateGameState, checkWinConditions, declareWinner, openModal };
};

describe('Mr. White guesses the civilian word', () => {
  it('ends the game through declareWinner so the pair is marked played', () => {
    // The bug this pins: the correct-guess path used to call updateGameState
    // directly, which set phase: 'game-over' without marking the word played.
    // "Lanjut" then drew from a pool that still contained it, so the next game
    // could reuse the same pair.
    const { declareWinner, updateGameState } = run('Kopi');

    expect(declareWinner).toHaveBeenCalledWith('mrwhite');

    // Nothing should set game-over behind declareWinner's back.
    for (const [arg] of updateGameState.mock.calls) {
      expect(arg?.phase).not.toBe('game-over');
    }
  });

  it('matches the word case-insensitively and ignores surrounding space', () => {
    expect(run('  kOpI  ').declareWinner).toHaveBeenCalledWith('mrwhite');
  });

  it('does not end the game on a wrong guess', () => {
    const { declareWinner, checkWinConditions } = run('Teh');

    expect(declareWinner).not.toHaveBeenCalled();
    // The remaining players may still satisfy a win condition, so it checks.
    expect(checkWinConditions).toHaveBeenCalled();
  });

  it('starts a fresh description round after a wrong guess', () => {
    const { updateGameState } = run('Bakso');

    expect(updateGameState).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'description', round: 3, mrWhiteGuess: '' })
    );
  });
});
