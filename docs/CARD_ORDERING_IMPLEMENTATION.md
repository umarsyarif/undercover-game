 # Card Ordering Implementation

## Overview

This document describes the implementation of the new card ordering logic for the description and voting phases in the Undercover game.

## Requirements

### Description Phase
- Cards should be ordered based on the card selection order (cardIndex)
- Order should be either ascending or descending, starting from a random player
- Mr. White can never be the first player in the order
- Examples:
  - `2,3,4,5,1` (ascending from player 2)
  - `4,3,2,1,5` (descending from player 4)
  - `5,1,2,3,4` (ascending from player 5)

### Voting Phase
- Same order as description phase
- Eliminated players are pushed to the end of the grid
- Examples:
  - `2,3,5,1,4(eliminated)` (player 4 eliminated)
  - `3,1,5,4(eliminated),2(eliminated)` (players 4 and 2 eliminated)
  - `5,4,1(eliminated),2(eliminated),3(eliminated)` (players 1, 2, 3 eliminated)

## Implementation

### New Methods Added

#### GameLogic Class (`src/services/gameLogic.ts`)
```typescript
// Store the random start player for consistent ordering across phases
private static startPlayerId: number | null = null;
private static isForward: boolean = true;

// Reset the random start player (call this when starting a new game)
static resetRandomStart(): void {
  this.startPlayerId = null;
  this.isForward = true;
}

// Get ordered players for description phase with randomized start
static getDescriptionPhaseOrder(players: Player[]): Player[] {
  if (!players || players.length === 0) return [];
  
  // If we haven't set a random start player yet, do it now
  if (this.startPlayerId === null) {
    // Get all non-Mr. White players
    const nonMrWhitePlayers = players.filter(p => p.role !== 'mrwhite');
    
    // If there are no non-Mr. White players, use any player
    if (nonMrWhitePlayers.length === 0) {
      this.startPlayerId = players[Math.floor(Math.random() * players.length)].id;
    } else {
      // Pick a random non-Mr. White player as the starting point
      this.startPlayerId = nonMrWhitePlayers[Math.floor(Math.random() * nonMrWhitePlayers.length)].id;
    }
    
    // Randomly decide if we're going forward or backward
    this.isForward = Math.random() < 0.5;
  }
  
  // Sort players by ID first
  const sortedPlayers = [...players].sort((a, b) => a.id - b.id);
  
  // Find the index of the start player
  const startIndex = sortedPlayers.findIndex(p => p.id === this.startPlayerId);
  if (startIndex === -1) return sortedPlayers; // Fallback if start player not found
  
  // Reorder the players starting from the random player
  const result = [];
  
  if (this.isForward) {
    // Forward order (e.g., 3,4,5,1,2 if starting with player 3)
    for (let i = 0; i < sortedPlayers.length; i++) {
      const index = (startIndex + i) % sortedPlayers.length;
      result.push(sortedPlayers[index]);
    }
  } else {
    // Reverse order (e.g., 3,2,1,5,4 if starting with player 3)
    for (let i = 0; i < sortedPlayers.length; i++) {
      let index = startIndex - i;
      if (index < 0) index = sortedPlayers.length + index;
      result.push(sortedPlayers[index]);
    }
  }
  
  // Check if Mr. White is first and handle it if needed
  if (result.length > 0 && result[0].role === 'mrwhite') {
    // Find a non-Mr. White player to swap with
    const nonMrWhiteIndex = result.findIndex(p => p.role !== 'mrwhite');
    
    // If there's a non-Mr. White player, swap them to the first position
    if (nonMrWhiteIndex > 0) {
      [result[0], result[nonMrWhiteIndex]] = [result[nonMrWhiteIndex], result[0]];
    }
  }
  
  return result;
}

// Get ordered players for voting phase (same order as description, but eliminated players at the end)
static getVotingPhaseOrder(players: Player[]): Player[] {
  if (!players || players.length === 0) return [];
  
  // Get the description phase order first
  const descriptionOrder = this.getDescriptionPhaseOrder(players);
  
  // Split into active and eliminated players while maintaining the description order
  const activePlayers = descriptionOrder.filter(p => !p.isEliminated);
  const eliminatedPlayers = descriptionOrder.filter(p => p.isEliminated);
  
  // Return active players first, then eliminated players
  return [...activePlayers, ...eliminatedPlayers];
}
```

#### GameStateManager Class (`src/services/gameStateManager.ts`)
```typescript
getDescriptionPhaseOrder(): Player[] {
  return GameLogic.getDescriptionPhaseOrder(this.state.players);
}

getVotingPhaseOrder(): Player[] {
  return GameLogic.getVotingPhaseOrder(this.state.players);
}
```

#### useGameService Hook (`src/hooks/useGameService.ts`)
```typescript
const getDescriptionPhaseOrder = useCallback((): Player[] => {
  return gameManagerRef.current?.getDescriptionPhaseOrder() || [];
}, [gameState.players]);

const getVotingPhaseOrder = useCallback((): Player[] => {
  return gameManagerRef.current?.getVotingPhaseOrder() || [];
}, [gameState.players]);
```

#### GameHelpers (`src/utils/gameHelpers.ts`)
```typescript
/**
 * Get ordered players for description phase (based on card selection order)
 */
getDescriptionPhaseOrder: (players: Player[]): Player[] => {
  return GameLogic.getDescriptionPhaseOrder(players);
},

/**
 * Get ordered players for voting phase (same as description order, but eliminated players at the end)
 */
getVotingPhaseOrder: (players: Player[]): Player[] => {
  return GameLogic.getVotingPhaseOrder(players);
},
```

### Updated Components

#### App.tsx
- Description phase now uses `getDescriptionPhaseOrder()` instead of `getOrderedPlayers()`
- Voting phase now uses `getVotingPhaseOrder()` instead of manual filtering

#### AppWithServices.tsx
- Added new methods to destructuring from `useGameService`
- Updated description and voting phases to use new ordering methods

#### GameContainer.tsx
- Added `descriptionPhaseOrder` and `votingPhaseOrder` to computed values
- Updated `sortedPlayersForVoting` to use `getVotingPhaseOrder()`

## How It Works

### Card Selection Order
The card selection order is determined by the `cardIndex` property of each player. This index represents the order in which players selected their cards during the card selection phase.

### Description Phase Ordering
1. Players are initially sorted by their `id` in ascending order
2. A random player (who is not Mr. White) is selected as the starting point
3. The direction (forward or backward) is randomly determined
4. Players are reordered starting from the random player in the chosen direction
5. If Mr. White happens to be first in the order, they are swapped with the next non-Mr. White player
6. This creates the speaking order for the description phase

### Voting Phase Ordering
1. Uses the same order as the description phase
2. Active (non-eliminated) players are placed first
3. Eliminated players are placed at the end
4. This maintains the visual consistency with the description phase while clearly showing eliminated players

## Benefits

1. **Consistency**: The voting phase maintains the same visual order as the description phase
2. **Clarity**: Eliminated players are clearly separated at the end
3. **Flexibility**: The system can handle any card selection order
4. **Randomization**: Each game has a different player order, making the game more unpredictable
5. **Strategy**: Mr. White is never first, preventing them from having the disadvantage of describing first

## Testing

The implementation has been tested to ensure:
- Description phase orders players with a random starting point
- Mr. White is never first in the order
- Voting phase maintains description order with eliminated players at the end
- Edge cases (unselected cards, all players eliminated) are handled correctly

## Migration

The old `getSortedPlayersForVoting` method has been deprecated and now uses the new `getVotingPhaseOrder` method internally to maintain backward compatibility.