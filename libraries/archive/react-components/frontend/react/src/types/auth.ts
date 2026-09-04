export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface AuthSession {
  /** Short-lived access token. Held in memory only — see authService. */
  token: string;
  /** Seconds until `token` expires, so the caller can refresh ahead of time. */
  expiresIn: number;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
  /** Persists the session for ~30 days instead of the browser session. */
  rememberMe?: boolean;
}
