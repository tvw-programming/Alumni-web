export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface AuthSession {
  /** Short-lived access token. Held in memory only — see `auth.service.ts`. */
  token: string;
  /** Seconds until `token` expires. */
  expiresIn: number;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
  /** Persists the session for ~30 days instead of the browser session. */
  rememberMe?: boolean;
}

export interface ForgotPasswordResult {
  message: string;
  /** Present only when the API runs in development mode. */
  devResetUrl?: string;
}
