import { THEME_CONFIG } from './config';

import type { ThemeMode, ThemeSettings, ThemeStyle } from './types';

/**
 * Safe localStorage persistence for theme settings.
 * All access is guarded: SSR-safe, quota/security-error safe, and every
 * stored value is validated before use (corrupt data falls back to defaults).
 */

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MODES: readonly ThemeMode[] = ['light', 'dark'];
const STYLES: readonly ThemeStyle[] = ['plain', 'glass', 'glass3d'];

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

function isThemeStyle(value: unknown): value is ThemeStyle {
  return typeof value === 'string' && (STYLES as readonly string[]).includes(value);
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/** Merge unknown parsed JSON with defaults, keeping only valid fields. */
function sanitize(raw: unknown): ThemeSettings {
  const defaults = THEME_CONFIG.defaults;
  if (typeof raw !== 'object' || raw === null) {
    return defaults;
  }
  const candidate = raw as Record<string, unknown>;
  return {
    mode: isThemeMode(candidate.mode) ? candidate.mode : defaults.mode,
    style: isThemeStyle(candidate.style) ? candidate.style : defaults.style,
    primaryColor: isHexColor(candidate.primaryColor)
      ? candidate.primaryColor
      : defaults.primaryColor,
    secondaryColor: isHexColor(candidate.secondaryColor)
      ? candidate.secondaryColor
      : defaults.secondaryColor,
  };
}

export function loadThemeSettings(): ThemeSettings {
  if (typeof window === 'undefined') {
    return THEME_CONFIG.defaults;
  }
  try {
    const stored = window.localStorage.getItem(THEME_CONFIG.storageKey);
    if (stored === null) {
      return THEME_CONFIG.defaults;
    }
    return sanitize(JSON.parse(stored) as unknown);
  } catch {
    // Private mode, disabled storage, or corrupt JSON — use defaults.
    return THEME_CONFIG.defaults;
  }
}

export function saveThemeSettings(settings: ThemeSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(THEME_CONFIG.storageKey, JSON.stringify(settings));
  } catch {
    // Storage unavailable (quota, private mode) — settings stay in memory.
  }
}
