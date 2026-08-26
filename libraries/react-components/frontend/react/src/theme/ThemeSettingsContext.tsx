import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { THEME_CONFIG } from './config';
import { createAppTheme } from './factory';
import { loadThemeSettings, saveThemeSettings } from './storage';

import type { ThemeMode, ThemeSettings, ThemeStyle } from './types';

/**
 * Central theme state: one provider owns the settings, derives the MUI theme
 * with the factory, persists changes, and exposes a typed settings API.
 */

export interface ThemeSettingsContextValue {
  readonly settings: ThemeSettings;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setStyle: (style: ThemeStyle) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  updateSettings: (patch: Partial<ThemeSettings>) => void;
  resetSettings: () => void;
}

const ThemeSettingsContext = createContext<ThemeSettingsContextValue | null>(null);

export interface AppThemeProviderProps {
  readonly children: ReactNode;
  /** Override initial settings (useful in tests); defaults to persisted/defaults. */
  readonly initialSettings?: ThemeSettings;
}

export function AppThemeProvider({ children, initialSettings }: AppThemeProviderProps) {
  const [settings, setSettings] = useState<ThemeSettings>(
    () => initialSettings ?? loadThemeSettings(),
  );

  // Persist on every change (guarded internally for non-browser envs).
  useEffect(() => {
    saveThemeSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => updateSettings({ mode }), [updateSettings]);
  const setStyle = useCallback((style: ThemeStyle) => updateSettings({ style }), [updateSettings]);
  const setPrimaryColor = useCallback(
    (primaryColor: string) => updateSettings({ primaryColor }),
    [updateSettings],
  );
  const setSecondaryColor = useCallback(
    (secondaryColor: string) => updateSettings({ secondaryColor }),
    [updateSettings],
  );
  const toggleMode = useCallback(() => {
    setSettings((prev) => ({ ...prev, mode: prev.mode === 'light' ? 'dark' : 'light' }));
  }, []);
  const resetSettings = useCallback(() => {
    setSettings(THEME_CONFIG.defaults);
  }, []);

  // Rebuild the theme only when settings actually change.
  const theme = useMemo(() => createAppTheme(settings), [settings]);

  const value = useMemo<ThemeSettingsContextValue>(
    () => ({
      settings,
      setMode,
      toggleMode,
      setStyle,
      setPrimaryColor,
      setSecondaryColor,
      updateSettings,
      resetSettings,
    }),
    [
      settings,
      setMode,
      toggleMode,
      setStyle,
      setPrimaryColor,
      setSecondaryColor,
      updateSettings,
      resetSettings,
    ],
  );

  return (
    <ThemeSettingsContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        {/* enableColorScheme keeps native UI (scrollbars, inputs) in sync with mode */}
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeSettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider and its consuming hook are one public context API.
export function useThemeSettings(): ThemeSettingsContextValue {
  const context = useContext(ThemeSettingsContext);
  if (context === null) {
    throw new Error('useThemeSettings must be used within an AppThemeProvider');
  }
  return context;
}
