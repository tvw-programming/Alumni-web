import { useCallback, useRef, useState } from 'react';

import { savePreferences } from '@/services/preferenceService';

/**
 * Save-request lifecycle for a preference popup: loading + error state and a
 * duplicate-submission guard (a ref, so double-clicks are blocked even before
 * React re-renders with `saving: true`).
 */
export function usePreferenceSave<TDraft>(endpoint: string, sectionId: string) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const save = useCallback(
    async (draft: TDraft): Promise<TDraft | null> => {
      if (inFlightRef.current) return null; // duplicate submit — ignore
      inFlightRef.current = true;
      setSaving(true);
      setError(null);
      try {
        return await savePreferences(endpoint, sectionId, draft);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save preferences. Try again.');
        return null;
      } finally {
        inFlightRef.current = false;
        setSaving(false);
      }
    },
    [endpoint, sectionId],
  );

  const clearError = useCallback(() => setError(null), []);

  return { saving, error, save, clearError };
}
