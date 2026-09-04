import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider, Portal, useTheme } from 'react-native-paper';

import { darkTheme, lightTheme, type AppTheme } from './theme';
import type { ColorScheme } from './tokens';

export type ThemeMode = ColorScheme | 'system';

interface ThemeControl {
  mode: ThemeMode;
  scheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeControlContext = createContext<ThemeControl | null>(null);

/** Typed replacement for Paper's `useTheme` — returns MD3 colors *and* our tokens. */
export const useAppTheme = (): AppTheme => useTheme<AppTheme>();

export const useThemeControl = (): ThemeControl => {
  const ctx = useContext(ThemeControlContext);
  if (!ctx) throw new Error('useThemeControl must be used inside <AppThemeProvider>');
  return ctx;
};

export interface AppThemeProviderProps {
  children: React.ReactNode;
  /** Force a scheme — useful for screenshot tests and Storybook. */
  initialMode?: ThemeMode;
}

export const AppThemeProvider = ({ children, initialMode = 'system' }: AppThemeProviderProps) => {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  const toggle = useCallback(() => {
    setMode((prev) => {
      const current = prev === 'system' ? (system === 'dark' ? 'dark' : 'light') : prev;
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [system]);

  const control = useMemo<ThemeControl>(
    () => ({ mode, scheme, setMode, toggle }),
    [mode, scheme, toggle],
  );

  return (
    <ThemeControlContext.Provider value={control}>
      <PaperProvider theme={theme}>
        {/* Portal.Host lives above navigation so sheets/toasts render over everything. */}
        <Portal.Host>{children}</Portal.Host>
      </PaperProvider>
    </ThemeControlContext.Provider>
  );
};
