import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, LogIn, Send, CheckCircle2 } from 'lucide-react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { sendMagicLink } from '../lib/emailLinkAuth';

interface AuthFormProps {
  onSignedIn: (message: string) => void;
  dark?: boolean;
}

type Mode = 'LOGIN' | 'SIGNUP' | 'MAGIC_LINK';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyAuthError(code: string, provider: 'password' | 'google' | 'link'): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email — try signing in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'Enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts — please wait a moment and try again.';
    case 'auth/quota-exceeded':
      return 'Too many sign-in emails sent — please wait a while and try again.';
    case 'auth/operation-not-allowed':
      if (provider === 'google') return 'Google sign-in is not enabled for this game yet.';
      if (provider === 'link') return 'Email-link sign-in is not enabled for this game yet.';
      return 'Email sign-in is not enabled for this game yet.';
    case 'auth/unauthorized-domain':
    case 'auth/unauthorized-continue-uri':
      return 'This site is not yet authorized for sign-in — add it under Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    default:
      return code ? `Something went wrong (${code}). Please try again.` : 'Something went wrong. Please try again.';
  }
}

/** The actual signup/login form + logic, shared by the full-screen AuthGate
 * and (if ever needed again) a modal wrapper — one implementation, so
 * validation and error handling can't drift between the two surfaces. */
export function AuthForm({ onSignedIn, dark }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, [mode]);

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';

    if (mode !== 'MAGIC_LINK') {
      if (!password) errors.password = 'Password is required.';
      else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';

      if (mode === 'SIGNUP' && confirmPassword !== password) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'MAGIC_LINK') {
        await sendMagicLink(email);
        setLinkSent(true);
      } else if (mode === 'LOGIN') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onSignedIn('Signed in successfully!');
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        onSignedIn('Account created — welcome!');
      }
    } catch (err: any) {
      console.error('[auth/' + (mode === 'MAGIC_LINK' ? 'link' : 'password') + ']', err?.code, err?.message);
      setFormError(friendlyAuthError(err?.code || '', mode === 'MAGIC_LINK' ? 'link' : 'password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError(null);
    setFieldErrors({});
    setLinkSent(false);
  };

  const handleGoogle = async () => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onSignedIn('Signed in successfully!');
    } catch (err: any) {
      console.error('[auth/google]', err?.code, err?.message);
      const msg = friendlyAuthError(err?.code || '', 'google');
      if (msg) setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelClass = dark ? 'text-xs font-semibold uppercase tracking-wide' : 'text-xs font-semibold uppercase tracking-wide text-ink-muted';
  const labelStyle = dark ? { color: 'var(--hero-ink-dim)' } : undefined;
  const toggleStyle = dark ? { color: 'var(--hero-ink-dim)' } : undefined;
  const toggleStrongStyle = dark ? { color: 'var(--hero-ink)' } : undefined;

  if (linkSent) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <CheckCircle2 size={32} style={{ color: 'var(--hero-gold, #A8791F)' }} />
        <p className="text-sm font-semibold" style={toggleStrongStyle}>Check your email</p>
        <p className="text-sm" style={toggleStyle}>
          We sent a sign-in link to <strong style={toggleStrongStyle}>{email.trim()}</strong>. Open it on this device to finish signing in — the tab can stay open while you check.
        </p>
        <button type="button" onClick={() => switchMode('MAGIC_LINK')} className="text-sm underline mt-1" style={toggleStyle}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
      {formError && (
        <div role="alert" aria-live="assertive" className="text-sm font-semibold text-red bg-[rgba(200,16,46,0.08)] border border-[rgba(200,16,46,0.3)] rounded-md px-3 py-2">
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="auth-email" className={labelClass} style={labelStyle}>Email</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            id="auth-email"
            ref={emailInputRef}
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
            className="field-input w-full"
            style={{ paddingLeft: 34 }}
            placeholder="you@example.com"
          />
        </div>
        {fieldErrors.email && <p id="auth-email-error" className="text-xs font-semibold text-red">{fieldErrors.email}</p>}
      </div>

      {mode !== 'MAGIC_LINK' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className={labelClass} style={labelStyle}>Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
              className="field-input w-full"
              style={{ paddingLeft: 34 }}
              placeholder="••••••••"
            />
          </div>
          {fieldErrors.password && <p id="auth-password-error" className="text-xs font-semibold text-red">{fieldErrors.password}</p>}
        </div>
      )}

      {mode === 'SIGNUP' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-confirm" className={labelClass} style={labelStyle}>Confirm password</label>
          <input
            id="auth-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            aria-invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? 'auth-confirm-error' : undefined}
            className="field-input w-full"
            placeholder="••••••••"
          />
          {fieldErrors.confirmPassword && <p id="auth-confirm-error" className="text-xs font-semibold text-red">{fieldErrors.confirmPassword}</p>}
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full" style={{ padding: 13 }}>
        {mode === 'MAGIC_LINK'
          ? (<><Send size={15} /> {isSubmitting ? 'Sending…' : 'Email me a sign-in link'}</>)
          : (isSubmitting ? 'Please wait…' : mode === 'LOGIN' ? 'Sign in' : 'Create account')}
      </button>

      {mode !== 'MAGIC_LINK' && (
        <>
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-rule" style={dark ? { background: 'rgba(237,239,232,0.14)' } : undefined} />
            <span className="text-[11px] uppercase tracking-wide text-ink-faint" style={toggleStyle}>or</span>
            <div className="flex-1 h-px bg-rule" style={dark ? { background: 'rgba(237,239,232,0.14)' } : undefined} />
          </div>

          <button type="button" onClick={handleGoogle} disabled={isSubmitting} className="btn btn-secondary w-full" style={{ padding: 12 }}>
            <LogIn size={15} /> Continue with Google
          </button>

          <button type="button" onClick={() => switchMode('MAGIC_LINK')} className="text-sm text-center underline" style={toggleStyle}>
            Email me a sign-in link instead
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => switchMode(mode === 'MAGIC_LINK' ? 'LOGIN' : mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
        className="text-sm text-center mt-1"
        style={toggleStyle}
      >
        {mode === 'MAGIC_LINK'
          ? (<>Prefer a password? <span className="font-semibold underline" style={toggleStrongStyle}>Sign in</span></>)
          : (<>{mode === 'LOGIN' ? "Don't have an account? " : 'Already have an account? '}<span className="font-semibold underline" style={toggleStrongStyle}>{mode === 'LOGIN' ? 'Sign up' : 'Sign in'}</span></>)}
      </button>
    </form>
  );
}
