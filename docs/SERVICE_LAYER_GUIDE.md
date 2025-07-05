# Game Service Layer Guide

This guide explains the new service layer architecture implemented for the Undercover game. The service layer provides a centralized, maintainable, and testable approach to game logic management.

## Architecture Overview

The service layer consists of several key components:

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                         │
├─────────────────────────────────────────────────────────────┤
│                   useGameService Hook                       │
├─────────────────────────────────────────────────────────────┤
│                  GameStateManager                           │
├─────────────────────────────────────────────────────────────┤
│  GameService  │  GameActionService  │  GameLogic  │  WordService │
└─────────────────────────────────────────────────────────────┘
```

## Core Services

### 1. GameService (`src/services/gameService.ts`)

The main service class that handles game initialization, state management, and high-level game operations.

**Key Features:**
- Game initialization and configuration validation
- Phase transition management
- Player management (assignment, elimination, etc.)
- Win condition checking
- Game state validation
- Utility methods for common operations

**Example Usage:**
```typescript
import { GameService } from '../services/gameService';

// Initialize a new game
const gameState = GameService.initializeGame({
  totalPlayers: 6,
  undercover: 2,
  mrWhite: 1,
  civilians: 3
});

// Check win conditions
const winner = GameService.checkAndUpdateWinConditions(gameState);

// Validate game configuration
const validation = GameLogic.validateGameConfig(6, 2, 1);
```

### 2. GameActionService (`src/services/gameActionService.ts`)

Handles complex game actions and state transitions with proper error handling and side effects.

**Key Features:**
- Action-based state management
- Error handling and validation
- Side effect management (modal opening/closing, delays)
- Structured action results

**Example Usage:**
```typescript
import { GameActionService } from '../services/gameActionService';

// Select a card
const result = GameActionService.selectCard(gameState, cardIndex, playerName);
if (result.success) {
  // Handle success
  const newState = result.newState;
  const sideEffects = result.sideEffects; // { openModal: 'showNameModal' }
} else {
  // Handle error
  console.error(result.error);
}

// Eliminate a player
const eliminationResult = GameActionService.eliminatePlayer(gameState);
```

### 3. GameStateManager (`src/services/gameStateManager.ts`)

Provides centralized state management with subscription support, history tracking, and event emission.

**Key Features:**
- Centralized state management
- State change subscriptions
- Action history with undo functionality
- Event system for game actions
- State validation and debugging
- Import/export functionality

**Example Usage:**
```typescript
import { GameStateManager } from '../services/gameStateManager';

const manager = new GameStateManager();

// Subscribe to state changes
const unsubscribe = manager.subscribe((newState, previousState) => {
  console.log('State changed:', newState.phase);
});

// Execute actions
const result = await manager.executeAction('selectCard', cardIndex, playerName);

// Undo last action
if (manager.canUndo()) {
  manager.undo();
}
```

### 4. useGameService Hook (`src/hooks/useGameService.ts`)

A React hook that provides a clean interface to the service layer with automatic state management.

**Key Features:**
- React integration with automatic re-renders
- Loading states and error handling
- Auto-save functionality
- Event tracking
- History management
- Convenient action methods

**Example Usage:**
```typescript
import { useGameService } from '../hooks/useGameService';

function GameComponent() {
  const {
    gameState,
    isLoading,
    error,
    initializeGame,
    selectCard,
    eliminatePlayer,
    getCurrentPlayer,
    getActivePlayers,
    canUndo,
    undo
  } = useGameService({
    enableHistory: true,
    enableEvents: true,
    autoSave: true
  });

  const handleCardSelect = async (cardIndex: number) => {
    const success = await selectCard(cardIndex);
    if (!success) {
      console.error('Failed to select card:', error);
    }
  };

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <div>Current Phase: {gameState.phase}</div>
      <div>Current Player: {getCurrentPlayer()?.name}</div>
      {canUndo() && <button onClick={undo}>Undo</button>}
    </div>
  );
}
```

## Migration Guide

### From Old Hook-based Architecture

If you're migrating from the previous hook-based architecture, here's how to update your components:

**Before:**
```typescript
// Old approach
const {
  gameState,
  updateGameState,
  handleCardSelect,
  handleEliminatePlayer
} = useGameState();

const { openModal, closeModal } = useModalManager();
const { handleWordRevealNext } = useGamePhases(/* ... */);
```

**After:**
```typescript
// New approach
const {
  gameState,
  selectCard,
  eliminatePlayer,
  revealWordNext
} = useGameService();

// Actions now handle modal management internally
// No need to manually manage modals for game actions
```

### Key Benefits of Migration

1. **Simplified Component Logic**: Components no longer need to manage complex state transitions
2. **Better Error Handling**: Centralized error handling with proper error states
3. **Improved Testability**: Service layer can be tested independently
4. **Enhanced Debugging**: Built-in state validation and debug information
5. **History Support**: Automatic undo/redo functionality
6. **Event Tracking**: Monitor game actions for analytics or debugging

## Best Practices

### 1. Use the Hook for React Components

Always use `useGameService` in React components rather than directly accessing the service classes:

```typescript
// ✅ Good
const { selectCard, gameState } = useGameService();

