# Plan A Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two correctness defects and two bad tests found reviewing the `codex/correctness-cleanup` branch, so Plan A can merge.

**Architecture:** Three of the four issues come from Plan A itself; one is a pre-existing ordering hole that Plan A made reachable more often. All fixes are local — no new files, no new dependencies.

**Tech Stack:** React 18, TypeScript, Vite, Vitest.

**Branch:** apply on top of `codex/correctness-cleanup` (HEAD `00f1fc3`, 13 commits, worktree clean).

**Baseline:** 31 tests passing across 5 files, clean typecheck, successful build.

---

## Context: what the original plan got wrong

Three of these are errors in the plan document, not in the execution. The executing agent followed it correctly.

| Plan claim | Reality |
|---|---|
| `ordering.vitest.ts` is a superset of `ordering.test.ts` (13 tests vs 3) | Backwards. `ordering.test.ts` has **13**, `ordering.vitest.ts` has **3**. Renaming it added redundant coverage rather than recovering lost coverage. |
| Test totals 38 after Task 1, 41 at the end | Actual 28 and 31. The arithmetic inherited the inverted file above. |
| Verify with a 4-player game, 1 undercover, 1 Mr. White | Not startable. `isStartButtonEnabled` requires `civilians > undercover + mrWhite`; at 4 players that is `2 > 2`, false. Needs 5 players. |
| Task 10's `handleWordsUpdated` preserves names | It restores the entire previous player objects — roles, words, cards, reveal and elimination flags — over the freshly generated ones. |

**Rejected recommendation.** A review suggested relaxing `usePlayerManagement` to permit `civilians >= specialRoles` so 4/1/1 becomes valid. Do **not** do this. At 2 civilians versus 2 infiltrators, the first civilian elimination immediately satisfies the parity win condition, which is a degenerate game. The validation rule is correct; the plan's test scenario was wrong. Task 4 below fixes the scenario.

---

## Task 1: Fix player restoration when words are refreshed mid-setup

`handleWordsUpdated` calls `initializeGame(config)`, which generates fresh players through `setGameState`. It then calls `updateGameState` with players mapped from `gameState.players` — a closure captured **before** `initializeGame` ran. That writes the entire previous player objects back over the new ones: old roles, old words, old `cardIndex`, old `hasRevealed`, old `isEliminated`.

The intent was to keep names only. The fix is to carry names *inside* `initializeGame`, in one atomic state update, and derive the name prompt per player instead of from a global flag.

**Files:**
- Modify: `src/hooks/useGameState.ts` (`initializeGame`)
- Modify: `src/App.tsx` (`handleWordsUpdated`)
- Modify: `src/hooks/useGamePhases.ts` (`handleCardSelect`, `handleWordRevealNext`)
- Modify: `src/types/gameTypes.ts` (remove `needsNameEntry`)
- Test: `src/test/continue-with-same-players.test.ts`

- [x] **Step 1: Write the failing test**

Append inside the top-level `describe` in `src/test/continue-with-same-players.test.ts`:

```ts
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
```

- [x] **Step 2: Run it**

Run: `npx vitest run src/test/continue-with-same-players.test.ts`

Expected: PASS. This test pins the contract the production code must match — it does not yet exercise `handleWordsUpdated`. Step 6 wires the real path.

- [x] **Step 3: Carry names inside initializeGame**

In `src/hooks/useGameState.ts`, change `initializeGame` to take a second parameter and use the functional form of `setGameState` so it can read the previous players:

