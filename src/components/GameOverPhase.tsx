import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GameHeader } from './GameHeader';
import { Home } from 'lucide-react';
import type { Player, GameState } from '../types/gameTypes';

interface GameOverPhaseProps {
  gameState: GameState;
  winnerPlayers: Player[];
  onBackToSetup: () => void;
  onContinueWithSamePlayers: () => void;
}

export const GameOverPhase: React.FC<GameOverPhaseProps> = ({
  gameState,
  winnerPlayers,
  onBackToSetup,
  onContinueWithSamePlayers
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 w-screen">
      <GameHeader
        title="Game Over"
        onHome={onBackToSetup}
        variant="game-over"
        showHelp={false}
      />

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="text-8xl mb-6">
            {gameState.winner === 'civilian' ? '🏆' : 
             gameState.winner === 'undercover' ? '🎭' : '❓'}
          </div>
          
          <h3 className="text-3xl font-bold mb-4 capitalize">
            {gameState.winner === 'civilian' ? 'Civilians Win!' :
             gameState.winner === 'undercover' ? 'Undercover Wins!' :
             'Mr. White Wins!'}
          </h3>

          {/* Winner Details */}
          <div className="bg-gray-100 p-6 rounded-lg mb-6">
            <h4 className="text-lg font-semibold mb-3">Winners:</h4>
            <div className="space-y-2">
              {winnerPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-center gap-2">
                  <span className="font-medium">{player.name || `Player ${player.id}`}</span>
                  <span className="text-sm text-gray-600 capitalize">({player.role})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Game Statistics */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h4 className="font-semibold mb-2">Game Statistics:</h4>
            <div className="text-sm space-y-1">
              <p>Rounds Played: {gameState.round}</p>
              <p>Civilian Word: {gameState.gameWords.civilian}</p>
              <p>Undercover Word: {gameState.gameWords.undercover}</p>
              <p>Total Players: {gameState.players.length}</p>
              <p>Players Eliminated: {gameState.players.filter(p => p.isEliminated).length}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onContinueWithSamePlayers}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full text-lg"
            >
              Lanjut
            </Button>
            
            <Button
              onClick={onBackToSetup}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-full text-lg flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};