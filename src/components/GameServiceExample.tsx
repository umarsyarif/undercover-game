import React, { useState } from 'react';
import { useGameService } from '../hooks/useGameService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import type { GameConfig } from '../services/gameService';

/**
 * Example component demonstrating the new game service layer
 * This shows how to use the centralized game management system
 */
export const GameServiceExample: React.FC = () => {
  const gameService = useGameService({
    enableHistory: true,
    enableEvents: true,
    autoSave: true,
    storageKey: 'undercover-game-demo'
  });

  const [gameConfig, setGameConfig] = useState<GameConfig>({
    totalPlayers: 6,
    undercover: 2,
    mrWhite: 1,
    civilians: 3
  });

  const [playerName, setPlayerName] = useState('');
  const [mrWhiteGuess, setMrWhiteGuess] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const {
    gameState,
    isLoading,
    error,
    initializeGame,
    selectCard,
    submitPlayerName,
    revealWordNext,
    selectPlayerForElimination,
    eliminatePlayer,
    confirmElimination,
    processMrWhiteGuess,
    startNewRound,
    resetGame,
    transitionToPhase,
    refreshWords,
    getCurrentPlayer,
    getActivePlayers,
    getOrderedPlayers,
    getWinnerPlayers,
    getRemainingCounts,
    getGameStatistics,
    isCardAvailable,
    canUndo,
    undo,
    events,
    clearEvents,
    validateCurrentState,
    exportState,
    importState,
    getDebugInfo
  } = gameService;

  const currentPlayer = getCurrentPlayer();
  const activePlayers = getActivePlayers();
  const orderedPlayers = getOrderedPlayers();
  const winnerPlayers = getWinnerPlayers();
  const remainingCounts = getRemainingCounts();
  const gameStats = getGameStatistics();
  const validation = validateCurrentState();

  const handleInitializeGame = async () => {
    const success = await initializeGame(gameConfig);
    if (!success) {
      console.error('Failed to initialize game');
    }
  };

  const handleSelectCard = async (cardIndex: number) => {
    if (gameState.round === 1 && playerName.trim()) {
      await selectCard(cardIndex, playerName);
      setPlayerName('');
    } else {
      await selectCard(cardIndex);
    }
  };

  const handleSubmitName = async () => {
    if (playerName.trim()) {
      await submitPlayerName(playerName);
      setPlayerName('');
    }
  };

  const handleRevealNext = async () => {
    await revealWordNext(gameConfig.totalPlayers);
  };

  const handleEliminatePlayer = async () => {
    if (selectedPlayerId) {
      await selectPlayerForElimination(selectedPlayerId);
      await eliminatePlayer();
      setSelectedPlayerId(null);
    }
  };

  const handleMrWhiteGuess = async () => {
    if (mrWhiteGuess.trim()) {
      await processMrWhiteGuess(mrWhiteGuess);
      setMrWhiteGuess('');
    }
  };

  const handleExportState = () => {
    const exported = exportState();
    navigator.clipboard.writeText(exported);
    alert('Game state copied to clipboard!');
  };

  const handleImportState = () => {
    const input = prompt('Paste game state JSON:');
    if (input) {
      const success = importState(input);
      alert(success ? 'State imported successfully!' : 'Failed to import state');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Game Service Layer Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Processing...</p>
            </div>
          )}

          {/* Game Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current State</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline">Phase: {gameState.phase}</Badge>
                  <Badge variant="outline">Round: {gameState.round}</Badge>
                  {currentPlayer && (
                    <Badge variant="outline">Player: {currentPlayer.name || `#${currentPlayer.id}`}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Player Counts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>Civilians: {remainingCounts.civilians}</div>
                  <div>Undercover: {remainingCounts.undercover}</div>
                  <div>Mr. White: {remainingCounts.mrWhite}</div>
                  <div>Active: {gameStats.activePlayers}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={validation.isValid ? "default" : "destructive"}>
                  {validation.isValid ? 'Valid' : 'Invalid'}
                </Badge>
                {!validation.isValid && (
                  <div className="mt-2 text-xs text-red-600">
                    {validation.errors.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Game Configuration */}
          {gameState.phase === 'setup' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Game Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Players</label>
                    <Input
                      type="number"
                      value={gameConfig.totalPlayers}
                      onChange={(e) => setGameConfig(prev => ({
                        ...prev,
                        totalPlayers: parseInt(e.target.value) || 0
                      }))}
                      min={3}
                      max={20}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Undercover</label>
                    <Input
                      type="number"
                      value={gameConfig.undercover}
                      onChange={(e) => setGameConfig(prev => ({
                        ...prev,
                        undercover: parseInt(e.target.value) || 0
                      }))}
                      min={0}
                      max={gameConfig.totalPlayers - 2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mr. White</label>
                    <Input
                      type="number"
                      value={gameConfig.mrWhite}
                      onChange={(e) => setGameConfig(prev => ({
                        ...prev,
                        mrWhite: parseInt(e.target.value) || 0
                      }))}
                      min={0}
                      max={1}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Civilians</label>
                    <Input
                      type="number"
                      value={gameConfig.totalPlayers - gameConfig.undercover - gameConfig.mrWhite}
                      disabled
                    />
                  </div>
                </div>
                <Button onClick={handleInitializeGame} className="w-full">
                  Initialize Game
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card Selection */}
          {gameState.phase === 'card-selection' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Card Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gameState.round === 1 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Player Name</label>
                    <div className="flex gap-2">
                      <Input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Enter player name"
                      />
                      <Button onClick={handleSubmitName} disabled={!playerName.trim()}>
                        Submit
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: gameConfig.totalPlayers }, (_, i) => (
                    <Button
                      key={i}
                      variant={isCardAvailable(i) ? "outline" : "secondary"}
                      disabled={!isCardAvailable(i)}
                      onClick={() => handleSelectCard(i)}
                      className="aspect-square"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                
                <Button onClick={handleRevealNext} className="w-full">
                  Reveal Word & Next
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Voting Phase */}
          {gameState.phase === 'voting' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Voting Phase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {activePlayers.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{player.name || `Player ${player.id}`}</span>
                      <Button
                        size="sm"
                        variant={selectedPlayerId === player.id ? "default" : "outline"}
                        onClick={() => setSelectedPlayerId(player.id)}
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={handleEliminatePlayer} 
                  disabled={!selectedPlayerId}
                  className="w-full"
                  variant="destructive"
                >
                  Eliminate Selected Player
                </Button>
                
                <Button 
                  onClick={confirmElimination} 
                  className="w-full"
                >
                  Confirm Elimination
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Mr. White Guess */}
          {gameState.phase === 'voting' && gameState.eliminatedPlayer?.role === 'undercover' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mr. White Guess</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={mrWhiteGuess}
                    onChange={(e) => setMrWhiteGuess(e.target.value)}
                    placeholder="Enter your guess"
                  />
                  <Button onClick={handleMrWhiteGuess} disabled={!mrWhiteGuess.trim()}>
                    Guess!
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Game Over */}
          {gameState.phase === 'game-over' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Game Over</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">
                    {gameState.winner === 'civilian' && 'Civilians Win!'}
                    {gameState.winner === 'undercover' && 'Undercover Wins!'}
                    {gameState.winner === 'mrwhite' && 'Mr. White Wins!'}
                  </h3>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Winners:</h4>
                    {winnerPlayers.map(player => (
                      <Badge key={player.id} className="mr-2">
                        {player.name || `Player ${player.id}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={startNewRound} className="flex-1">
                    New Round
                  </Button>
                  <Button onClick={resetGame} variant="outline" className="flex-1">
                    New Game
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Game Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Game Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button onClick={refreshWords} size="sm" variant="outline">
                  Refresh Words
                </Button>
                <Button onClick={() => transitionToPhase('description')} size="sm" variant="outline">
                  To Description
                </Button>
                <Button onClick={() => transitionToPhase('voting')} size="sm" variant="outline">
                  To Voting
                </Button>
                <Button onClick={resetGame} size="sm" variant="outline">
                  Reset Game
                </Button>
                <Button onClick={undo} disabled={!canUndo()} size="sm" variant="outline">
                  Undo
                </Button>
                <Button onClick={handleExportState} size="sm" variant="outline">
                  Export State
                </Button>
                <Button onClick={handleImportState} size="sm" variant="outline">
                  Import State
                </Button>
                <Button onClick={clearEvents} size="sm" variant="outline">
                  Clear Events
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events Log */}
          {events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {events.slice(-10).map((event, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      <span className="font-mono">{event.type}</span>
                      {event.payload && (
                        <span className="ml-2 text-gray-600">
                          {JSON.stringify(event.payload)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Debug Info */}
          <details className="mt-4">
            <summary className="cursor-pointer font-medium">Debug Information</summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(getDebugInfo(), null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};