```ts
  // Initialize game. When preserveNames is true, names from the current
  // players are carried onto the freshly generated ones by id — nothing else
  // from the old state survives.
  const initializeGame = (config: GameConfig, preserveNames = false) => {
    GameLogic.resetRandomStart();

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

    setGameState(prev => {
      const players = preserveNames
        ? newPlayers.map(p => ({
            ...p,
            name: prev.players.find(o => o.id === p.id)?.name ?? ''
          }))
        : newPlayers;

      return {
        phase: 'card-selection',
        undercoverCount: config.undercover,
        mrWhiteCount: config.mrWhite,
        currentPlayerIndex: 0,
        selectedCard: null,
        players,
        round: 1,
        gameWords: selectedWords,
        playerOrder: [],
        selectedPlayerToEliminate: null,
        eliminatedPlayer: null,
        winner: null,
        mrWhiteGuess: '',
        showingWord: false
      };
    });

    return { success: true };
  };
```

Note there is no `needsNameEntry` here — Step 5 removes the field.

- [x] **Step 4: Simplify the caller**

In `src/App.tsx`, replace the whole of `handleWordsUpdated` with:

```tsx
  // Words updated handler. Names are preserved by initializeGame itself when a
  // game is already in progress.
  const handleWordsUpdated = () => {
    const config = playerManagement.getPlayerConfig();
    const gameInProgress = gameState.players.some(p => p.name.trim() !== '');
    return initializeGame(config, gameInProgress);
  };
```

`wordManagement.handleWordsUpdated` was only a passthrough to `initializeGame`; calling it directly removes a hop. Leave the hook's method in place if anything else uses it — check with `grep -rn "handleWordsUpdated" src/`.

- [x] **Step 5: Derive the name prompt per player**

`needsNameEntry` is a global flag, so a partially-named roster gets the wrong behaviour. Derive it from the player instead.

In `src/hooks/useGamePhases.ts`, add near the top of the hook body:

```ts
  const currentPlayerNeedsName = () =>
    !gameState.players[gameState.currentPlayerIndex]?.name.trim();
```

In `handleCardSelect`, replace `if (gameState.needsNameEntry) {` with:

```ts
    if (currentPlayerNeedsName()) {
```

In `handleWordRevealNext`, the index has **not** advanced yet when the turn-modal decision is made — `updateGameState` is queued, and the closure still holds the old `currentPlayerIndex`. Using `currentPlayerNeedsName()` there would test the player who just finished, not the one being announced. Compute the next index explicitly and read from `updatedPlayers`. Replace the whole `setTimeout` body:

```ts
    setTimeout(() => {
      const nextIndex = gameState.currentPlayerIndex + 1;

      if (nextIndex < totalPlayers) {
        updateGameState({
          currentPlayerIndex: nextIndex,
          selectedCard: null,
          players: updatedPlayers
        });

        // The turn modal announces a player by name. An unnamed next player
        // goes straight to the name prompt from handleCardSelect, so
        // announcing them first would be a spurious extra step.
        if (updatedPlayers[nextIndex]?.name.trim()) {
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
```

`currentPlayerNeedsName()` stays as-is in `handleCardSelect`, where the current index is the right one to read.

Then remove the field entirely: delete the `needsNameEntry` line from `GameState` in `src/types/gameTypes.ts`, delete every `needsNameEntry:` line from the state literals in `src/hooks/useGameState.ts`, and delete `needsNameEntry: false,` from `handleContinueWithSamePlayers` in `src/App.tsx` (keep `round: 1`).

- [x] **Step 5b: Pin the turn-modal decision with a regression test**

The off-by-one above is invisible in the all-named and all-unnamed cases, which is why it survived review. Only a mixed roster catches it. Create `src/test/turn-modal.test.ts`:

```ts
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
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const revealAndAdvance = (players: Player[], currentPlayerIndex: number) => {
    const openModal = vi.fn();
    const { result } = renderHook(() =>
      useGamePhases(
        stateWith(players, currentPlayerIndex),
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
```

Run: `npx vitest run src/test/turn-modal.test.ts`

Expected: 3 passing. Revert the `setTimeout` body to the buggy `currentPlayerNeedsName()` form and confirm the first test **fails** — a regression test that cannot fail is not one.

- [x] **Step 6: Typecheck**

