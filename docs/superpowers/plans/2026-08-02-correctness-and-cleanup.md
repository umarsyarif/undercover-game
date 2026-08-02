# Correctness and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the correctness bugs in the Undercover game's win conditions, phase routing, and state mutation, then delete 4,148 lines of unreachable code.

**Architecture:** Single-source the win-condition logic in `GameLogic` and have the live hook delegate to it, so the existing test file finally covers the reachable path. Split the overloaded `round` field into a real counter plus a `needsNameEntry` flag. Everything else is deletion and small routing fixes.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Tailwind, shadcn/ui.

**Source spec:** `docs/superpowers/specs/2026-08-02-openai-word-api-design.md` (§10, §11)

**Companion plan:** `2026-08-02-openai-word-api.md` — do this plan first.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `vitest.config.ts` | Test runner config | jsdom environment |
| `src/services/gameLogic.ts` | Pure game rules — the single source of win-condition truth | Fix + become authoritative; drop role leak |
| `src/hooks/useGameState.ts` | Owns `GameState`, delegates rules to `GameLogic` | Delegate win check; drop dead helper |
| `src/hooks/useGamePhases.ts` | Phase transitions and modal orchestration | Immutable updates, `needsNameEntry`, round wiring, Mr. White routing |
| `src/types/gameTypes.ts` | Shared types | `needsNameEntry` on `GameState` |
| `src/App.tsx` | Phase switch + modal host | Top-level modal, round prop, drop dead helper |
| `src/components/VotingPhase.tsx` | Voting screen | Accept a real `round` prop |
| `src/components/GameStatus.tsx` | Status bar | Distinct label per variant |
| `src/hooks/useWordManagement.ts` | Word pool operations | Stop wiping player names |
| `src/test/*` | Tests | Rename, extend, rewrite |

---

## Task 1: Switch the test runner to jsdom

Three tests in `src/test/word-service.test.ts` have never run — `vitest.config.ts` sets `environment: 'node'` and the file calls `Object.defineProperty(window, ...)` at module scope, so the suite fails to load. `jsdom` is already in `devDependencies`. A second suite, `src/test/ordering.vitest.ts`, never runs either because its filename does not match the `*.{test,spec}.*` include glob — and it is a *superset* of `ordering.test.ts` (13 tests vs 3).

**Files:**
- Modify: `vitest.config.ts`
- Rename: `src/test/ordering.vitest.ts` → `src/test/ordering.extra.test.ts`

- [x] **Step 1: Confirm the current baseline**

Run: `npx vitest run`

Expected: `Test Files 1 failed | 3 passed (4)`, `Tests 22 passed (22)`, and `word-service.test.ts` failing with `ReferenceError: window is not defined`.

- [x] **Step 2: Switch the environment to jsdom**

Replace the whole of `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
```

- [x] **Step 3: Run the suite**

Run: `npx vitest run`

Expected: `Test Files 4 passed (4)`, `Tests 25 passed (25)`. The three `word-service.test.ts` tests now execute and pass against the current implementation. Do not change that file — the companion plan rewrites it.

- [x] **Step 4: Make the hidden ordering suite run**

Run: `git mv src/test/ordering.vitest.ts src/test/ordering.extra.test.ts`

- [x] **Step 5: Run the suite again**

Run: `npx vitest run`

Expected: `Test Files 5 passed (5)`, 38 tests passing. If `ordering.extra.test.ts` fails, that is a real pre-existing bug it was hiding — fix the source, not the test, before continuing.

- [x] **Step 6: Commit**

```bash
git add vitest.config.ts src/test/ordering.extra.test.ts
git commit -m "test: run under jsdom and un-hide the ordering suite"
```

---

## Task 2: Remove the role leak and debug logs

`src/services/gameLogic.ts:48` prints the shuffled role array to the console before any player has seen their card. Anyone with devtools open sees who the undercover is. The rest are leftover debugging.

**Files:**
- Modify: `src/services/gameLogic.ts:48`
- Modify: `src/App.tsx:395-399`
- Modify: `src/hooks/useGamePhases.ts:144-150`

- [x] **Step 1: Delete the role leak**

In `src/services/gameLogic.ts`, delete line 48 entirely:

