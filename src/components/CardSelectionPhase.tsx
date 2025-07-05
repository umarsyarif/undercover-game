import React from 'react';
import { GameHeader } from './GameHeader';
import { GameStatus } from './GameStatus';
import { GameCard } from './GameCard';
import { RefreshButton } from './RefreshButton';
import type { GameState, Player } from '../types/gameTypes';

interface CardSelectionPhaseProps {
  gameState: GameState;
  totalPlayers: number;
  isRefreshing: boolean;
  onBack: () => void;
  onCardSelect: (cardIndex: number) => void;
  onRefreshWords: () => void;
  getPlayerByCardIndex: (cardIndex: number) => Player | undefined | null;
  isCardAvailable: (cardIndex: number) => boolean;
  getRemainingCounts: () => { undercovers: number; mrWhites: number; total: number };
}

export const CardSelectionPhase: React.FC<CardSelectionPhaseProps> = ({
  gameState,
  totalPlayers,
  isRefreshing,
  onBack,
  onCardSelect,
  onRefreshWords,
  getPlayerByCardIndex,
  isCardAvailable,
  getRemainingCounts
}) => {
  const remainingCounts = getRemainingCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 w-screen">
      <GameHeader
        title={`Player ${gameState.currentPlayerIndex + 1}`}
        subtitle="Pilih kartu"
        onBack={onBack}
        variant="card-selection"
      />

      <GameStatus
        remainingCounts={remainingCounts}
        round={gameState.round}
      />

      {/* Cards Grid - Same layout as description phase */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            {Array.from({ length: totalPlayers }, (_, index) => {
              const playerAtCard = getPlayerByCardIndex(index);
              const isSelected = gameState.selectedCard === index;
              const isAvailable = isCardAvailable(index);
              
              return (
                <GameCard
                  key={index}
                  index={index}
                  player={playerAtCard}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  onClick={() => isAvailable && onCardSelect(index)}
                  variant="selection"
                />
              );
            })}
          </div>

          <div className="flex justify-center">
            <RefreshButton
              onClick={onRefreshWords}
              isRefreshing={isRefreshing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};