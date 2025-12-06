import { useGalaxyStore, type ModalId } from "../store/useGalaxyStore";

type NonNullModalId = Exclude<ModalId, null>;

export function useModal(modalId: NonNullModalId) {
  const activeModal = useGalaxyStore((s) => s.activeModal);
  const setActiveModal = useGalaxyStore((s) => s.setActiveModal);

  return {
    isOpen: activeModal === modalId,
    open: () => setActiveModal(modalId),
    close: () => setActiveModal(null),
  };
}