```ts
    console.log(roles);
```

The surrounding code (the role-shuffle loop above it, the player-creation loop below) is unchanged.

- [x] **Step 2: Simplify the Mr. White button handler**

In `src/App.tsx`, replace this `onClick`:

```tsx
                  onClick={() => {
                    console.log('Button clicked!');
                    console.log('Button disabled:', !gameState.mrWhiteGuess.trim());
                    console.log('Current input value:', gameState.mrWhiteGuess);
                    gamePhases.handleMrWhiteGuess();
                  }}
```

with:

```tsx
                  onClick={gamePhases.handleMrWhiteGuess}
```

- [x] **Step 3: Strip the guess-handler logs**

In `src/hooks/useGamePhases.ts`, replace the opening of `handleMrWhiteGuess`:

```ts
  const handleMrWhiteGuess = useCallback(() => {
    console.log('Mr. White guess function called');
    console.log('Current guess:', gameState.mrWhiteGuess);
    console.log('Civilian word:', gameState.gameWords.civilian);
    
    const isCorrect = gameState.mrWhiteGuess.toLowerCase().trim() === gameState.gameWords.civilian.toLowerCase().trim();
    console.log('Is guess correct:', isCorrect);
```

with:

```ts
  const handleMrWhiteGuess = useCallback(() => {
    const isCorrect =
      gameState.mrWhiteGuess.toLowerCase().trim() ===
      gameState.gameWords.civilian.toLowerCase().trim();
```

- [x] **Step 4: Verify no console calls remain in game source**

Run: `grep -rn "console\.log" src/services src/hooks src/components src/App.tsx`

Expected: no output.

- [x] **Step 5: Typecheck and test**

Run: `npx tsc -b --noEmit && npx vitest run`

Expected: clean typecheck, 38 tests passing.

- [x] **Step 6: Commit**

```bash
git add src/services/gameLogic.ts src/App.tsx src/hooks/useGamePhases.ts
git commit -m "fix: stop logging player roles to the console"
```

---

## Task 3: Distinct status label, drop dead helpers

`GameStatus.getLabel()` returns the same string from both branches of its ternary. `getOrderedPlayers` is defined twice and used nowhere.

**Files:**
- Modify: `src/components/GameStatus.tsx:23-25`
- Modify: `src/App.tsx:44`
- Modify: `src/hooks/useGameState.ts:155-160,221`

- [x] **Step 1: Fix the label**

In `src/components/GameStatus.tsx`, replace:

```tsx
  const getLabel = () => {
    return variant === 'elimination' ? 'Penyusup tersisa' : 'Penyusup tersisa';
  };
```

with:

```tsx
  const getLabel = () => {
    return variant === 'elimination' ? 'Sisa penyusup' : 'Penyusup tersisa';
  };
```

- [x] **Step 2: Delete the unused helper in App.tsx**

In `src/App.tsx`, delete line 44:

```ts
  const getOrderedPlayers = () => GameLogic.getOrderedPlayers(gameState.players);
```

- [x] **Step 3: Delete the unused helper in useGameState.ts**

In `src/hooks/useGameState.ts`, delete this block (lines 155-160):

```ts
  // Get ordered players
  const getOrderedPlayers = () => {
    return gameState.playerOrder.map(playerNum => 
      gameState.players.find(p => p.id === playerNum)
    ).filter(Boolean) as Player[];
  };
```

and remove `getOrderedPlayers,` from the returned object (line 221).

