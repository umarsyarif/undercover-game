import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GameHeader } from './GameHeader';
import { Home, Users, Award, Shield, EyeOff } from 'lucide-react';
import type { Player, GameState } from '../types/gameTypes';

interface GameOverPhaseProps {
  gameState: GameState;
  winnerPlayers: Player[];
  onBackToSetup: () => void;
  onContinueWithSamePlayers: () => void;
}

const RoleIcon = ({ role }: { role: string }) => {
  switch (role) {
    case 'civilian':
      return <Shield className="h-5 w-5 text-blue-500" />;
    case 'undercover':
      return <EyeOff className="h-5 w-5 text-red-500" />;
    case 'mrwhite':
      return <Users className="h-5 w-5 text-gray-500" />;
    default:
      return null;
  }
};

export const GameOverPhase: React.FC<GameOverPhaseProps> = ({
  gameState,
  onBackToSetup,
  onContinueWithSamePlayers
}) => {
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    const aIsWinner = gameState.winner === a.role;
    const bIsWinner = gameState.winner === b.role;
    if (aIsWinner && !bIsWinner) return -1;
    if (!aIsWinner && bIsWinner) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-100 w-screen">
      <GameHeader
        title="Game Over"
        onHome={onBackToSetup}
        variant="game-over"
        showHelp={false}
      />

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center shadow-lg rounded-2xl">
          <div className="mb-4">
            <h3 className="text-2xl font-bold capitalize">
              {gameState.winner === 'civilian' ? 'Para Civilian Menang!' :
               gameState.winner === 'undercover' ? 'Para Undercover Menang!' :
               'Mr. White Menang!'}
            </h3>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-center items-center gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-500" />
                <span className="font-semibold">{gameState.gameWords.civilian}</span>
              </div>
              <div className="flex items-center gap-2">
                <EyeOff className="h-6 w-6 text-red-500" />
                <span className="font-semibold">{gameState.gameWords.undercover}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {sortedPlayers.map(player => (
              <div key={player.id} className={`p-3 rounded-lg flex items-center justify-between ${player.isEliminated ? 'bg-gray-200' : 'bg-white'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${player.isEliminated ? 'bg-gray-400' : 'bg-green-500'}`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`font-medium ${player.isEliminated ? 'text-gray-500 line-through' : ''}`}>
                    {player.name || `Player ${player.id}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <RoleIcon role={player.role} />
                  <span className="text-sm capitalize font-semibold">{player.role}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
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