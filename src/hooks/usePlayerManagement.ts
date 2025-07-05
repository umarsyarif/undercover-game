import { useState, useEffect, useCallback } from 'react';

interface PlayerConfig {
  totalPlayers: number;
  undercover: number;
  mrWhite: number;
  civilians: number;
}

export const usePlayerManagement = () => {
  const [totalPlayers, setTotalPlayers] = useState(3);
  const [undercover, setUndercover] = useState(1);
  const [mrWhite, setMrWhite] = useState(0);
  const [civilians, setCivilians] = useState(2);
  const [playerName, setPlayerName] = useState('');

  // Calculate civilians whenever other values change
  useEffect(() => {
    const calculatedCivilians = totalPlayers - undercover - mrWhite;
    setCivilians(calculatedCivilians);
  }, [totalPlayers, undercover, mrWhite]);

  // Auto-adjust undercover when total players change
  useEffect(() => {
    const maxAllowedSpecial = Math.floor((totalPlayers - 2) / 2);
    const currentSpecial = undercover + mrWhite;
    
    if (currentSpecial >= totalPlayers - 1) {
      const newUndercover = Math.max(1, Math.min(undercover, maxAllowedSpecial - mrWhite));
      if (newUndercover !== undercover) {
        setUndercover(newUndercover);
      }
    }
  }, [totalPlayers, mrWhite]);

  // Validation functions
  const canIncreaseUndercover = useCallback(() => {
    const newTotal = (undercover + 1) + mrWhite;
    const newCivilians = totalPlayers - newTotal;
    return newCivilians > newTotal;
  }, [undercover, mrWhite, totalPlayers]);

  const canDecreaseUndercover = useCallback(() => {
    return undercover > 0 && (undercover > 1 || mrWhite > 0);
  }, [undercover, mrWhite]);

  const canIncreaseMrWhite = useCallback(() => {
    const newTotal = undercover + (mrWhite + 1);
    const newCivilians = totalPlayers - newTotal;
    return newCivilians > newTotal;
  }, [undercover, mrWhite, totalPlayers]);

  const canDecreaseMrWhite = useCallback(() => {
    return mrWhite > 0;
  }, [mrWhite]);

  const isStartButtonEnabled = useCallback(() => {
    return totalPlayers >= 3 && 
           civilians >= 2 && 
           (undercover + mrWhite) > 0 && 
           civilians > (undercover + mrWhite);
  }, [totalPlayers, civilians, undercover, mrWhite]);

  // Handler functions
  const handleTotalPlayersChange = useCallback((value: number[]) => {
    setTotalPlayers(value[0]);
  }, []);

  const handleUndercoverChange = useCallback((increment: boolean) => {
    if (increment && canIncreaseUndercover()) {
      setUndercover(prev => prev + 1);
    } else if (!increment && canDecreaseUndercover()) {
      setUndercover(prev => prev - 1);
    }
  }, [canIncreaseUndercover, canDecreaseUndercover]);

  const handleMrWhiteChange = useCallback((increment: boolean) => {
    if (increment && canIncreaseMrWhite()) {
      setMrWhite(prev => prev + 1);
    } else if (!increment && canDecreaseMrWhite()) {
      setMrWhite(prev => prev - 1);
    }
  }, [canIncreaseMrWhite, canDecreaseMrWhite]);

  const resetPlayerName = useCallback(() => {
    setPlayerName('');
  }, []);

  const getPlayerConfig = useCallback((): PlayerConfig => ({
    totalPlayers,
    undercover,
    mrWhite,
    civilians
  }), [totalPlayers, undercover, mrWhite, civilians]);

  return {
    // State
    totalPlayers,
    undercover,
    mrWhite,
    civilians,
    playerName,
    
    // Setters
    setTotalPlayers,
    setUndercover,
    setMrWhite,
    setCivilians,
    setPlayerName,
    resetPlayerName,
    
    // Validation functions
    canIncreaseUndercover,
    canDecreaseUndercover,
    canIncreaseMrWhite,
    canDecreaseMrWhite,
    isStartButtonEnabled,
    
    // Handler functions
    handleTotalPlayersChange,
    handleUndercoverChange,
    handleMrWhiteChange,
    
    // Utility
    getPlayerConfig
  };
};