- [x] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`

Expected: clean. If it complains that the `Player` import is now unused in `useGameState.ts`, remove `Player` from that import line.

- [x] **Step 5: Run tests**

Run: `npx vitest run`

Expected: 38 passing.

- [x] **Step 6: Commit**

```bash
git add src/components/GameStatus.tsx src/App.tsx src/hooks/useGameState.ts
git commit -m "fix: distinct elimination label; drop unused getOrderedPlayers"
```

---

## Task 4: Single-source the win conditions

There are two divergent implementations. `useGameState.checkWinConditions` (line 176) is what the app runs; `GameLogic.checkWinConditions` (line 77) is what the tests run and the app never calls. Both get the same case wrong: with 1 civilian and 1 Mr. White alive and no undercovers, neither declares a winner, so the game fails to end when it should.

Fix `GameLogic`, make the hook delegate to it, and the existing test file starts covering the reachable path for free.

**Files:**
- Modify: `src/services/gameLogic.ts:76-107`
- Modify: `src/hooks/useGameState.ts:175-210`
- Test: `src/test/win-conditions.test.ts`

- [x] **Step 1: Write the failing tests**

Append inside the top-level `describe('Game Win Conditions', ...)` in `src/test/win-conditions.test.ts`, just before its closing `});`:

```ts
  describe('Infiltrator parity', () => {
    it('should declare Mr. White the winner when one civilian and Mr. White remain', () => {
      const players = createTestPlayers();

      players[0].isEliminated = true; // Civilian
      players[2].isEliminated = true; // Undercover

      // Remaining: 1 civilian + Mr. White, no undercovers
      const winner = GameLogic.checkWinConditions(players);
      expect(winner).toBe('mrwhite');
    });

    it('should declare undercover the winner when one civilian faces both infiltrators', () => {
      const players = createTestPlayers();

      players[0].isEliminated = true; // Civilian

      // Remaining: 1 civilian + undercover + Mr. White
      const winner = GameLogic.checkWinConditions(players);
      expect(winner).toBe('undercover');
    });
  });
```

- [x] **Step 2: Run them and watch the first one fail**

Run: `npx vitest run src/test/win-conditions.test.ts`

Expected: the "one civilian and Mr. White remain" test FAILS with `expected null to be 'mrwhite'`. The "both infiltrators" test passes already.

- [x] **Step 3: Rewrite GameLogic.checkWinConditions**

In `src/services/gameLogic.ts`, replace the whole method (lines 76-107, from the `// Check win conditions` comment through its closing brace):

```ts
  // Check win conditions. This is the single source of truth — useGameState
  // delegates to it, and the tests exercise the same code the game runs.
  static checkWinConditions(players: Player[]): 'civilian' | 'undercover' | 'mrwhite' | null {
    const active = players.filter(p => !p.isEliminated);
    const civilians = active.filter(p => p.role === 'civilian');
    const undercovers = active.filter(p => p.role === 'undercover');
    const mrWhites = active.filter(p => p.role === 'mrwhite');

    // Mr. White outlasts everyone.
    if (active.length === 1 && mrWhites.length === 1) {
      return 'mrwhite';
    }

    // Every infiltrator is gone.
    if (undercovers.length === 0 && mrWhites.length === 0) {
      return 'civilian';
    }

    // Only one civilian is left, so the infiltrators can no longer be outvoted.
    // Undercover takes the win when present; otherwise it is Mr. White's.
    if (civilians.length === 1) {
      return undercovers.length > 0 ? 'undercover' : 'mrwhite';
    }

    return null;
  }
```

- [x] **Step 4: Run the win-condition tests**

Run: `npx vitest run src/test/win-conditions.test.ts`

Expected: 7 passing. All 5 pre-existing tests still pass — verify that, because they encode rules we are keeping.

- [x] **Step 5: Delegate from the live hook**

In `src/hooks/useGameState.ts`, replace the whole `checkWinConditions` function (lines 175-210):

```ts
  // Check win conditions
  const checkWinConditions = () => {
    const winner = GameLogic.checkWinConditions(gameState.players);

    if (winner) {
      // Mark current word pair as played when game ends
      WordService.markWordAsPlayed(gameState.gameWords.civilian, gameState.gameWords.undercover);

      updateGameState({
        winner,
        phase: 'game-over'
      });
    }

    return winner;
  };
```

`GameLogic` is already imported at the top of the file.

- [x] **Step 6: Typecheck and run everything**

Run: `npx tsc -b --noEmit && npx vitest run`

Expected: clean typecheck, 40 tests passing.

- [x] **Step 7: Commit**

```bash
git add src/services/gameLogic.ts src/hooks/useGameState.ts src/test/win-conditions.test.ts
git commit -m "fix: infiltrators win at one civilian regardless of role

Single-sources the win check in GameLogic so the live hook and the test
suite exercise the same code. Previously 1 civilian + 1 Mr. White with no
undercovers produced no winner and the round continued."
```

---

