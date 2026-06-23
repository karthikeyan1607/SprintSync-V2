/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  action?: ToastAction;
  duration?: number;
}

interface ToastStoreState {
  toasts: ToastItem[];
  addToast: (
    message: string,
    type?: ToastItem['type'],
    action?: ToastAction,
    duration?: number
  ) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', action, duration = 4000) => {
    const id = `toast-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = { id, message, type, action, duration };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((current) => ({
          toasts: current.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));
