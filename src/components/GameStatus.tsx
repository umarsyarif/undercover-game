import React from 'react';
import { User, Skull } from 'lucide-react';

interface GameStatusProps {
  remainingCounts: {
    undercovers: number;
    mrWhites: number;
    total: number;
  };
  round: number;
  variant?: 'infiltrator' | 'elimination';
}

export const GameStatus: React.FC<GameStatusProps> = ({
  remainingCounts,
  round,
  variant = 'infiltrator'
}) => {
  const getIcon = () => {
    return variant === 'elimination' ? <Skull className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const getLabel = () => {
    return variant === 'elimination' ? 'Penyusup tersisa' : 'Penyusup tersisa';
  };

  return (
    <div className="p-4 flex justify-center gap-4">
      <div className="bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-2">
        {getIcon()}
        <span className="font-medium">{getLabel()}</span>
        <div className="flex items-center gap-1">
          {remainingCounts.undercovers > 0 && (
            <span className="bg-black text-white px-2 py-1 rounded text-sm">
              {remainingCounts.undercovers}U
            </span>
          )}
          {remainingCounts.mrWhites > 0 && (
            <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm">
              {remainingCounts.mrWhites}W
            </span>
          )}
        </div>
      </div>
      <div className="bg-gray-100 px-4 py-2 rounded-lg">
        <span className="text-gray-600">Round</span>
        <span className="ml-2 font-medium">{round}</span>
      </div>
    </div>
  );
};