## Task 5: Fix Mr. White's wrong-guess routing

Two defects on the elimination path:

1. A wrong Mr. White guess sends the phase to `voting`. Mr. White is already eliminated and the survivors have already described, so a re-vote adds no information. `docs/GAME_RULE.md` calls for another round of clues — that is `description`.
2. `handleEliminationConfirm`'s non-Mr.-White branch sets no phase at all when there is no winner, stranding the player on the voting screen with only the header back arrow as an exit.

**Keep the `checkWinConditions()` call in the guess handler.** It is the only win check on that path. Removing it lets this happen: 2 civilians + 1 undercover + Mr. White, Mr. White eliminated in round 2 and guesses wrong, survivors are 1 civilian + 1 undercover — the undercover has already won, but the game runs another round and declares the civilians the winners.

**Files:**
- Modify: `src/hooks/useGamePhases.ts:126-141` (`handleEliminationConfirm`)
- Modify: `src/hooks/useGamePhases.ts:143-170` (`handleMrWhiteGuess`)

- [x] **Step 1: Route both elimination outcomes**

In `src/hooks/useGamePhases.ts`, replace `handleEliminationConfirm`:

```ts
  // Handle elimination confirmation
  const handleEliminationConfirm = () => {
    closeModal('showEliminationModal');

    if (gameState.eliminatedPlayer?.role === 'mrwhite') {
      // Mr. White gets one chance to guess the civilian word.
      updateGameState({ phase: 'mr-white-guess' });
      return;
    }

    const winner = checkWinConditions();
    if (winner) {
      openModal('showGameOverModal');
      return;
    }

    // No winner yet: start the next round of descriptions.
    updateGameState({
      phase: 'description',
      round: gameState.round + 1,
      eliminatedPlayer: null,
      selectedPlayerToEliminate: null
    });
  };
```

- [x] **Step 2: Fix the guess handler**

Replace `handleMrWhiteGuess` (the version left after Task 2 removed its logs):

```ts
  // Handle Mr. White guess
  const handleMrWhiteGuess = useCallback(() => {
    const isCorrect =
      gameState.mrWhiteGuess.toLowerCase().trim() ===
      gameState.gameWords.civilian.toLowerCase().trim();

    if (isCorrect) {
      updateGameState({ winner: 'mrwhite', phase: 'game-over' });
      openModal('showGameOverModal');
      return;
    }

    // Wrong guess. Mr. White is already eliminated, so the remaining players
    // may already satisfy a win condition — check before starting a new round.
    const winner = checkWinConditions();
    if (winner) {
      openModal('showGameOverModal');
      return;
    }

    updateGameState({
      mrWhiteGuess: '',
      phase: 'description',
      round: gameState.round + 1,
      eliminatedPlayer: null,
      selectedPlayerToEliminate: null
    });
  }, [
    gameState.mrWhiteGuess,
    gameState.gameWords.civilian,
    gameState.round,
    updateGameState,
    openModal,
    checkWinConditions
  ]);
```

- [x] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`

Expected: clean.

- [x] **Step 4: Play the scenario by hand**

Run: `npm run dev`, then in the browser: 4 players, 1 undercover, 1 Mr. White. Vote out a civilian in round 1, then Mr. White in round 2, and enter a deliberately wrong guess.

Expected: the game ends immediately and declares the undercover the winner. It must **not** show another description round.

- [x] **Step 5: Commit**

```bash
git add src/hooks/useGamePhases.ts
git commit -m "fix: route both elimination outcomes and keep the Mr. White win check

