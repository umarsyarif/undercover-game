import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle, Home, Crown } from 'lucide-react';

interface GameHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onHome?: () => void;
  showHelp?: boolean;
  variant?: 'default' | 'card-selection' | 'description' | 'voting' | 'game-over';
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onHome,
  showHelp = true,
  variant = 'default'
}) => {
  const getHeaderColors = () => {
    switch (variant) {
      case 'card-selection':
        return 'bg-gray-800 text-white';
      case 'description':
        return 'bg-gray-800 text-white';
      case 'voting':
        return 'bg-orange-600 text-white';
      case 'game-over':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-gray-800 text-white';
    }
  };

  const getHoverColors = () => {
    switch (variant) {
      case 'card-selection':
      case 'description':
        return 'hover:bg-gray-700';
      case 'voting':
        return 'hover:bg-orange-700';
      case 'game-over':
        return 'hover:bg-yellow-700';
      default:
        return 'hover:bg-gray-700';
    }
  };

  const getTitleColor = () => {
    switch (variant) {
      case 'card-selection':
        return 'text-cyan-400';
      case 'description':
        return 'text-green-400';
      default:
        return '';
    }
  };

  const getSubtitleColor = () => {
    switch (variant) {
      case 'card-selection':
        return 'text-gray-300';
      case 'description':
        return 'text-gray-300';
      case 'voting':
        return 'text-orange-100';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className={`${getHeaderColors()} p-4 flex items-center justify-between`}>
      {/* Left Button */}
      <div className="w-10">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className={`text-white ${getHoverColors()}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {onHome && !onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onHome}
            className={`text-white ${getHoverColors()}`}
          >
            <Home className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Center Content */}
      <div className="text-center flex-1">
        <h2 className={`text-xl font-bold ${getTitleColor()}`}>
          {variant === 'game-over' ? (
            <span className="flex items-center justify-center gap-2">
              <Crown className="h-6 w-6" />
              {title}
            </span>
          ) : (
            title
          )}
        </h2>
        {subtitle && (
          <p className={`${getSubtitleColor()} text-sm`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Button */}
      <div className="w-10">
        {showHelp && (
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-white ${getHoverColors()}`}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};