/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useToastStore, ToastItem } from '../store/useToastStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  const getIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#FFCD11]" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBorderColor = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-4 border-l-emerald-500 border-zinc-200';
      case 'warning':
        return 'border-l-4 border-l-[#FFCD11] border-zinc-200';
      case 'error':
        return 'border-l-4 border-l-red-500 border-zinc-200';
      case 'info':
      default:
        return 'border-l-4 border-l-blue-500 border-zinc-200';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            className={`p-4 rounded-xl shadow-lg border bg-white ${getBorderColor(
              toast.type
            )} flex items-start justify-between space-x-3 pointer-events-auto leading-relaxed`}
          >
            <div className="flex items-start space-x-3 text-xs leading-relaxed">
              <div className="mt-0.5 flex-shrink-0">{getIcon(toast.type)}</div>
              <div className="space-y-1">
                <p className="font-extrabold text-zinc-900 pr-1 leading-snug">{toast.message}</p>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                    className="text-[10px] text-zinc-950 font-black uppercase tracking-wider bg-zinc-100 hover:bg-[#FFCD11] py-1 px-2.5 rounded border border-zinc-300 shadow-xs cursor-pointer duration-150 inline-block active:scale-95"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black hover:border-zinc-300 border border-transparent flex-shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
