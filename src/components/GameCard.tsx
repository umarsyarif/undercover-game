import React from 'react';
import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';
import type { Player } from '../types/gameTypes';

interface GameCardProps {
  index: number;
  player?: Player;
  isSelected?: boolean;
  isAvailable?: boolean;
  onClick?: () => void;
  variant?: 'selection' | 'player' | 'voting';
  orderNumber?: number;
  showEliminated?: boolean;
  className?: string;
}

export const GameCard: React.FC<GameCardProps> = ({
  index,
  player,
  isSelected = false,
  isAvailable = true,
  onClick,
  variant = 'selection',
  orderNumber,
  showEliminated = false,
  className = ''
}) => {
  const getCardColors = () => {
    if (variant === 'voting' && player) {
      const colors = ['bg-green-500', 'bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-red-500'];
      return colors[(player.id - 1) % colors.length];
    }
    
    if (variant === 'player') {
      return 'bg-green-500';
    }
    
    if (player) {
      return 'bg-green-500';
    }
    
    return isSelected ? 'bg-yellow-500 hover:bg-yellow-600 ring-4 ring-blue-500 scale-105' : 'bg-yellow-400 hover:bg-yellow-500';
  };

  const getCardContent = () => {
    if (player) {
      return (
        <>
          <div className="text-3xl sm:text-4xl font-bold mb-2">
            {player.name?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="text-xs sm:text-sm font-medium text-center px-2 leading-tight">
            {player.name || `Player ${player.id}`}
          </div>
        </>
      );
    }
    
    return <User className="h-12 w-12 sm:h-16 sm:w-16 text-white drop-shadow-lg" />;
  };

  const getBadges = () => {
    const badges = [];
    
    // Order number badge
    if (orderNumber !== undefined) {
      badges.push(
        <div key="order" className="absolute -top-2 -right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-gray-200">
          {orderNumber}
        </div>
      );
    }
    
    // Selection badge
    if (isSelected && !player?.isEliminated) {
      badges.push(
        <div key="selected" className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-white">
          ✓
        </div>
      );
    }
    
    // Elimination badge
    if (player?.isEliminated && showEliminated) {
      badges.push(
        <div key="eliminated" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-white">
          ✕
        </div>
      );
    }
    
    return badges;
  };

  const getStatusText = () => {
    if (variant === 'voting' && player) {
      if (isSelected && !player.isEliminated) {
        return (
          <div className="mt-2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            Eliminasi
          </div>
        );
      }
      
      if (player.isEliminated) {
        return (
          <div className="mt-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            Eliminated
          </div>
        );
      }
    }
    
    return null;
  };

  const isClickable = isAvailable && onClick && !player?.isEliminated;
  const isEliminated = player?.isEliminated && showEliminated;

  return (
    <Card
      className={`
        aspect-[3/4] transition-all duration-200 shadow-lg relative flex flex-col items-center justify-center p-4
        ${getCardColors()}
        ${isClickable ? 'cursor-pointer' : ''}
        ${isEliminated ? 'opacity-60 cursor-not-allowed' : ''}
        ${!isAvailable && !player ? 'opacity-50 cursor-not-allowed' : ''}
        text-white
        ${className}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      {getBadges()}
      {getCardContent()}
      {getStatusText()}
    </Card>
  );
};