import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { queryClient } from '@/api/queryClient';
import * as authService from '@/services/authService';

import type { AuthUser, LoginCredentials } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /**
   * True until the initial refresh attempt settles.
   *
   * Guards matter here: without it, a reload on a protected route renders as
   * "signed out" for a moment and bounces the user to /login before the session
   * has had a chance to come back.
   */
  isRestoring: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // The access token is in memory, so a reload starts with nothing. The refresh
  // cookie is httpOnly and travels on its own; this is what spends it.
  useEffect(() => {
    let cancelled = false;
    void authService.restoreSession().then((session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setIsRestoring(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const session = await authService.login(credentials);
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    void authService.logout();
    setUser(null);
    queryClient.clear(); // drop any user-scoped cached data
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, isRestoring, login, logout }),
    [user, isRestoring, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider and its consuming hook are one public context API.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
