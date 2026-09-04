/**
 * In-memory `Storage`, installed only when the test DOM does not provide one.
 *
 * jsdom exposes `localStorage` as a property that is present but `undefined`
 * when the document has an opaque origin. Code that persists state — the error
 * logger, the monitoring session ID, the theme and speech preferences — then
 * hits its swallowed-exception fallback and silently no-ops, so its tests fail
 * with empty reads rather than with anything that names the cause.
 *
 * Installing a faithful Storage is the honest fix: the app genuinely has
 * Storage in a browser, so the tests should exercise the real path rather than
 * the degraded one. The Angular app carries the same shim for the same reason
 * (`angular/src/test-setup.ts`); the two are deliberately identical.
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
  // Present-but-undefined is the case being repaired, so this checks the value
  // rather than `name in target`.
  if (target[name]) return;

  Object.defineProperty(target, name, {
    value: new MemoryStorage(),
    configurable: true,
    writable: false,
  });
}

export function installMemoryStorage(): void {
  install('localStorage');
  install('sessionStorage');
}
