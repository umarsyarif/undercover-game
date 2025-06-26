import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface RefreshButtonProps {
  onClick: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  isRefreshing,
  disabled = false
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        onClick={onClick}
        disabled={isRefreshing || disabled}
        className={`w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition-all duration-200 ${
          isRefreshing ? 'animate-pulse' : 'hover:scale-105'
        }`}
      >
        <RotateCcw 
          className={`h-6 w-6 transition-transform duration-500 ${
            isRefreshing ? 'animate-spin' : ''
          }`} 
        />
      </Button>
      <p className="text-sm text-gray-600 text-center max-w-xs">
        Klik untuk mendapatkan pasangan kata baru
      </p>
    </div>
  );
};