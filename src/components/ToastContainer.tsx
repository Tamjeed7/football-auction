import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastMessage } from '../hooks/useAuctionGame';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const icons = {
  info: <Info className="text-blue-400" size={20} />,
  success: <CheckCircle2 className="text-emerald-400" size={20} />,
  error: <XCircle className="text-rose-400" size={20} />,
  warning: <AlertCircle className="text-amber-400" size={20} />
};

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border bg-black/90 backdrop-blur-md ${
              toast.type === 'success' ? 'border-emerald-500/30' :
              toast.type === 'error' ? 'border-rose-500/30' :
              toast.type === 'warning' ? 'border-amber-500/30' :
              'border-blue-500/30'
            }`}
          >
            <div className="shrink-0">{icons[toast.type]}</div>
            <div className="flex-1 text-sm font-bold text-white">{toast.message}</div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-gray-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