Run: `npx tsc -b --force --noEmit`

Expected: clean. Any remaining `needsNameEntry` reference will surface here.

- [x] **Step 7: Verify the real path in the browser**

Run `npm run dev`. In the console, leave exactly one pair unplayed:

```js
const w = JSON.parse(localStorage.getItem('gameWords')).map((p, i) => ({ ...p, played: i !== 0 }));
localStorage.setItem('gameWords', JSON.stringify(w));
```

Reload. Start a 3-player game, enter a name for player 1, then press the refresh button on the card-selection screen and choose "Pakai Ulang Kata Lama".

Expected: player 1's name is still shown on their card, no card is pre-claimed, no player is marked eliminated, and player 2 is prompted for a name normally.

- [x] **Step 8: Run everything and commit**

Run: `npx vitest run`

Expected: 35 passing.

```bash
git add src/hooks/useGameState.ts src/test/turn-modal.test.ts src/App.tsx src/hooks/useGamePhases.ts src/types/gameTypes.ts src/test/continue-with-same-players.test.ts
git commit -m "fix: carry only names when refreshing words mid-setup

handleWordsUpdated restored the previous player objects wholesale over the
freshly generated ones, bringing back old roles, words, cards and
elimination flags. Names are now carried inside initializeGame in one
atomic update, and the name prompt is derived per player rather than from
a global needsNameEntry flag."
```

---

## Task 2: Keep Mr. White out of the lead seat after eliminations

`GameLogic.getDescriptionPhaseOrder` swaps Mr. White out of index 0 — but it checks `result[0]` across **all** players, and `src/App.tsx:299` then filters eliminated players out. Once the original lead is eliminated, the first *surviving* player can be Mr. White, which is the exact thing the rule exists to prevent.

Fix it where the order is built, so the guarantee holds for every consumer.

**Files:**
- Modify: `src/services/gameLogic.ts` (`getDescriptionPhaseOrder`)
- Test: `src/test/ordering.test.ts`

- [x] **Step 1: Write the failing test**

Append inside the top-level `describe` in `src/test/ordering.test.ts`:

```ts
  describe('Mr. White never leads the active order', () => {
    const roster = (): Player[] => [
      { id: 1, name: 'P1', role: 'civilian',   word: 'a', cardIndex: 0, hasRevealed: true, isEliminated: false },
      { id: 2, name: 'P2', role: 'mrwhite',    word: '',  cardIndex: 1, hasRevealed: true, isEliminated: false },
      { id: 3, name: 'P3', role: 'civilian',   word: 'a', cardIndex: 2, hasRevealed: true, isEliminated: false },
      { id: 4, name: 'P4', role: 'undercover', word: 'b', cardIndex: 3, hasRevealed: true, isEliminated: false },
    ];

    it('does not put Mr. White first once the leader is eliminated', () => {
      for (let attempt = 0; attempt < 50; attempt++) {
        const players = roster();
        GameLogic.resetRandomStart();

        // Eliminate whoever the order picked to lead.
        const initial = GameLogic.getDescriptionPhaseOrder(players);
        const leader = players.find(p => p.id === initial[0].id)!;
        leader.isEliminated = true;

        const active = GameLogic.getDescriptionPhaseOrder(players)
          .filter(p => !p.isEliminated);

        if (active.length > 1) {
          expect(active[0].role).not.toBe('mrwhite');
        }
      }
    });
  });
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/test/ordering.test.ts`

Expected: FAIL on at least one attempt with `expected 'mrwhite' not to be 'mrwhite'`. If all 50 attempts pass, the randomness did not hit the case — raise the loop to 200 and rerun before concluding the bug is absent.

- [x] **Step 3: Guard the first active player**

In `src/services/gameLogic.ts`, replace the trailing Mr. White block in `getDescriptionPhaseOrder` — the one that starts `// Check if Mr. White is first and handle it if needed` — with:

