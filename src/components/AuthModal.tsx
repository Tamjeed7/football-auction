import React from 'react';
import { X } from 'lucide-react';
import { AuthForm } from './AuthForm';

interface AuthModalProps {
  onClose: () => void;
  onSignedIn: (message: string) => void;
}

export function AuthModal({ onClose, onSignedIn }: AuthModalProps) {
  return (
    <div className="fixed inset-0 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="ledger-card w-full max-w-sm overflow-hidden">
        <div className="ledger-card-head">
          <div>
            <h2 className="text-xl font-semibold text-ink">Account</h2>
            <p className="ledger-tag mt-1">Access your saved squads</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-[rgba(0,0,0,0.06)] rounded-md text-ink-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <AuthForm onSignedIn={(message) => { onSignedIn(message); onClose(); }} />
        </div>
      </div>
    </div>
  );
}
