import React from 'react';
import { Button } from '@/components/ui/button';
import { GameHeader } from './GameHeader';
import { GameStatus } from './GameStatus';
import { GameCard } from './GameCard';
import type { Player } from '../types/gameTypes';

interface DescriptionPhaseProps {
  orderedPlayers: Player[];
  round: number;
  onBack: () => void;
  onGoToVoting: () => void;
  getRemainingCounts: () => { undercovers: number; mrWhites: number; total: number };
}

export const DescriptionPhase: React.FC<DescriptionPhaseProps> = ({
  orderedPlayers,
  round,
  onBack,
  onGoToVoting,
  getRemainingCounts
}) => {
  const remainingCounts = getRemainingCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 w-screen">
      <GameHeader
        title="Deskripsi Waktu"
        subtitle="Jelaskan kata rahasiamu dalam urutan yang ditunjukkan"
        onBack={onBack}
        variant="description"
      />

      <GameStatus
        remainingCounts={remainingCounts}
        round={round}
      />

      {/* Player Order Cards - Grid Layout */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600">
              Urutan berbicara (Player aktif):
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {orderedPlayers.map((player, index) => (
              <GameCard
                key={player.id}
                index={player.id}
                player={player}
                variant="player"
                orderNumber={index + 1}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Vote Button */}
      <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-1/2 lg:right-auto lg:transform lg:-translate-x-1/2 lg:w-full lg:max-w-lg lg:px-0">
        <div className="px-6 sm:px-8 lg:px-6">
          <Button 
            onClick={onGoToVoting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 text-lg font-semibold rounded-2xl shadow-lg"
          >
            Pergi ke Voting
          </Button>
        </div>
      </div>
    </div>
  );
};