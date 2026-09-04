import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { safeLocalStorage } from '@/utils/safeStorage';

import {
  DEFAULT_GALLERY_APPEARANCE,
  setDomainAppearance,
  useDomainAppearance,
} from './domainAppearanceStore';

const KEY = 'idol.domain-appearance.v1';

describe('per-domain appearance', () => {
  beforeEach(() => {
    safeLocalStorage.remove(KEY);
    // Clear whatever earlier tests stored, through the store's own API so the
    // in-memory snapshot is reset too.
    for (const domain of ['ecommerce', 'fintech']) setDomainAppearance(domain, null);
  });

  it('shows the domain artwork before anyone chooses', () => {
    const { result } = renderHook(() => useDomainAppearance('ecommerce'));
    expect(result.current.appearance).toBe(DEFAULT_GALLERY_APPEARANCE);
    expect(result.current.appearance).toBe('mesh');
    expect(result.current.isExplicit).toBe(false);
  });

  it('remembers a choice', () => {
    const { result } = renderHook(() => useDomainAppearance('ecommerce'));
    act(() => {
      result.current.setAppearance('glass3d');
    });
    expect(result.current.appearance).toBe('glass3d');
    expect(result.current.isExplicit).toBe(true);
    expect(safeLocalStorage.get(KEY)).toContain('glass3d');
  });

  it('keeps each domain separate', () => {
    // The bug this guards: one shared value, so picking a variant for
    // E-commerce silently restyles FinTech too.
    const { result: ecommerce } = renderHook(() => useDomainAppearance('ecommerce'));
    act(() => {
      ecommerce.current.setAppearance('animated');
    });

    const { result: fintech } = renderHook(() => useDomainAppearance('fintech'));
    expect(fintech.current.appearance).toBe('mesh');
    expect(ecommerce.current.appearance).toBe('animated');
  });

  it('notifies every reader of the same domain', () => {
    const { result: first } = renderHook(() => useDomainAppearance('ecommerce'));
    const { result: second } = renderHook(() => useDomainAppearance('ecommerce'));
    act(() => {
      first.current.setAppearance('plain');
    });
    expect(second.current.appearance).toBe('plain');
  });

  it('resets back to the default', () => {
    const { result } = renderHook(() => useDomainAppearance('ecommerce'));
    act(() => {
      result.current.setAppearance('plain');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.appearance).toBe('mesh');
    expect(result.current.isExplicit).toBe(false);
  });

  it('ignores a value that is not an appearance', () => {
    // Local storage is user-writable; an unknown string would reach the library
    // as an appearance it cannot resolve.
    safeLocalStorage.set(KEY, JSON.stringify({ ecommerce: 'neon-explosion' }));
    // Re-read through a write, which is what reloads the snapshot in-process.
    setDomainAppearance('fintech', 'plain');
    const { result } = renderHook(() => useDomainAppearance('ecommerce'));
    expect(result.current.appearance).toBe('mesh');
  });

  it('survives corrupt storage', () => {
    safeLocalStorage.set(KEY, 'not json at all');
    const { result } = renderHook(() => useDomainAppearance('ecommerce'));
    expect(result.current.appearance).toBe('mesh');
  });

  it('has no domain to remember when none is selected', () => {
    const { result } = renderHook(() => useDomainAppearance(undefined));
    expect(result.current.appearance).toBe('mesh');
    act(() => {
      result.current.setAppearance('plain');
    });
    expect(result.current.isExplicit).toBe(false);
  });
});