```ts
    // Mr. White must not speak first. Consumers filter out eliminated players
    // after calling this, so the guarantee has to hold for the first ACTIVE
    // player, not merely for index 0.
    const firstActive = result.findIndex(p => !p.isEliminated);

    if (firstActive !== -1 && result[firstActive].role === 'mrwhite') {
      const replacement = result.findIndex(
        (p, i) => i > firstActive && !p.isEliminated && p.role !== 'mrwhite'
      );

      if (replacement !== -1) {
        [result[firstActive], result[replacement]] =
          [result[replacement], result[firstActive]];
      }
    }

    return result;
```

When every surviving player is Mr. White there is nothing to swap with, so the order is returned unchanged — correct, and the game is already over by then.

- [x] **Step 4: Run the ordering tests**

Run: `npx vitest run src/test/ordering.test.ts`

Expected: all passing, including the 13 pre-existing tests. Those encode the existing ordering rules — if one breaks, the new guard is too aggressive.

- [x] **Step 5: Run everything and commit**

Run: `npx vitest run && npx tsc -b --force --noEmit`

Expected: 36 passing, clean typecheck.

```bash
git add src/services/gameLogic.ts src/test/ordering.test.ts
git commit -m "fix: keep Mr. White out of the lead seat after eliminations

The guard checked index 0 across all players, but callers filter eliminated
players afterwards, so an eliminated leader could promote Mr. White into
first position."
```

---

## Task 3: Replace the tautological continuation tests

Two tests in `src/test/continue-with-same-players.test.ts` do not test production code.

- "keeps every id and name when regenerating players" builds the `carried` array in the test body and then asserts on the array it just built. It passes no matter what the production code does.
- "does not reuse the previous round speaking order state" asserts only that the result is a permutation of `[1,2,3,4]`, which is true whether or not `resetRandomStart` works.

**Files:**
- Modify: `src/test/continue-with-same-players.test.ts`

- [ ] **Step 1: Delete the tautological test**

Remove the whole `it('keeps every id and name when regenerating players', ...)` block. Task 1 Step 1 added a test that covers the same contract meaningfully.

- [ ] **Step 2: Make the reset test prove something**

Replace the `it('does not reuse the previous round speaking order state', ...)` block with one that controls randomness, so it can assert the cached start and direction actually change:

```ts
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
```

- [ ] **Step 3: Run the file**

Run: `npx vitest run src/test/continue-with-same-players.test.ts`

Expected: all passing. If `forwardFromFirst` equals `backwardFromLast`, the Mr. White swap from Task 2 collapsed both orders onto the same result — change the roster in `namedPlayers()` so Mr. White is not adjacent to the start in either direction, rather than weakening the assertion.

- [ ] **Step 4: Run everything and commit**

Run: `npx vitest run`

Expected: 35 passing (one test removed, one rewritten).

```bash
git add src/test/continue-with-same-players.test.ts
git commit -m "test: make the continuation tests exercise production code

One test asserted on an array it constructed itself; the other only checked
that the result was a permutation, which held regardless of whether
resetRandomStart did anything."
```

---

## Task 4: Correct the impossible verification scenario

Plan A's Task 5 and its done criteria call for a 4-player game with 1 undercover and 1 Mr. White. That cannot be started: `isStartButtonEnabled` requires `civilians > undercover + mrWhite`, and at 4 players that is `2 > 2`. The smallest roster carrying both special roles is **5** players.

Do **not** relax the validation to make 4/1/1 legal. At 2 civilians against 2 infiltrators the first civilian elimination immediately satisfies the parity win condition — a degenerate game. The rule is right; the scenario was wrong.

Also: `ordering.vitest.ts` was renamed to `ordering.extra.test.ts` on the premise that it was a 13-test superset of `ordering.test.ts`. It is the reverse — 3 tests against 13 — so the rename added redundant coverage rather than recovering anything.

