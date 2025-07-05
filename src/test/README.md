# Card Ordering Logic Tests

This directory contains comprehensive tests for the card ordering logic used in the Undercover game.

## Test Files

### `ordering.test.ts`
A comprehensive test suite using Jest-style syntax that covers all aspects of the ordering logic.

### `ordering.vitest.ts`
A Vitest-compatible test file that can be run with the existing test setup.

### `run-ordering-tests.ts`
A standalone test runner that can be executed independently to test the ordering logic.

## Running Tests

### Option 1: Using the standalone test runner
```bash
npm run test:ordering
```

This will run the standalone test runner and display results in the console.

### Option 2: Using Vitest (recommended)
```bash
npm test
```

This will run all tests including the Vitest-compatible ordering tests.

### Option 3: Running specific test file
```bash
npx vitest src/test/ordering.vitest.ts
```

## Test Coverage

The tests cover the following scenarios:

### Description Phase Ordering
- ✅ Orders players by card selection order (cardIndex)
- ✅ Maintains player information while reordering
- ✅ Handles players with unselected cards (cardIndex -1)
- ✅ Handles multiple players with unselected cards

### Voting Phase Ordering
- ✅ Maintains description phase order when no eliminations
- ✅ Pushes eliminated players to the end while maintaining order
- ✅ Handles all players eliminated
- ✅ Handles only one player remaining active
- ✅ Maintains order when players have unselected cards

### Edge Cases
- ✅ Handles empty player array
- ✅ Handles single player
- ✅ Handles duplicate card indices

### Integration Tests
- ✅ Maintains consistency between description and voting phases
- ✅ Handles complex elimination scenarios

## Test Data

The tests use a consistent set of 5 players with different card selection orders:

- **Player 1**: cardIndex 2 (selected card 2)
- **Player 2**: cardIndex 0 (selected card 0 - first)
- **Player 3**: cardIndex 4 (selected card 4 - last)
- **Player 4**: cardIndex 1 (selected card 1)
- **Player 5**: cardIndex 3 (selected card 3)

## Expected Results

### Description Phase
Players should be ordered by cardIndex: `[0, 1, 2, 3, 4]`

### Voting Phase (No Eliminations)
Same as description phase: `[0, 1, 2, 3, 4]`

### Voting Phase (With Eliminations)
Active players first, then eliminated players:
- If players 2 and 4 are eliminated: `[2, 3, 4, 0, 1]`
- If all players except 1 are eliminated: `[2, 0, 1, 3, 4]`

## Example Output

When running the standalone test runner, you should see output like:

```
🧪 Running Card Ordering Logic Tests...

📋 Description Phase Tests:
============================
✅ Description phase orders by cardIndex
✅ Description phase maintains player information
✅ Description phase handles unselected cards
✅ Description phase handles multiple unselected cards

🗳️  Voting Phase Tests:
=======================
✅ Voting phase maintains description order (no eliminations)
✅ Voting phase pushes eliminated players to end
✅ Voting phase handles all players eliminated
✅ Voting phase handles only one active player

🔍 Edge Case Tests:
===================
✅ Handles empty player array
✅ Handles single player
✅ Handles duplicate card indices

🔗 Integration Tests:
=====================
✅ Maintains consistency between description and voting phases
✅ Handles complex elimination scenarios

📊 Test Results:
================
Passed: 13/13 tests
Success Rate: 100.0%

🎉 All tests passed! The ordering logic is working correctly.
```

## Adding New Tests

To add new tests:

1. **For Vitest tests**: Add to `ordering.vitest.ts`
2. **For standalone tests**: Add to `run-ordering-tests.ts`
3. **For comprehensive tests**: Add to `ordering.test.ts`

Follow the existing pattern of using `describe()` blocks for test groups and `it()` blocks for individual tests. 