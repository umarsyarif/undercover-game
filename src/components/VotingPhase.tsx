import React from 'react';
import { Button } from '@/components/ui/button';
import { GameHeader } from './GameHeader';
import { GameStatus } from './GameStatus';
import { GameCard } from './GameCard';
import type { Player } from '../types/gameTypes';

interface VotingPhaseProps {
  sortedPlayers: Player[];
  selectedPlayerToEliminate: number | null;
  onBack: () => void;
  onPlayerSelect: (playerId: number) => void;
  onEliminatePlayer: () => void;
  getRemainingCounts: () => { undercovers: number; mrWhites: number; total: number };
}

export const VotingPhase: React.FC<VotingPhaseProps> = ({
  sortedPlayers,
  selectedPlayerToEliminate,
  onBack,
  onPlayerSelect,
  onEliminatePlayer,
  getRemainingCounts
}) => {
  const remainingCounts = getRemainingCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 w-screen">
      <GameHeader
        title="Waktu Eliminasi"
        subtitle="Diskusikan siapa yang harus dihilangkan dan kemudian pilih semua secara bersamaan dengan menunjuk jari!"
        onBack={onBack}
        variant="voting"
      />

      <GameStatus
        remainingCounts={remainingCounts}
        round={1}
        variant="elimination"
      />

      {/* Players Grid - Ordered like description phase */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {sortedPlayers.map((player) => {
              const isSelected = selectedPlayerToEliminate === player.id;
              const isEliminated = player.isEliminated;
              
              return (
                <GameCard
                  key={player.id}
                  index={player.id}
                  player={player}
                  isSelected={isSelected}
                  isAvailable={!isEliminated}
                  onClick={() => !isEliminated && onPlayerSelect(player.id)}
                  variant="voting"
                  showEliminated={true}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Eliminate Button */}
      <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-1/2 lg:right-auto lg:transform lg:-translate-x-1/2 lg:w-full lg:max-w-lg lg:px-0">
        <div className="px-6 sm:px-8 lg:px-6">
          <Button 
            onClick={onEliminatePlayer}
            disabled={selectedPlayerToEliminate === null}
            className={`w-full py-4 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-200 ${
              selectedPlayerToEliminate !== null
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Eliminasi Player
          </Button>
        </div>
      </div>
    </div>
  );
};