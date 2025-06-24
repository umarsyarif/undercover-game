import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { WordService } from '../services/wordService';

interface WordManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWordsUpdated: () => void;
}

export const WordManagementModal: React.FC<WordManagementModalProps> = ({
  isOpen,
  onClose,
  onWordsUpdated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numberOfWords, setNumberOfWords] = useState(5);
  const [showNumberInput, setShowNumberInput] = useState(false);

  const handleReuseWords = () => {
    WordService.resetAllWords();
    onWordsUpdated();
    onClose();
  };

  const handleGetNewWords = () => {
    setShowNumberInput(true);
    setError(null);
  };

  const handleFetchNewWords = async () => {
    if (numberOfWords < 1 || numberOfWords > 50) {
      setError('Please enter a number between 1 and 50');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newWords = await WordService.fetchNewWords(numberOfWords);
      WordService.addNewWords(newWords);
      onWordsUpdated();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch new words');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowNumberInput(false);
    setError(null);
    setNumberOfWords(5);
    onClose();
  };

  const totalWords = WordService.getTotalWordCount();
  const playedWords = WordService.getPlayedWordCount();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            🎯 All Words Used!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Word Statistics</p>
              <div className="flex justify-center gap-4">
                <div>
                  <span className="text-2xl font-bold text-blue-600">{playedWords}</span>
                  <p className="text-xs text-gray-500">Played</p>
                </div>
                <div className="text-gray-300">/</div>
                <div>
                  <span className="text-2xl font-bold text-gray-700">{totalWords}</span>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </Card>

          {!showNumberInput ? (
            <>
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  You've used all available word pairs! Choose an option to continue:
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <Button
                  onClick={handleGetNewWords}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Get New Words from API
                </Button>

                <Button
                  onClick={handleReuseWords}
                  variant="outline"
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2 border-2 border-blue-300 hover:bg-blue-50"
                >
                  <RefreshCw className="h-5 w-5" />
                  Reuse Existing Words
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  How many new word pairs would you like to fetch?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of word pairs (1-50)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={numberOfWords}
                    onChange={(e) => setNumberOfWords(parseInt(e.target.value) || 1)}
                    className="text-center text-lg"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowNumberInput(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleFetchNewWords}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Fetching...
                      </>
                    ) : (
                      'Fetch Words'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};