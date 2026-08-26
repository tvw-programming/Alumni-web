import { describe, expect, it } from 'vitest';

import { isCloseBlocked } from './close-policy';

import type { PopupCloseReason } from './close-policy';

const ALL_REASONS: PopupCloseReason[] = ['backdrop', 'escape', 'close-button', 'cancel'];

describe('isCloseBlocked', () => {
  it('allows every close route by default', () => {
    for (const reason of ALL_REASONS) {
      expect(isCloseBlocked(reason, {}, false)).toBe(false);
    }
  });

  it('blocks every route while loading, without being asked', () => {
    // The safe default: a dialog dismissed mid-save leaves the user unsure
    // whether their change landed.
    for (const reason of ALL_REASONS) {
      expect(isCloseBlocked(reason, {}, true)).toBe(true);
    }
  });

  it('allows closing while loading when the caller opts out', () => {
    expect(isCloseBlocked('cancel', { preventCloseWhileLoading: false }, true)).toBe(false);
  });

  it('treats dirty as a fact, not a decision', () => {
    // `dirty` alone must not block: tracking dirtiness and trapping the user in
    // the dialog are separate choices.
    expect(isCloseBlocked('escape', { dirty: true }, false)).toBe(false);
  });

  it('blocks every route once dirty blocking is opted into', () => {
    const behavior = { dirty: true, preventCloseWhenDirty: true };
    for (const reason of ALL_REASONS) {
      expect(isCloseBlocked(reason, behavior, false)).toBe(true);
    }
  });

  it('does not block a clean dialog that opted into dirty blocking', () => {
    expect(isCloseBlocked('escape', { dirty: false, preventCloseWhenDirty: true }, false)).toBe(
      false,
    );
  });

  it('never blocks the explicit buttons via the backdrop/escape opt-outs', () => {
    // Those two options exist to stop *accidental* dismissal. Letting them
    // disable Cancel and the close button would leave a dialog with no exit.
    const behavior = { closeOnBackdrop: false, closeOnEscape: false };
    expect(isCloseBlocked('cancel', behavior, false)).toBe(false);
    expect(isCloseBlocked('close-button', behavior, false)).toBe(false);
  });

  it('blocks a single route without affecting the others', () => {
    expect(isCloseBlocked('backdrop', { closeOnBackdrop: false }, false)).toBe(true);
    expect(isCloseBlocked('escape', { closeOnBackdrop: false }, false)).toBe(false);

    expect(isCloseBlocked('escape', { closeOnEscape: false }, false)).toBe(true);
    expect(isCloseBlocked('backdrop', { closeOnEscape: false }, false)).toBe(false);
  });
});