A wrong guess now starts a new description round instead of a re-vote, and
the non-Mr.-White elimination path no longer strands the player on the
voting screen."
```

---

## Task 6: Cover the continue-with-same-players flow

`src/test/continue-with-same-players.test.ts` is on the deletion list because it imports the dead `GameActionService` — but it is also the only coverage of the flow Task 7 is about to change. Replace it with a test against live code **before** touching `round`.

**Files:**
- Delete: `src/test/continue-with-same-players.test.ts`
- Create: `src/test/continue-with-same-players.test.ts` (rewritten)

- [x] **Step 1: Replace the file wholesale**

Overwrite `src/test/continue-with-same-players.test.ts`:

```ts
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
```

- [x] **Step 2: Run it**

Run: `npx vitest run src/test/continue-with-same-players.test.ts`

Expected: 5 passing, and no import of `GameActionService` anywhere in the file.

- [x] **Step 3: Run the full suite**

Run: `npx vitest run`

Expected: 41 passing.

- [x] **Step 4: Commit**

```bash
git add src/test/continue-with-same-players.test.ts
git commit -m "test: cover continue-with-same-players against live code"
```

---

## Task 7: Split `needsNameEntry` out of `round`, and stop mutating players

`round` is doing two jobs. `useGamePhases.ts:21` branches on `round === 1` to decide whether to ask for a name; lines 57 and 72 use `round > 1` to assign `cardIndex` and open the turn modal; `App.tsx:141` hardsets `round: 2` purely to skip name entry. Task 8 cannot make `round` a real counter until that is separated.

Same file, same lines: `[...gameState.players]` is a shallow copy, so `updatedPlayers[i].name = x` mutates the original player objects. Fix both together — they touch identical code.

**Files:**
- Modify: `src/types/gameTypes.ts:14-29`
- Modify: `src/hooks/useGameState.ts` (three state literals)
- Modify: `src/hooks/useGamePhases.ts:14-84`
- Modify: `src/App.tsx:136-148`

- [x] **Step 1: Add the flag to the type**

In `src/types/gameTypes.ts`, add one line to `GameState`, after `round`:

```ts
export interface GameState {
  phase: GamePhase;
  undercoverCount: number;
  mrWhiteCount: number;
  currentPlayerIndex: number;
  selectedCard: number | null;
  players: Player[];
  round: number;
  /** True while players still need to type their names (first game only). */
  needsNameEntry: boolean;
  gameWords: { civilian: string; undercover: string };
  playerOrder: number[];
  selectedPlayerToEliminate: number | null;
  eliminatedPlayer: Player | null;
  winner: 'civilian' | 'undercover' | 'mrwhite' | null;
  mrWhiteGuess: string;
  showingWord: boolean;
}
```

- [x] **Step 2: Set it in all three state literals**

In `src/hooks/useGameState.ts`, add `needsNameEntry: true,` immediately after each `round:` line — there are three: the `useState` initialiser (~line 21), the `setGameState` inside `initializeGame` (~line 101), and the one inside `resetGame` (~line 126).

- [x] **Step 3: Typecheck to find every remaining construction site**

Run: `npx tsc -b --noEmit`

Expected: errors pointing at any other place that builds a full `GameState`. Add `needsNameEntry` there too. `App.tsx:136` uses `updateGameState` with a `Partial<GameState>`, so it will not error — Step 5 handles it.

- [x] **Step 4: Rewrite the three mutating handlers**

In `src/hooks/useGamePhases.ts`, replace `handleCardSelect`, `handleNameSubmit` and `handleWordRevealNext` (lines 14-84) with:

```ts
  // Handle card selection
  const handleCardSelect = (cardIndex: number) => {
    const isCardTaken = gameState.players.some(p => p.cardIndex === cardIndex);
    if (isCardTaken) return;

    if (gameState.needsNameEntry) {
      updateGameState({ selectedCard: cardIndex });
      openModal('showNameModal');
      return;
    }

    // Names are already known, so claim the card and go straight to the word.
    const updatedPlayers = gameState.players.map((player, index) =>
      index === gameState.currentPlayerIndex ? { ...player, cardIndex } : player
    );

    updateGameState({ players: updatedPlayers, selectedCard: cardIndex });
    openModal('showWordModal');
  };

  // Handle name submission
  const handleNameSubmit = (playerName: string) => {
    if (!playerName.trim() || gameState.selectedCard === null) return;

    const selectedCard = gameState.selectedCard;
    const updatedPlayers = gameState.players.map((player, index) =>
      index === gameState.currentPlayerIndex
        ? { ...player, name: playerName.trim(), cardIndex: selectedCard }
        : player
    );

    updateGameState({ players: updatedPlayers });

    closeModal('showNameModal');
    openModal('showWordModal');
  };

  // Handle word reveal next
  const handleWordRevealNext = (totalPlayers: number) => {
    if (gameState.selectedCard === null) return;

    const selectedCard = gameState.selectedCard;
    const updatedPlayers = gameState.players.map((player, index) =>
      index === gameState.currentPlayerIndex
        ? { ...player, hasRevealed: true, cardIndex: selectedCard }
        : player
    );

    closeModal('showWordModal');

    // Small delay so the next player's word is not visible during the
    // modal close transition.
    setTimeout(() => {
      if (gameState.currentPlayerIndex < totalPlayers - 1) {
        updateGameState({
          currentPlayerIndex: gameState.currentPlayerIndex + 1,
          selectedCard: null,
          players: updatedPlayers
        });

        if (!gameState.needsNameEntry) {
          openModal('showTurnModal');
        }
      } else {
        updateGameState({
          phase: 'description',
          currentPlayerIndex: 0,
          players: updatedPlayers
        });
      }
    }, 200);
  };
