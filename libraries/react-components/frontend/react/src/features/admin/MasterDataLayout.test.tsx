import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MASTER_DATA_NAV } from '@/routes/navigation';
import { setSpeechState } from '@/speech/speechStore';

import { MasterDataLayout } from './MasterDataLayout';

/**
 * jsdom has no `matchMedia`, so `useMediaQuery` reports false and the layout
 * falls back to the mobile drawer — which is closed and `aria-hidden`, and
 * therefore invisible to role queries. Reporting desktop renders the permanent
 * sidebar, which is the surface under test.
 */
function stubDesktopViewport() {
  vi.stubGlobal(
    'matchMedia',
    (query: string): MediaQueryList =>
      ({
        matches: query.includes('min-width'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

function renderSidebar() {
  /*
   * The sidebar renders the domain-component tree, which fetches its catalogue
   * rather than importing it — so the layout now needs a query client. Retries
   * are off because jsdom has no `fetch` for `/domain-catalogue.json`: the
   * query fails immediately, the tree renders its empty state, and these tests
   * stay about the ordinal gutter rather than about the network.
   */
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/master-data/products']}>
        <Routes>
          <Route path="/admin/master-data/*" element={<MasterDataLayout />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The ordinal gutters, in sidebar order. They are `aria-hidden`, so query the DOM. */
function ordinalSlots(): HTMLElement[] {
  const list = screen.getByRole('navigation', { name: 'Master data sections' });
  return within(list)
    .getAllByRole('link')
    .map((link) => link.firstElementChild as HTMLElement);
}

beforeEach(() => {
  stubDesktopViewport();
  setSpeechState({ status: 'off' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setSpeechState({ status: 'off' });
});

describe('MasterDataLayout sidebar ordinals', () => {
  it('renders a number for every entry, matching what the voice commands expect', () => {
    setSpeechState({ status: 'listening' });
    renderSidebar();

    const slots = ordinalSlots();
    expect(slots).toHaveLength(MASTER_DATA_NAV.length);
    expect(slots.map((slot) => slot.textContent)).toEqual(
      MASTER_DATA_NAV.map((_item, index) => String(index + 1)),
    );
  });

  it('hides the numbers while the mic is off', () => {
    renderSidebar();

    for (const slot of ordinalSlots()) {
      expect(slot).toHaveStyle({ opacity: '0' });
    }
  });

  it('shows them once the mic starts listening', () => {
    renderSidebar();

    act(() => {
      setSpeechState({ status: 'listening' });
    });

    for (const slot of ordinalSlots()) {
      expect(slot).toHaveStyle({ opacity: '1' });
    }
  });

  it('keeps the gutter in the layout in both states, so toggling cannot shift a row', () => {
    // This is the anti-flicker guarantee: the element is never unmounted and
    // its reserved width never changes, so only its contents fade.
    renderSidebar();
    const off = ordinalSlots();
    expect(off).toHaveLength(MASTER_DATA_NAV.length);
    off.forEach((slot) => {
      expect(slot).toHaveStyle({ width: '22px' });
    });

    act(() => {
      setSpeechState({ status: 'listening' });
    });

    const on = ordinalSlots();
    expect(on).toHaveLength(off.length);
    on.forEach((slot, index) => {
      // Same DOM nodes, same reserved width — nothing remounted, nothing moved.
      expect(slot).toBe(off[index]);
      expect(slot).toHaveStyle({ width: '22px' });
    });
  });

  it('keeps the numbers out of the accessible name of each link', () => {
    setSpeechState({ status: 'listening' });
    renderSidebar();

    // A screen reader should hear "Manage User", not "3 Manage User".
    expect(screen.getByRole('link', { name: 'Manage User' })).toBeInTheDocument();
  });
});