**Files:**
- Delete: `src/test/ordering.extra.test.ts`
- Modify: `docs/superpowers/plans/2026-08-02-correctness-and-cleanup.md`

- [ ] **Step 1: Confirm the file is obsolete, not merely differently titled**

The three test titles in `ordering.extra.test.ts` do **not** appear in `ordering.test.ts` — this was checked, and it is expected. They are unique because they describe behaviour that no longer exists, not because they cover anything new.

All three assert a fixed ascending order (`[1, 2, 3, 4, 5]`). `getDescriptionPhaseOrder` picks a random start player and a random direction, so those assertions hold only by coincidence — roughly one run in ten. The file predates randomization, which is why it was renamed out of the vitest glob rather than deleted.

Every contract it touches is already covered in `ordering.test.ts`, in a form that tolerates randomization:

| Obsolete test | Covered in `ordering.test.ts` by |
|---|---|
| orders players by ID ascending | "should order players with a random starting point" |
| maintains ID order when nobody is eliminated | "should maintain description phase order when no players are eliminated" |
| pushes eliminated players to the end | "should push eliminated players to the end while maintaining order" |

Confirm that still holds:

```bash
grep -c "toEqual(\[1, 2, 3, 4, 5\])" src/test/ordering.extra.test.ts
grep -o "it('[^']*'" src/test/ordering.test.ts | grep -ci "eliminated players to the end"
```

Expected: a non-zero count for the first (fixed-order assertions present, so the file is the stale one) and `1` for the second (the partition contract is covered). If the second returns `0`, stop — the partition contract would be lost, and it must be ported to `ordering.test.ts` in a randomization-agnostic form before deleting.

- [ ] **Step 2: Delete the redundant file**

```bash
git rm src/test/ordering.extra.test.ts
```

- [ ] **Step 3: Correct the plan document**

In `docs/superpowers/plans/2026-08-02-correctness-and-cleanup.md`:

- Task 1: replace the claim that `ordering.vitest.ts` is a superset with a note that it is a 3-test subset of `ordering.test.ts` and was deleted.
- Task 1 Step 3 and Step 5: expected counts become 25 and 28, not 25 and 38.
- Task 4 Step 6, Task 6 Step 3, Task 11 Step 5: expected totals become 30, 31 and 31 respectively.
- Task 5 Step 4: change "4 players, 1 undercover, 1 Mr. White" to **"5 players, 1 undercover, 1 Mr. White"**.
- Done criteria: change "A 4-player game" to "A 5-player game", and the test total to reflect this plan's final count.

- [ ] **Step 4: Run the four win outcomes for real**

Run `npm run dev` and play a **5-player** game with 1 undercover and 1 Mr. White four times, forcing each ending:

1. Vote out the undercover, then Mr. White → civilians win.
2. Vote out civilians until one remains → undercover wins.
3. Vote out Mr. White, guess the civilian word correctly → Mr. White wins.
4. Vote out Mr. White, guess wrong, then vote out civilians to one → undercover wins.

Expected: each ends immediately on the correct screen with the correct winner. Outcome 4 must **not** run an extra description round after the last civilian falls.

- [ ] **Step 5: Final verification**

Run: `npx vitest run && npx tsc -b --force --noEmit && npm run build`

Expected: 32 passing (35 minus the 3 deleted), clean typecheck, successful build.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: drop the redundant ordering subset; correct plan counts

ordering.vitest.ts was a 3-test subset of ordering.test.ts, not a superset,
so renaming it added duplicate coverage. Also corrects the plan's test
totals and its unstartable 4-player verification scenario."
```

---

## Done criteria

- `npx vitest run` — 32 passing, 5 files
- `npx tsc -b --force --noEmit` — clean
- `npm run build` — succeeds
- Refreshing words mid-setup keeps names and nothing else
- Mr. White never leads the active speaking order, including after eliminations
- All four win outcomes verified in a 5-player game
- `grep -rn "needsNameEntry" src/` returns nothing
