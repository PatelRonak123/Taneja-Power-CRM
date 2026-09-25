import React from 'react';
import { useModalStore, ConfirmModalOptions, ModalVariant } from '../stores/modalStore';

export type { ConfirmModalOptions, ModalVariant };

export interface ConfirmFn {
  (options: ConfirmModalOptions): Promise<boolean>;
  danger: (title: string, message: string | React.ReactNode, confirmText?: string) => Promise<boolean>;
  warning: (title: string, message: string | React.ReactNode, confirmText?: string) => Promise<boolean>;
  info: (title: string, message: string | React.ReactNode, confirmText?: string) => Promise<boolean>;
  alert: (
    title: string,
    message: string | React.ReactNode,
    options?: Partial<Omit<ConfirmModalOptions, 'title' | 'message'>>
  ) => Promise<boolean>;
}

const baseConfirm = (options: ConfirmModalOptions): Promise<boolean> => {
  return useModalStore.getState().openModal(options);
};

export const confirmModal: ConfirmFn = Object.assign(baseConfirm, {
  danger: (title: string, message: string | React.ReactNode, confirmText = 'Delete') => {
    return useModalStore.getState().openModal({
      title,
      message,
      variant: 'danger',
      confirmText,
      cancelText: 'Cancel',
    });
  },

  warning: (title: string, message: string | React.ReactNode, confirmText = 'Proceed') => {
    return useModalStore.getState().openModal({
      title,
      message,
      variant: 'warning',
      confirmText,
      cancelText: 'Cancel',
    });
  },

  info: (title: string, message: string | React.ReactNode, confirmText = 'Confirm') => {
    return useModalStore.getState().openModal({
      title,
      message,
      variant: 'info',
      confirmText,
      cancelText: 'Cancel',
    });
  },

  alert: (
    title: string,
    message: string | React.ReactNode,
    options?: Partial<Omit<ConfirmModalOptions, 'title' | 'message'>>
  ) => {
    return useModalStore.getState().openModal({
      title,
      message,
      isAlert: true,
      confirmText: options?.confirmText || 'OK',
      variant: options?.variant || 'info',
      ...options,
    });
  },
});

export default confirmModal;
