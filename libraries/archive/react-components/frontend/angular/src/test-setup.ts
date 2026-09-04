/**
 * Global test setup, registered via `setupFiles` in angular.json.
 *
 * The Angular unit-test builder runs specs in a DOM whose document has an
 * opaque origin, and `localStorage` / `sessionStorage` are absent there —
 * `typeof window.localStorage` is `undefined`, not a throwing getter. Any code
 * that persists state (the error logger, the monitoring session ID, the theme
 * and speech preferences) therefore silently no-ops, and its tests fail with
 * empty reads.
 *
 * Installing a faithful in-memory `Storage` is the honest fix: the application
 * genuinely requires Storage in a browser, so the tests should exercise the
 * real code path rather than the swallowed-exception fallback. It is installed
 * only when missing, so a runner that does provide Storage keeps its own.
 */

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    // Real Storage coerces both arguments to strings.
    this.map.set(String(key), String(value));
  }
}

function install(name: 'localStorage' | 'sessionStorage'): void {
  const target = globalThis as unknown as Record<string, unknown>;
  if (target[name]) return;

  Object.defineProperty(target, name, {
    value: new MemoryStorage(),
    configurable: true,
    writable: false,
  });
}

install('localStorage');
install('sessionStorage');
