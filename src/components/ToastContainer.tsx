import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastMessage } from '../hooks/useAuctionGame';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const icons = {
  info: <Info size={18} style={{ color: 'var(--color-ink-muted)' }} />,
  success: <CheckCircle2 size={18} style={{ color: 'var(--color-green-strong)' }} />,
  error: <XCircle size={18} style={{ color: 'var(--color-red)' }} />,
  warning: <AlertCircle size={18} style={{ color: 'var(--color-gold-strong)' }} />
};

const accentVar = {
  info: 'var(--color-rule-strong)',
  success: 'var(--color-green)',
  error: 'var(--color-red)',
  warning: 'var(--color-gold)'
};

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.22 }}
            className="receipt-toast pointer-events-auto"
            style={{ borderLeftColor: accentVar[toast.type] }}
          >
            <div className="shrink-0">{icons[toast.type]}</div>
            <div className="flex-1 text-sm font-medium text-ink">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-ink-faint hover:text-ink transition-colors"
            >
              <X size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
