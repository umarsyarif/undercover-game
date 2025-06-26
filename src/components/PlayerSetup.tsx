import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Minus, Plus } from 'lucide-react';

interface PlayerSetupProps {
  totalPlayers: number;
  civilians: number;
  undercover: number;
  mrWhite: number;
  onTotalPlayersChange: (value: number[]) => void;
  onUndercoverChange: (increment: boolean) => void;
  onMrWhiteChange: (increment: boolean) => void;
  canIncreaseUndercover: () => boolean;
  canDecreaseUndercover: () => boolean;
  canIncreaseMrWhite: () => boolean;
  canDecreaseMrWhite: () => boolean;
  isStartButtonEnabled: () => boolean;
  onStart: () => void;
  availableWords: number;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({
  totalPlayers,
  civilians,
  undercover,
  mrWhite,
  onTotalPlayersChange,
  onUndercoverChange,
  onMrWhiteChange,
  canIncreaseUndercover,
  canDecreaseUndercover,
  canIncreaseMrWhite,
  canDecreaseMrWhite,
  isStartButtonEnabled,
  onStart,
  availableWords
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 w-screen">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 w-screen">
        <div className="w-full max-w-lg mx-auto">
          <div className="flex flex-col gap-8 p-6 sm:p-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Undercover</h1>
              <p className="text-lg text-gray-600">Atur Pemain</p>
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                {availableWords} kata tersedia
              </div>
            </div>

            {/* Player Configuration */}
            <div className="space-y-8">
              {/* Total Players Slider */}
              <Card className="p-6 shadow-md">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-base font-medium text-gray-700">Pemain</label>
                    <span className="text-2xl font-bold text-blue-600">{totalPlayers}</span>
                  </div>
                  <Slider
                    value={[totalPlayers]}
                    onValueChange={onTotalPlayersChange}
                    max={20}
                    min={3}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>3</span>
                    <span>20</span>
                  </div>
                </div>
              </Card>

              {/* Role Distribution */}
              <Card className="p-6 shadow-md space-y-6">
                {/* Civilians Display */}
                <div className="flex items-center justify-center">
                  <div className="bg-blue-500 text-white px-8 py-3 rounded-full text-base font-medium">
                    {civilians} Civilian
                  </div>
                </div>

                {/* Undercover */}
                <div className="flex items-center justify-center relative">
                  {canDecreaseUndercover() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute left-0 h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-50"
                      onClick={() => onUndercoverChange(false)}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                  )}
                  
                  <div className="bg-black text-white px-8 py-3 rounded-full text-base font-medium">
                    {undercover} Undercover
                  </div>
                  
                  {canIncreaseUndercover() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-0 h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-50"
                      onClick={() => onUndercoverChange(true)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {/* Mr. White */}
                <div className="flex items-center justify-center relative">
                  {canDecreaseMrWhite() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute left-0 h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-50"
                      onClick={() => onMrWhiteChange(false)}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                  )}
                  
                  <div className="bg-white text-black border-2 border-gray-300 px-8 py-3 rounded-full text-base font-medium">
                    {mrWhite} Mr. White
                  </div>
                  
                  {canIncreaseMrWhite() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-0 h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-50"
                      onClick={() => onMrWhiteChange(true)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </Card>

              {/* Error Message */}
              {!isStartButtonEnabled() && totalPlayers >= 3 && (
                <div className="text-center text-sm text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
                  {civilians < 2 ? 'Minimal 2 civilian diperlukan' : 
                   (undercover + mrWhite) === 0 ? 'Minimal 1 undercover atau Mr. White diperlukan' :
                   'Civilian harus lebih banyak dari undercover dan Mr. White'}
                </div>
              )}
            </div>
          </div>

          {/* Start Button */}
          <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-1/2 lg:right-auto lg:transform lg:-translate-x-1/2 lg:w-full lg:max-w-lg lg:px-0">
            <div className="px-6 sm:px-8 lg:px-6">
              <Button
                onClick={onStart}
                disabled={!isStartButtonEnabled()}
                className={`w-full py-4 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-200 ${
                  isStartButtonEnabled()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Mulai
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};