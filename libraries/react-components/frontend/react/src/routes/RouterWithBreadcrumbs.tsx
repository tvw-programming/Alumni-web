import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { addBreadcrumb } from '@/utils/monitoring';

import { router } from './router';

/**
 * `RouterProvider`, plus a breadcrumb for every location it visits.
 *
 * Route changes are the most useful breadcrumbs — they answer "where was the
 * user when this broke?" without any per-page instrumentation.
 *
 * The subscription lives in a passive effect, and that placement is
 * load-bearing rather than stylistic. React Router buffers the state update
 * that finishes initial hydration *only* while the router has no subscribers,
 * and `RouterProvider` itself subscribes in a layout effect. Subscribing at
 * module scope — which is where this used to live — consumed that buffer
 * before `RouterProvider` existed, so whenever hydration won the race against
 * the first commit the provider never learned it had finished and the entire
 * app rendered as a blank page. It reproduced roughly one load in three, which
 * made it look like a dependency or dev-server fault rather than an ordering
 * one.
 *
 * A passive effect always runs after a child's layout effect, so the provider
 * subscribes first and the buffer stays available to it.
 */
export function RouterWithBreadcrumbs() {
  useEffect(() => {
    // The first location never arrives through the subscription: by the time
    // this mounts it is already the router's current state.
    addBreadcrumb('navigation', router.state.location.pathname);
    return router.subscribe((state) => {
      addBreadcrumb('navigation', state.location.pathname);
    });
  }, []);

  return <RouterProvider router={router} />;
}
