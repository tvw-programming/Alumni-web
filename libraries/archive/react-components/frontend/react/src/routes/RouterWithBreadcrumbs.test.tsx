import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface RouterState {
  location: { pathname: string };
}
type RouterListener = (state: RouterState) => void;

/** One shared timeline, so the *order* of the two subscriptions is assertable. */
const timeline: string[] = [];

const unsubscribe = vi.fn<() => void>();
const subscribe = vi.fn<(listener: RouterListener) => () => void>(() => {
  timeline.push('breadcrumbs-subscribe');
  return unsubscribe;
});
const addBreadcrumb = vi.fn<(category: string, message: string) => void>();

vi.mock('@/utils/monitoring', () => ({
  addBreadcrumb: (category: string, message: string) => {
    addBreadcrumb(category, message);
  },
}));

vi.mock('./router', () => ({
  router: {
    state: { location: { pathname: '/dashboard' } },
    subscribe: (listener: RouterListener) => subscribe(listener),
  },
}));

/**
 * Stands in for the real provider and records *when* it subscribes.
 *
 * React Router's `RouterProvider` subscribes in a layout effect, and the whole
 * point of this component is that its own subscription must come later.
 */
vi.mock('react-router-dom', async () => {
  const { useLayoutEffect } = await import('react');
  return {
    RouterProvider: () => {
      useLayoutEffect(() => {
        timeline.push('provider-layout-effect');
      }, []);
      return <div>router outlet</div>;
    },
  };
});

const { RouterWithBreadcrumbs } = await import('./RouterWithBreadcrumbs');

describe('RouterWithBreadcrumbs', () => {
  beforeEach(() => {
    subscribe.mockClear();
    unsubscribe.mockClear();
    addBreadcrumb.mockClear();
    timeline.length = 0;
  });

  it('renders the router', async () => {
    render(<RouterWithBreadcrumbs />);
    expect(await screen.findByText('router outlet')).toBeInTheDocument();
  });

  /*
   * The regression this file exists for.
   *
   * React Router buffers the state update that finishes initial hydration only
   * while the router has no subscribers. Subscribing at module scope, or during
   * render, consumes that buffer before `RouterProvider` has subscribed — and
   * when hydration wins the race against the first commit the provider never
   * learns it finished, so the app renders a blank page. Intermittently, which
   * is what made it expensive to find.
   */
  it('subscribes only after the provider has, never during render', () => {
    render(<RouterWithBreadcrumbs />);
    expect(timeline).toEqual(['provider-layout-effect', 'breadcrumbs-subscribe']);
  });

  it('records the initial location, which never arrives through the subscription', async () => {
    render(<RouterWithBreadcrumbs />);
    await waitFor(() => {
      expect(addBreadcrumb).toHaveBeenCalledWith('navigation', '/dashboard');
    });
  });

  it('records a breadcrumb for each location the router visits', async () => {
    render(<RouterWithBreadcrumbs />);
    await waitFor(() => {
      expect(subscribe).toHaveBeenCalled();
    });

    const listener = subscribe.mock.calls[0]?.[0];
    expect(listener).toBeDefined();
    listener?.({ location: { pathname: '/admin/documentation/spec-doc' } });

    expect(addBreadcrumb).toHaveBeenLastCalledWith('navigation', '/admin/documentation/spec-doc');
  });

  it('unsubscribes on unmount', async () => {
    const view = render(<RouterWithBreadcrumbs />);
    await waitFor(() => {
      expect(subscribe).toHaveBeenCalled();
    });

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