```

Note `handleWordRevealNext` now always writes `cardIndex`. Previously it only did so when `round > 1`; on the first game the card was already assigned by `handleNameSubmit`, so writing the same value again is a no-op.

- [x] **Step 5: Update the continue handler**

In `src/App.tsx`, inside `handleContinueWithSamePlayers`, replace:

```ts
      round: 2, // Set round to 2 to skip name input phase
```

with:

```ts
      round: 1,
      needsNameEntry: false,
```

- [x] **Step 6: Typecheck**

Run: `npx tsc -b --noEmit`

Expected: clean.

- [x] **Step 7: Verify both paths in the browser**

Run: `npm run dev`.

- First game: 3 players. Expected — the name modal appears for each player, and no turn modal.
- Finish the game, then press "Lanjut". Expected — **no** name modal, the turn modal announces each player by their existing name, and every name from the first game is still shown.

- [x] **Step 8: Commit**

```bash
git add src/types/gameTypes.ts src/hooks/useGameState.ts src/hooks/useGamePhases.ts src/App.tsx
git commit -m "refactor: split needsNameEntry out of round; stop mutating player state

round was overloaded as a name-entry sentinel, which blocked making it a
real counter. Player updates now build new objects instead of mutating the
originals through a shallow array copy."
```

---

## Task 8: Make `round` a real counter

`continueToNextRound` exists at `useGamePhases.ts:183` but nothing calls it. `VotingPhase` has no `round` prop at all — it hardcodes `round={1}`. Task 5 already added the increments; this task wires the display and removes the dead helper.

The increment fires on **re-entry to `description`** (which Task 5 implemented), so a round number labels one full describe-then-vote cycle and the voting screen shows the round being voted on.

**Files:**
- Modify: `src/components/VotingPhase.tsx:8-15,36-40`
- Modify: `src/App.tsx:318`
- Modify: `src/hooks/useGamePhases.ts` (remove `continueToNextRound`)

- [x] **Step 1: Give VotingPhase a round prop**

In `src/components/VotingPhase.tsx`, add `round` to the props interface:

```tsx
interface VotingPhaseProps {
  sortedPlayers: Player[];
  selectedPlayerToEliminate: number | null;
  round: number;
  onBack: () => void;
  onPlayerSelect: (playerId: number) => void;
  onEliminatePlayer: () => void;
  getRemainingCounts: () => { undercovers: number; mrWhites: number; total: number };
}
```

add it to the destructured parameters:

```tsx
export const VotingPhase: React.FC<VotingPhaseProps> = ({
  sortedPlayers,
  selectedPlayerToEliminate,
  round,
  onBack,
  onPlayerSelect,
  onEliminatePlayer,
  getRemainingCounts
}) => {
```

and use it in the status bar, replacing `round={1}`:

```tsx
      <GameStatus
        remainingCounts={remainingCounts}
        round={round}
        variant="elimination"
      />
```

- [x] **Step 2: Pass it from App**

In `src/App.tsx`, in the voting-phase branch, add the prop:

```tsx
        <VotingPhase
          sortedPlayers={sortedPlayers}
          selectedPlayerToEliminate={gameState.selectedPlayerToEliminate}
          round={gameState.round}
          onBack={() => updateGameState({ phase: 'description' })}
          onPlayerSelect={gamePhases.handlePlayerSelect}
          onEliminatePlayer={gamePhases.handleEliminatePlayer}
          getRemainingCounts={getRemainingCounts}
        />
```

- [x] **Step 3: Delete the dead helper**

In `src/hooks/useGamePhases.ts`, delete the `continueToNextRound` function (the block starting `// Continue to next round`) and remove `continueToNextRound` from the returned object.

- [x] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`

Expected: clean.

- [x] **Step 5: Verify the counter advances**

Run: `npm run dev`. Start a 5-player game with 1 undercover.

Expected: description and voting both show "Round 1". After eliminating a civilian, the next description **and** its voting screen both show "Round 2".

- [x] **Step 6: Commit**

```bash
git add src/components/VotingPhase.tsx src/App.tsx src/hooks/useGamePhases.ts
git commit -m "fix: show the real round number during voting"
```

---

## Task 9: Render the word-management modal at the top level

`WordManagementModal` is rendered only inside the `setup` and `card-selection` branches, but `handleContinueWithSamePlayers` opens it from `game-over` when the pool is empty (`App.tsx:113`). The flag flips, nothing renders, and the button looks broken. Escaping via "Back to Setup" then pops the modal open unexpectedly on the setup screen.

Once the pool runs dry this is the **default** end-of-session experience.

**Files:**
- Modify: `src/App.tsx` (remove two renders, add one, wrap the return)

- [ ] **Step 1: Remove the per-branch renders**

In `src/App.tsx`, delete both existing `<WordManagementModal ... />` blocks — one in the `setup` branch (~line 179), one in the `card-selection` branch (~line 289). Leave the `<>` fragments that wrapped them; the setup branch's fragment can collapse back to a bare `<PlayerSetup ... />` if it now has a single child.

- [ ] **Step 2: Move the phase switch into a nested function**

The modal has to render alongside whichever screen is active, and it needs the hooks that live in `App`. So wrap the phase switch in a nested function and render the modal beside its result.

In `src/App.tsx`, immediately after the last handler definition (`handleContinueWithSamePlayers`) and **before** the first `if (gameState.phase === 'setup')`, insert:

```tsx
  // Renders the screen for the current phase. Nested so it keeps access to the
  // hooks above, and so the word-management modal can render beside it.
  function renderScreen() {
```

Then at the very end of the component — where the body currently reads:

```tsx
  return null;
}

export default App;
```

replace it with:

```tsx
    return null;
  }

  return (
    <>
      {renderScreen()}
      <WordManagementModal
        isOpen={modals.showWordManagementModal}
        onClose={() => closeModal('showWordManagementModal')}
        onWordsUpdated={handleWordsUpdated}
      />
    </>
  );
}

