/**
 * Firebase client: social login and the ID token every API call carries.
 *
 * This module owns the token and nothing else does. Components ask for the
 * current user through `useAuth`; the axios client asks for a token through
 * `currentIdToken`. Neither ever stores one — `getIdToken()` returns a cached
 * token and refreshes it when it is close to expiry, so keeping our own copy
 * would only mean serving a stale one.
 */
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Whether the config is real.
 *
 * `.env` ships sample values so the file documents the shape of each one, and
 * they are marked DEMO precisely so this check can see them. Firebase does not
 * validate a config at init — it accepts anything and fails on the first
 * network call, with an error that reads like a network fault rather than
 * "you never filled this in". Catching it here turns a confusing failure into
 * a stated one.
 */
export const FIREBASE_CONFIGURED =
  Object.values(config).every((v) => typeof v === 'string' && v.length > 0) &&
  !config.apiKey.includes('DEMO') &&
  !config.projectId.startsWith('alumni-demo-');

const app = FIREBASE_CONFIGURED ? initializeApp(config) : null;

export const auth = app ? getAuth(app) : null;

function requireAuth() {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Fill in the five VITE_FIREBASE_* values in ' +
        '.env from `firebase apps:sdkconfig web`.',
    );
  }
  return auth;
}

const providers = {
  google: () => new GoogleAuthProvider(),
  github: () => new GithubAuthProvider(),
} as const;

export type SocialProvider = keyof typeof providers;

export async function signInWith(provider: SocialProvider): Promise<User> {
  const { user } = await signInWithPopup(requireAuth(), providers[provider]());
  return user;
}

export function signOutEverywhere(): Promise<void> {
  return auth ? signOut(auth) : Promise.resolve();
}

/**
 * The bearer token for an API call, or null when signed out.
 *
 * Not forced: `getIdToken(true)` on every request would hit Google's servers
 * each time. The SDK refreshes on its own inside the token's hour, and the API
 * checks revocation, so a token that should no longer work will be rejected
 * there rather than needing to be re-fetched here.
 */
export async function currentIdToken(): Promise<string | null> {
  const user = auth?.currentUser;
  return user ? user.getIdToken() : null;
}

export function watchAuth(onChange: (user: User | null) => void): () => void {
  // No Firebase: report signed-out once and never change.
  if (!auth) {
    onChange(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, onChange);
}

/**
 * Admin status comes from a custom claim, set server-side. Reading it from the
 * token means the UI and the API agree on one source of truth — but it decides
 * only what to *render*. Every admin route is enforced again in Go, because a
 * claim read in a browser is a hint, not a permission.
 */
export async function isAdmin(): Promise<boolean> {
  const user = auth?.currentUser;
  if (!user) return false;
  const { claims } = await user.getIdTokenResult();
  return claims.admin === true;
}
