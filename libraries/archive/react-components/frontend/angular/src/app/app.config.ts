import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { inject, provideAppInitializer } from '@angular/core';

import { AuthService } from './core/auth/auth.service';
import { AuthStore } from './core/auth/auth-store';
import { provideHighcharts } from 'highcharts-angular';

import { apiInterceptor } from './core/http/api.interceptor';
import { routes } from './app.routes';

/**
 * The Highcharts core, loaded once.
 *
 * Memoised so the instance loader and every module loader share one promise —
 * and therefore one evaluated copy of the core.
 */
let highchartsCore: Promise<typeof import('highcharts')> | null = null;

function loadHighchartsCore(): Promise<typeof import('highcharts')> {
  highchartsCore ??= import('highcharts/esm/highcharts').then((m) => m.default);
  return highchartsCore;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    /**
     * Restore the session once, at startup.
     *
     * The guards do this too, but a public route never runs one — and the
     * public header still renders "Sign in" vs the user's name. Without this,
     * a signed-in user landing on the home page looks signed out until they
     * navigate somewhere guarded.
     */
    provideAppInitializer(async () => {
      const store = inject(AuthStore);
      await inject(AuthService).restore();
      store.restoreSettled();
    }),
    // One interceptor stamps headers, times the request and logs every failure
    // exactly once — the Angular equivalent of the Axios interceptor pair.
    // `withFetch()` swaps Angular's default XHR backend for the Fetch API:
    // it is the modern default, streams responses, and works in environments
    // where XHR is restricted.
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideRouter(
      routes,
      // Lets a route's `data` arrive as a signal `input()` on the component, so
      // pages read route data without injecting ActivatedRoute.
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    /**
     * The Highcharts instance *and* its modules, configured once.
     *
     * These were previously split: the instance here, the modules on the chart
     * component via `providePartialHighcharts`. That put one module loader on
     * every chart instance, and a page with three charts raced them — each
     * loader saw the others' half-initialised state and every chart failed with
     * "Failed to load Highcharts modules". One root loader cannot race itself.
     *
     * Both are dynamic imports, so Highcharts and its modules still load with
     * the first chart rendered rather than at startup — the lazy-loading
     * property that motivated the component-level split is preserved.
     *
     * The accessibility module is not optional. See `generic-chart.ts`: without
     * it a chart has no keyboard navigation at all, and no caller should be
     * able to forget it.
     */
    provideHighcharts({
      instance: () => loadHighchartsCore(),
      /**
       * Order matters, and this is the whole reason the list is not four plain
       * imports.
       *
       * `offline-exporting` and `export-data` both extend the class that
       * `exporting` installs. Started in parallel they can evaluate first and
       * fail with "Cannot read properties of undefined (reading 'prototype')",
       * which the library reports as "Failed to load Highcharts modules" and
       * the chart is never created.
       *
       * Every module also chains off the same core promise, because a Highcharts
       * ESM module opens with `import * as t from '../highcharts.js'` and reads
       * `t.default` at evaluation time.
       *
       * This surfaced only in a production build. The dev server happened to
       * evaluate them in a working order, which made it look fine for the whole
       * of development.
       */
      modules: () => [
        loadHighchartsCore().then(() => import('highcharts/esm/modules/accessibility')),
        loadHighchartsCore()
          .then(() => import('highcharts/esm/modules/exporting'))
          .then(async (exporting) => {
            await import('highcharts/esm/modules/offline-exporting');
            await import('highcharts/esm/modules/export-data');
            // The chain resolves to `exporting` so the returned value still
            // satisfies the library's `ModuleFactory` contract.
            return exporting;
          }),
      ],
    }),
    // No `provideAnimationsAsync()`: `@angular/animations` is deprecated as of
    // Angular 22 and Material 3 components animate with CSS.
  ],
};