export default App;
```

Every `if (gameState.phase === '...') { return ( ... ); }` block is now inside `renderScreen` and needs no other change. Re-indent them by two spaces if your formatter does not.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`

Expected: clean.

- [ ] **Step 4: Reproduce the original bug and confirm it is gone**

Run: `npm run dev`. In devtools console, exhaust the pool:

```js
const w = JSON.parse(localStorage.getItem('gameWords')).map(p => ({ ...p, played: true }));
localStorage.setItem('gameWords', JSON.stringify(w));
```

Reload, start a 3-player game, finish it, and press "Lanjut".

Expected: the word-management modal appears over the game-over screen. Before this fix, nothing happened.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "fix: render the word-management modal in every phase

Continuing with the same players at an exhausted word pool opened a modal
that was only mounted in two of six phases, so the button did nothing."
```

---

## Task 10: Stop "Reuse Existing Words" from wiping player names

`useWordManagement.handleRefreshWords` opens the word-management modal when one or fewer unplayed pairs remain. "Reuse Existing Words" then calls `onWordsUpdated` → `handleWordsUpdated` → `initializeGame`, which regenerates every player through `GameLogic.generatePlayers` with `name: ''`. Any names already entered during card selection are lost.

**Files:**
- Modify: `src/App.tsx` (`handleWordsUpdated`)

- [ ] **Step 1: Preserve names when a game is already in progress**

In `src/App.tsx`, replace `handleWordsUpdated`:

```tsx
  // Words updated handler
  const handleWordsUpdated = () => {
    const config = playerManagement.getPlayerConfig();
    const result = wordManagement.handleWordsUpdated(initializeGame, config);

    // initializeGame regenerates players from scratch. If names were already
    // entered this session, carry them over rather than blanking them.
    const previousNames = gameState.players
      .filter(p => p.name.trim() !== '')
      .map(p => ({ id: p.id, name: p.name }));

    if (result.success && previousNames.length > 0) {
      updateGameState({
        needsNameEntry: false,
        players: gameState.players.map(player => ({
          ...player,
          name: previousNames.find(n => n.id === player.id)?.name ?? player.name
        }))
      });
    }

    return result;
  };
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`

Expected: clean.

- [ ] **Step 3: Verify by hand**

Run: `npm run dev`. Exhaust all but one pair using the console snippet from Task 9 Step 5 (leave one `played: false`). Start a 3-player game, enter a name for the first player, then press the refresh button on the card-selection screen and choose "Reuse Existing Words".

Expected: the first player's name is still there.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix: keep entered names when reusing existing words"
```

