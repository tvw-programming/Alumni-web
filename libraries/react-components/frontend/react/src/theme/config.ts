import type { ThemeConfig } from './types';

/**
 * Central theme configuration — the single place to change defaults,
 * presets, radii, or the persistence key.
 */
export const THEME_CONFIG: ThemeConfig = {
  storageKey: 'app.theme-settings.v1',
  borderRadius: 10,
  defaults: {
    mode: 'light',
    style: 'plain',
    primaryColor: '#1e5aa8',
    secondaryColor: '#f0a03c',
  },
  presetPrimaryColors: ['#1e5aa8', '#7b1fa2', '#00695c', '#c62828', '#37474f', '#4527a0'],
  presetSecondaryColors: ['#f0a03c', '#e91e63', '#00acc1', '#8bc34a', '#ff7043', '#9575cd'],
};