// ❌ Avoid
const manager = new GameStateManager();
```

### 2. Handle Async Actions Properly

All game actions are async and return success/failure status:

```typescript
// ✅ Good
const handleAction = async () => {
  const success = await selectCard(cardIndex);
  if (!success) {
    // Handle error - error details are in the hook's error state
    console.error('Action failed');
  }
};

// ❌ Avoid
selectCard(cardIndex); // Not awaiting the result
```

### 3. Use Query Methods for Derived State

Use the provided query methods instead of manually computing derived state:

```typescript
// ✅ Good
const activePlayers = getActivePlayers();
const currentPlayer = getCurrentPlayer();
const remainingCounts = getRemainingCounts();

// ❌ Avoid
const activePlayers = gameState.players.filter(p => !p.isEliminated);
```

### 4. Enable Features Based on Needs

Configure the hook based on your component's requirements:

```typescript
// For simple components
const gameService = useGameService();

// For components that need history
const gameService = useGameService({ enableHistory: true });

// For debugging/development
const gameService = useGameService({
  enableHistory: true,
  enableEvents: true,
  autoSave: true
});
```

## Testing

### Unit Testing Services

```typescript
import { GameService } from '../services/gameService';
import { GameActionService } from '../services/gameActionService';

describe('GameService', () => {
  test('should initialize game with valid config', () => {
    const config = { totalPlayers: 6, undercover: 2, mrWhite: 1, civilians: 3 };
    const gameState = GameService.initializeGame(config);
    
    expect(gameState.phase).toBe('card-selection');
    expect(gameState.players).toHaveLength(6);
  });

  test('should validate game config', () => {
    const validation = GameLogic.validateGameConfig(2, 1, 1); // Invalid: too few players
    expect(validation.isValid).toBe(false);
    expect(validation.reason).toContain('At least 3 players');
  });
});

describe('GameActionService', () => {
  test('should handle card selection', () => {
    const gameState = GameService.initializeGame({
      totalPlayers: 6,
      undercover: 2,
      mrWhite: 1,
      civilians: 3
    });
    
    const result = GameActionService.selectCard(gameState, 0, 'Player 1');
    
    expect(result.success).toBe(true);
    expect(result.newState?.selectedCard).toBe(0);
    expect(result.sideEffects?.openModal).toBe('showNameModal');
  });
});
```

### Integration Testing with React Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useGameService } from '../hooks/useGameService';

function TestComponent() {
  const { gameState, initializeGame, selectCard } = useGameService();
  
  return (
    <div>
      <div data-testid="phase">{gameState.phase}</div>
      <button onClick={() => initializeGame({ totalPlayers: 6, undercover: 2, mrWhite: 1, civilians: 3 })}>
        Initialize
      </button>
      <button onClick={() => selectCard(0)}>Select Card 1</button>
    </div>
  );
}

test('should initialize game and select card', async () => {
  render(<TestComponent />);
  
  fireEvent.click(screen.getByText('Initialize'));
  await waitFor(() => {
    expect(screen.getByTestId('phase')).toHaveTextContent('card-selection');
  });
  
  fireEvent.click(screen.getByText('Select Card 1'));
  // Add assertions for card selection behavior
});
```

## Debugging

### Using Debug Information

```typescript
const { getDebugInfo, validateCurrentState } = useGameService();

// Get comprehensive debug information
const debugInfo = getDebugInfo();
console.log('Debug Info:', debugInfo);

// Validate current state
const validation = validateCurrentState();
if (!validation.isValid) {
  console.error('Invalid state:', validation.errors);
}
```

### Event Monitoring

```typescript
const { events, clearEvents } = useGameService({ enableEvents: true });

// Monitor recent events
useEffect(() => {
  console.log('Recent events:', events.slice(-5));
}, [events]);

// Clear events when needed
const handleClearEvents = () => {
  clearEvents();
};
```

### State Export/Import

```typescript
const { exportState, importState } = useGameService();

// Export current state for debugging
const handleExport = () => {
  const stateJson = exportState();
  console.log('Current state:', stateJson);
  // Save to file or clipboard
};

// Import state for testing
const handleImport = (stateJson: string) => {
  const success = importState(stateJson);
  if (!success) {
    console.error('Failed to import state');
  }
};
```

## Performance Considerations

1. **Memoization**: Query methods are automatically memoized based on relevant state changes
2. **Selective Subscriptions**: Only subscribe to events if needed
3. **History Limits**: History is automatically limited to prevent memory leaks
4. **Lazy Loading**: Services are only instantiated when needed

## Future Enhancements

The service layer is designed to be extensible. Potential future enhancements include:

1. **Persistence Layer**: Database integration for game state persistence
2. **Multiplayer Support**: Real-time synchronization between players
3. **AI Players**: Integration with AI decision-making services
4. **Analytics**: Game analytics and player behavior tracking
5. **Plugin System**: Support for game modifications and extensions

## Conclusion

The new service layer provides a robust foundation for the Undercover game with improved maintainability, testability, and extensibility. By centralizing game logic and providing clean interfaces, it enables easier development and debugging while maintaining excellent performance.