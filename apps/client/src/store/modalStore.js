import { create } from 'zustand';

const useModalStore = create((set) => ({
  isOpen: false,
  selectedImage: null,
  openModal: (imageData) => set({ isOpen: true, selectedImage: imageData }),
  closeModal: () => set({ isOpen: false, selectedImage: null }),
}));

export default useModalStore;
