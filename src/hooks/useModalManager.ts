import { useState, useCallback } from 'react';

interface ModalState {
  showNameModal: boolean;
  showWordModal: boolean;
  showTurnModal: boolean;
  showEliminationModal: boolean;
  showMrWhiteGuessModal: boolean;
  showGameOverModal: boolean;
  showWordManagementModal: boolean;
}

type ModalName = keyof ModalState;

export const useModalManager = () => {
  const [modals, setModals] = useState<ModalState>({
    showNameModal: false,
    showWordModal: false,
    showTurnModal: false,
    showEliminationModal: false,
    showMrWhiteGuessModal: false,
    showGameOverModal: false,
    showWordManagementModal: false
  });

  const openModal = useCallback((modalName: ModalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName: ModalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals({
      showNameModal: false,
      showWordModal: false,
      showTurnModal: false,
      showEliminationModal: false,
      showMrWhiteGuessModal: false,
      showGameOverModal: false,
      showWordManagementModal: false
    });
  }, []);

  const toggleModal = useCallback((modalName: ModalName) => {
    setModals(prev => ({ ...prev, [modalName]: !prev[modalName] }));
  }, []);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    toggleModal,
    // Individual modal getters for convenience
    showNameModal: modals.showNameModal,
    showWordModal: modals.showWordModal,
    showTurnModal: modals.showTurnModal,
    showEliminationModal: modals.showEliminationModal,
    showMrWhiteGuessModal: modals.showMrWhiteGuessModal,
    showGameOverModal: modals.showGameOverModal,
    showWordManagementModal: modals.showWordManagementModal
  };
};