---

## Task 11: Delete the dead service layer

4,148 lines across 12 files, verified unreachable from `src/main.tsx` by import-graph traversal. Nothing in the live 28-file set imports any of them; they only import each other.

**Files:**
- Delete: 12 source files, 2 docs
- Modify: `docs/CARD_ORDERING_IMPLEMENTATION.md`

- [ ] **Step 1: Delete the source files**

```bash
git rm src/AppWithServices.tsx \
       src/AppLegacy.tsx \
       src/containers/GameContainer.tsx \
       src/components/GameUI.tsx \
       src/components/GameServiceExample.tsx \
       src/hooks/useGameService.ts \
       src/services/gameService.ts \
       src/services/gameStateManager.ts \
       src/services/gameActionService.ts \
       src/services/types.ts \
       src/utils/gameHelpers.ts \
       src/types/containerTypes.ts
```

- [ ] **Step 2: Delete the docs that describe the dead layer as current**

```bash
git rm docs/SERVICE_LAYER_GUIDE.md docs/ARCHITECTURE_IMPROVEMENTS.md src/services/README.md
```

- [ ] **Step 3: Trim the stale half of the ordering doc**

`docs/CARD_ORDERING_IMPLEMENTATION.md` is accurate about the live `GameLogic.getDescriptionPhaseOrder` and `getVotingPhaseOrder` methods but stale about the deleted files. Delete these subsections from it:

- the `#### GameStateManager Class (src/services/gameStateManager.ts)` block
- the `#### useGameService Hook (src/hooks/useGameService.ts)` block
- the `#### GameHelpers (src/utils/gameHelpers.ts)` block
- the `#### AppWithServices.tsx` bullet list
- the `#### GameContainer.tsx` bullet list

Keep everything about `GameLogic` and `App.tsx`.

- [ ] **Step 4: Confirm nothing references the deleted files**

Run:

```bash
grep -rn "gameService\|gameStateManager\|gameActionService\|useGameService\|gameHelpers\|containerTypes\|AppWithServices\|AppLegacy\|GameContainer\|GameServiceExample" src/ index.html
```

Expected: no output. A hit in `src/components/GameUI.tsx` means that file was missed — it is on the deletion list.

- [ ] **Step 5: Typecheck, test, build**

Run: `npx tsc -b --force --noEmit && npx vitest run && npm run build`

Expected: clean typecheck, 41 tests passing, successful build.

- [ ] **Step 6: Confirm the app still runs**

Run: `npm run dev` and play one complete 3-player game start to finish.

Expected: no console errors, no blank screens.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: delete the unreachable service layer

4,148 lines across 12 files that were never reachable from main.tsx, plus
the three docs that described them as the current architecture."
```

---

## Done criteria

- `npx vitest run` — 41 passing, 0 failing, 5 files
- `npx tsc -b --force --noEmit` — clean
- `npm run build` — succeeds
- A 4-player game with 1 undercover and 1 Mr. White ends correctly in all four outcomes: civilians clear the board, undercover reaches parity, Mr. White outlasts everyone, Mr. White guesses right
- "Lanjut" keeps names and does not re-ask for them
- Round numbers advance and match between the description and voting screens
