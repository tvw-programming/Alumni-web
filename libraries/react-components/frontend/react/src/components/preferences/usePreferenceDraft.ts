import { useCallback, useState } from 'react';

/**
 * Draft state for a preference popup. The draft is (re)seeded from the
 * committed value each time the popup opens, so cancelled edits never leak
 * into the next session and outside changes are picked up on reopen.
 */
export function usePreferenceDraft<TDraft>(value: TDraft, open: boolean) {
  const [draft, setDraft] = useState<TDraft>(value);
  const [dirty, setDirty] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Re-seed on the closed → open transition only; an outside `value` change
  // while the popup is open must not discard an in-progress edit.
  //
  // This is React's "adjust state when a prop changes" pattern: setting state
  // during render re-runs this component before anything is committed, with no
  // extra browser paint and no stale first frame. The previous implementation
  // held the seed in a ref written during render — what react-hooks/refs
  // flags, because concurrent rendering may discard or replay that write and
  // leave the popup seeded from a value the user never saw.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value);
      setDirty(false);
    }
  }

  const updateDraft = useCallback((next: TDraft) => {
    setDraft(next);
    setDirty(true);
  }, []);

  /** Re-seed from the committed value (e.g. after a successful save). */
  const resetDraft = useCallback(
    (nextValue?: TDraft) => {
      setDraft(nextValue ?? value);
      setDirty(false);
    },
    [value],
  );

  return { draft, dirty, updateDraft, resetDraft };
}
