/** sessionStorage access guarded for SSR / privacy-mode runtime safety. */
function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const safeSessionStorage = {
  get(key: string): string | null {
    return getSessionStorage()?.getItem(key) ?? null;
  },
  set(key: string, value: string): void {
    getSessionStorage()?.setItem(key, value);
  },
  remove(key: string): void {
    getSessionStorage()?.removeItem(key);
  },
};

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** localStorage access guarded for SSR / privacy-mode runtime safety. */
export const safeLocalStorage = {
  get(key: string): string | null {
    return getLocalStorage()?.getItem(key) ?? null;
  },
  set(key: string, value: string): void {
    getLocalStorage()?.setItem(key, value);
  },
  remove(key: string): void {
    getLocalStorage()?.removeItem(key);
  },
};
