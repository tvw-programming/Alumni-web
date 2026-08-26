import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePreferenceDraft } from './usePreferenceDraft';

/**
 * The contract this hook has to keep: a draft survives outside changes while
 * the popup is open, and is thrown away the next time it opens. Getting the
 * first half wrong silently discards what the user is typing.
 */
describe('usePreferenceDraft', () => {
  it('seeds the draft from the committed value', () => {
    const { result } = renderHook(() => usePreferenceDraft('committed', false));

    expect(result.current.draft).toBe('committed');
    expect(result.current.dirty).toBe(false);
  });

  it('marks the draft dirty once edited', () => {
    const { result } = renderHook(() => usePreferenceDraft('committed', true));

    act(() => {
      result.current.updateDraft('edited');
    });

    expect(result.current.draft).toBe('edited');
    expect(result.current.dirty).toBe(true);
  });

  it('keeps an in-progress edit when the committed value changes underneath', () => {
    const { result, rerender } = renderHook(({ value, open }) => usePreferenceDraft(value, open), {
      initialProps: { value: 'committed', open: true },
    });

    act(() => {
      result.current.updateDraft('half-typed');
    });
    rerender({ value: 'changed-elsewhere', open: true });

    expect(result.current.draft).toBe('half-typed');
    expect(result.current.dirty).toBe(true);
  });

  it('re-seeds from the latest value on the closed → open transition', () => {
    const { result, rerender } = renderHook(({ value, open }) => usePreferenceDraft(value, open), {
      initialProps: { value: 'first', open: false },
    });

    rerender({ value: 'first', open: true });
    act(() => {
      result.current.updateDraft('abandoned');
    });

    rerender({ value: 'first', open: false });
    rerender({ value: 'second', open: true });

    expect(result.current.draft).toBe('second');
    expect(result.current.dirty).toBe(false);
  });

  it('does not re-seed while the popup stays open', () => {
    const { result, rerender } = renderHook(({ value, open }) => usePreferenceDraft(value, open), {
      initialProps: { value: 'first', open: true },
    });

    act(() => {
      result.current.updateDraft('mine');
    });
    rerender({ value: 'first', open: true });
    rerender({ value: 'first', open: true });

    expect(result.current.draft).toBe('mine');
  });

  it('resets to the current committed value, not the one it mounted with', () => {
    const { result, rerender } = renderHook(({ value, open }) => usePreferenceDraft(value, open), {
      initialProps: { value: 'first', open: true },
    });

    rerender({ value: 'saved', open: true });
    act(() => {
      result.current.resetDraft();
    });

    expect(result.current.draft).toBe('saved');
    expect(result.current.dirty).toBe(false);
  });

  it('resets to an explicit value when given one', () => {
    const { result } = renderHook(() => usePreferenceDraft('committed', true));

    act(() => {
      result.current.updateDraft('edited');
      result.current.resetDraft('explicit');
    });

    expect(result.current.draft).toBe('explicit');
    expect(result.current.dirty).toBe(false);
  });
});
