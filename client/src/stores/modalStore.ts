import { create } from 'zustand';
import React from 'react';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success' | 'primary';

export interface ConfirmModalOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  isAlert?: boolean;
}

interface ModalState {
  isOpen: boolean;
  options: ConfirmModalOptions | null;
  resolver: ((value: boolean) => void) | null;
  openModal: (options: ConfirmModalOptions) => Promise<boolean>;
  closeModal: (result: boolean) => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  options: null,
  resolver: null,

  openModal: (options: ConfirmModalOptions) => {
    // If a modal is already open, resolve the previous one as false
    const currentResolver = get().resolver;
    if (currentResolver) {
      currentResolver(false);
    }

    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolver: resolve,
      });
    });
  },

  closeModal: (result: boolean) => {
    const { resolver } = get();
    if (resolver) {
      resolver(result);
    }
    set({
      isOpen: false,
      options: null,
      resolver: null,
    });
  },
}));
