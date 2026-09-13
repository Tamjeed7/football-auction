import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  ActionCodeSettings
} from 'firebase/auth';
import { auth } from './firebase';

const STORAGE_KEY = 'emailForSignIn';

function actionCodeSettings(): ActionCodeSettings {
  return {
    // Must be on the project's Authorized domains list — the same setting
    // Google/Email sign-in already needs, not an additional requirement.
    url: window.location.origin,
    handleCodeInApp: true
  };
}

export async function sendMagicLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings());
  window.localStorage.setItem(STORAGE_KEY, email.trim());
}

export function isMagicLinkUrl(): boolean {
  return isSignInWithEmailLink(auth, window.location.href);
}

export function getStoredEmailForSignIn(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

export async function completeMagicLinkSignIn(email: string): Promise<void> {
  await signInWithEmailLink(auth, email.trim(), window.location.href);
  window.localStorage.removeItem(STORAGE_KEY);
  // Drop the sign-in token out of the URL so it can't be reused/bookmarked.
  window.history.replaceState({}, document.title, window.location.pathname);
}
