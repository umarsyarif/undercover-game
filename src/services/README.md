# Game Service Layer

A comprehensive service layer for the Undercover game that provides centralized game logic, state management, and action handling.

## Quick Start

### Basic Usage

```typescript
import { useGameService } from '../hooks/useGameService';

function GameComponent() {
  const {
    gameState,
    initializeGame,
    selectCard,
    submitPlayerName,
    revealWordNext,
    eliminatePlayer,
    getCurrentPlayer,
    getActivePlayers
  } = useGameService();

  // Initialize game
  const startGame = () => {
    initializeGame({
      totalPlayers: 6,
      undercover: 2,
      mrWhite: 1,
      civilians: 3
    });
  };

  // Handle card selection
  const handleCardSelect = async (cardIndex: number) => {
    const success = await selectCard(cardIndex);
    if (success) {
      console.log('Card selected successfully');
    }
  };

  return (
    <div>
      <div>Phase: {gameState.phase}</div>
      <div>Current Player: {getCurrentPlayer()?.name || 'None'}</div>
      <button onClick={startGame}>Start Game</button>
    </div>
  );
}
```

## Service Architecture

### Core Services

1. **GameService** - Main game logic and state management
2. **GameActionService** - Complex actions with error handling
3. **GameStateManager** - Centralized state with subscriptions
4. **useGameService** - React hook interface

### Service Dependencies

```
useGameService
    ↓
GameStateManager
    ↓
GameActionService + GameService
    ↓
GameLogic + WordService
```

## Key Features

### ✅ Centralized Game Logic
- All game rules and logic in one place
- Consistent state management
- Proper error handling

### ✅ Action-Based Architecture
- Structured action results
- Side effect management
- Automatic modal handling

### ✅ State Management
- Subscription-based updates
- History tracking with undo
- State validation

### ✅ React Integration
- Clean hook interface
- Automatic re-renders
- Loading and error states

### ✅ Developer Experience
- Comprehensive debugging tools
- State export/import
- Event tracking
- TypeScript support

## Available Actions

| Action | Description | Returns |
|--------|-------------|----------|
| `initializeGame(config)` | Start new game with configuration | `boolean` |
| `selectCard(cardIndex)` | Select a card during card selection | `boolean` |
| `submitPlayerName(name)` | Submit player name after card selection | `boolean` |
| `revealWordNext()` | Proceed after word reveal | `boolean` |
| `eliminatePlayer()` | Eliminate current player | `boolean` |
| `submitMrWhiteGuess(guess)` | Submit Mr. White's word guess | `boolean` |
| `startNewRound()` | Start a new round with same players | `boolean` |
| `resetGame()` | Reset to initial state | `boolean` |

## Query Methods

| Method | Description | Returns |
|--------|-------------|----------|
| `getCurrentPlayer()` | Get current active player | `Player \| null` |
| `getActivePlayers()` | Get all non-eliminated players | `Player[]` |
| `getEliminatedPlayers()` | Get eliminated players | `Player[]` |
| `getRemainingCounts()` | Get role counts for active players | `RoleCounts` |
| `getWinnerPlayers()` | Get winning players if game ended | `Player[]` |
| `canUndo()` | Check if undo is available | `boolean` |

## Configuration Options

```typescript
const gameService = useGameService({
  // Enable undo/redo functionality
  enableHistory: true,
  
  // Track all game events
  enableEvents: true,
  
  // Auto-save state to localStorage
  autoSave: true,
  
  // Custom storage key for auto-save
  storageKey: 'undercover-game-state'
});
```

## Error Handling

```typescript
const { error, clearError } = useGameService();

// Check for errors after actions
const handleAction = async () => {
  const success = await selectCard(0);
  if (!success && error) {
    console.error('Action failed:', error);
    // Optionally clear the error
    clearError();
  }
};
```

## Debugging

```typescript
const {
  getDebugInfo,
  validateCurrentState,
  exportState,
  importState,
  events,
  clearEvents
} = useGameService({ enableEvents: true });

// Get debug information
const debugInfo = getDebugInfo();
console.log('Debug:', debugInfo);

// Validate state
const validation = validateCurrentState();
if (!validation.isValid) {
  console.error('Invalid state:', validation.errors);
}

// Export/import state
const stateJson = exportState();
importState(stateJson);

// Monitor events
console.log('Recent events:', events.slice(-10));
```

## Migration from Hooks

If migrating from the previous hook-based architecture:

### Before
```typescript
const { gameState, updateGameState } = useGameState();
const { openModal, closeModal } = useModalManager();
const { handleCardSelect } = useGamePhases(/* complex dependencies */);

// Manual state updates and modal management
const selectCard = (index) => {
  updateGameState({ selectedCard: index });
  openModal('showNameModal');
};
```

### After
```typescript
const { gameState, selectCard } = useGameService();

// Simplified - actions handle everything internally
const handleCardSelect = async (index) => {
  await selectCard(index); // Handles state + modals automatically
};
```

## Testing

### Unit Tests
```typescript
import { GameService } from './gameService';

test('should initialize game correctly', () => {
  const state = GameService.initializeGame({
    totalPlayers: 6,
    undercover: 2,
    mrWhite: 1,
    civilians: 3
  });
  
  expect(state.phase).toBe('card-selection');
  expect(state.players).toHaveLength(6);
});
```

### Integration Tests
```typescript
import { renderHook, act } from '@testing-library/react';
import { useGameService } from '../hooks/useGameService';

test('should handle card selection flow', async () => {
  const { result } = renderHook(() => useGameService());
  
  act(() => {
    result.current.initializeGame({
      totalPlayers: 6,
      undercover: 2,
      mrWhite: 1,
      civilians: 3
    });
  });
  
  await act(async () => {
    const success = await result.current.selectCard(0);
    expect(success).toBe(true);
  });
  
  expect(result.current.gameState.selectedCard).toBe(0);
});
```

## Performance Notes

- Query methods are memoized and only recalculate when relevant state changes
- Event tracking is optional and can be disabled for production
- History is automatically limited to prevent memory leaks
- State subscriptions are optimized to minimize re-renders

## File Structure

```
src/services/
├── README.md                 # This file
├── gameService.ts           # Main game logic service
├── gameActionService.ts     # Action handling with side effects
├── gameStateManager.ts      # State management with subscriptions
└── types.ts                 # Service-specific types

src/hooks/
└── useGameService.ts        # React hook interface

src/components/
└── GameServiceExample.tsx   # Usage example component

docs/
└── SERVICE_LAYER_GUIDE.md   # Comprehensive documentation
```

For detailed documentation, see [SERVICE_LAYER_GUIDE.md](../../docs/SERVICE_LAYER_GUIDE.md).