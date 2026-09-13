import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail } from 'lucide-react';
import { AuthForm } from './AuthForm';

interface AuthGateProps {
  onSignedIn: (message: string) => void;
  onContinueAsGuest: () => void;
  /** True when the player arrived via an email sign-in link opened on a
   * different device/browser than the one that requested it, so the stored
   * address isn't available and we need to ask for it once to finish. */
  pendingLinkConfirm?: boolean;
  onConfirmLinkEmail?: (email: string) => void;
}

function ConfirmLinkEmail({ onConfirm }: { onConfirm: (email: string) => void }) {
  const [email, setEmail] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (email.trim()) onConfirm(email.trim()); }}
      className="flex flex-col gap-4 w-full"
    >
      <p className="text-sm" style={{ color: 'var(--hero-ink-dim)' }}>
        Confirm the email you used to request this sign-in link.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-link-email" className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hero-ink-dim)' }}>Email</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            id="confirm-link-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="field-input w-full"
            style={{ paddingLeft: 34 }}
            placeholder="you@example.com"
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary w-full" style={{ padding: 13 }}>
        Finish signing in
      </button>
    </form>
  );
}

/** The front door: the game itself isn't reachable until this resolves to
 * either a signed-in user or an explicit guest choice (see App.tsx's
 * top-level gate). Guest mode exists as a deliberate escape hatch for when
 * sign-in providers aren't configured yet — see the "Continue as guest" link. */
export function AuthGate({ onSignedIn, onContinueAsGuest, pendingLinkConfirm, onConfirmLinkEmail }: AuthGateProps) {
  return (
    <div className="home-hero">
      <div className="home-hero-glow" />
      <div className="home-hero-beam" />
      <div className="home-hero-beam b2" />
      <div className="home-hero-grain" />
      <div className="home-hero-vignette" />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-6 py-10">
        <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 text-center lg:text-left"
          >
            <div className="text-xs font-bold uppercase tracking-[0.25em] mb-4" style={{ color: 'var(--hero-gold)' }}>
              Season 04 · Deadline Day
            </div>
            <h1 className="home-wordmark" style={{ fontSize: 'clamp(38px, 6.5vw, 76px)' }}>
              Ultimate<br />Auction
            </h1>
            <p className="mt-5 text-base max-w-sm mx-auto lg:mx-0" style={{ color: 'var(--hero-ink-dim)' }}>
              Sign in or create an account to draft your XXIII — your squad, budget, and season are saved to your account.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-sm shrink-0 rounded-md p-6"
            style={{ background: 'rgba(11,18,16,0.55)', border: '1px solid rgba(237,239,232,0.14)', backdropFilter: 'blur(6px)' }}
          >
            {pendingLinkConfirm && onConfirmLinkEmail ? (
              <ConfirmLinkEmail onConfirm={onConfirmLinkEmail} />
            ) : (
              <>
                <AuthForm dark onSignedIn={onSignedIn} />
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="text-sm text-center mt-4 w-full underline"
                  style={{ color: 'var(--hero-ink-dim)' }}
                >
                  Continue as guest
                </button>
                <p className="text-[11px] text-center mt-2" style={{ color: 'rgba(154,167,156,0.6)' }}>
                  No cloud save — you can sign in any time from the game menu.
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
