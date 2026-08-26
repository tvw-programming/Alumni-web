import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'app.theme-mode';

/**
 * Theme state as signals.
 *
 * The React app keeps this in a context provider; here a root-provided service
 * holding a signal does the same job with less ceremony — any component can
 * inject it, and only the components that *read* `mode()` re-render when it
 * changes.
 *
 * The mode is written to `document.documentElement` as a `color-scheme` and a
 * `data-theme` attribute rather than being threaded through props, because
 * Angular Material 3 reads the scheme from CSS.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly modeSignal = signal<ThemeMode>(readStoredMode());

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  constructor() {
    // One effect owns the DOM side of the theme. Effects are for exactly this:
    // reflecting signal state onto a non-reactive API.
    effect(() => {
      const mode = this.modeSignal();
      const root = document.documentElement;
      root.style.colorScheme = mode;
      root.dataset['theme'] = mode;
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* private mode — the in-memory preference still holds for this session */
      }
    });
  }

  toggle(): void {
    this.modeSignal.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this.modeSignal.set(mode);
  }
}

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
