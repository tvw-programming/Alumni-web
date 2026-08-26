import { Routes } from '@angular/router';

import { authGuard, permissionGuard } from './core/auth/auth.guard';
import { MASTER_DATA_NAV, PUBLIC_NAV } from './layout/navigation';

import type { NavItem } from './layout/navigation';

/**
 * Two isolated shells, mirroring the React router:
 *   - Public marketing site (PublicLayout) — anyone.
 *   - Admin console (AdminShell) — will sit behind a guard in Phase 2.
 *
 * Every page is `loadComponent`, so each is its own chunk. Placeholder routes
 * are generated from the same nav arrays the sidebar renders, which is what
 * guarantees a sidebar link always has a route to land on.
 */

/**
 * Public paths that already have a real component below, so the placeholder
 * generator must skip them. Declaring the set once keeps a page from being
 * silently shadowed by a placeholder when it lands.
 */
const PUBLIC_ROUTES_BUILT = new Set([
  '/',
  '/about',
  '/team',
  '/contact',
  '/login',
  '/forgot-password',
  '/reset-password',
]);

/** Placeholder route for a page that arrives in a later phase. */
function placeholder(item: NavItem) {
  return {
    path: item.path.replace(/^\//, ''),
    loadComponent: () =>
      import('./features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
    data: { title: item.label },
  };
}

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [
      // `PUBLIC_NAV` includes the root entry, whose path is '/', so it is
      // filtered out here and declared explicitly as the index route.
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/public/home-page').then((m) => m.HomePage),
      },
      {
        path: 'about',
        loadComponent: () => import('./features/public/about-page').then((m) => m.AboutPage),
      },
      {
        path: 'team',
        loadComponent: () => import('./features/public/team-page').then((m) => m.TeamPage),
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/public/contact-page').then((m) => m.ContactPage),
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password-page').then((m) => m.ForgotPasswordPage),
      },
      {
        // The token arrives as a query parameter, so the path itself is static.
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password-page').then((m) => m.ResetPasswordPage),
      },
      ...PUBLIC_NAV.filter((item) => !PUBLIC_ROUTES_BUILT.has(item.path)).map(placeholder),
    ],
  },
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-shell/admin-shell').then((m) => m.AdminShell),
    // Everything inside the admin shell requires a session.
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        // Reachable by any signed-in user: it is where a denial lands, so
        // gating it on a capability could bounce someone in a loop.
        path: 'forbidden',
        loadComponent: () => import('./features/auth/forbidden-page').then((m) => m.ForbiddenPage),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'master-data',
        loadComponent: () =>
          import('./layout/master-data-layout/master-data-layout').then((m) => m.MasterDataLayout),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'products' },
          // Real page; the rest are still placeholders.
          {
            path: 'products',
            loadComponent: () =>
              import('./features/products/products-page').then((m) => m.ProductsPage),
          },
          {
            path: 'users',
            loadComponent: () => import('./features/users/users-page').then((m) => m.UsersPage),
          },
          {
            path: 'products-inline',
            loadComponent: () =>
              import('./features/admin/products-inline-page').then((m) => m.ProductsInlinePage),
          },
          {
            path: 'api-call-scenarios',
            loadComponent: () =>
              import('./features/admin/api-scenarios-page').then((m) => m.ApiScenariosPage),
          },
          {
            path: 'api-call-examples',
            loadComponent: () =>
              import('./features/admin/api-examples-page').then((m) => m.ApiExamplesPage),
          },
          {
            path: 'order-form',
            loadComponent: () =>
              import('./features/admin/order-form-page').then((m) => m.OrderFormPage),
          },
          {
            path: 'theme',
            loadComponent: () => import('./features/admin/theme-page').then((m) => m.ThemePage),
          },
          {
            path: 'snackbar',
            loadComponent: () =>
              import('./features/admin/snackbar-page').then((m) => m.SnackbarPage),
          },
          {
            path: 'generic-card',
            loadComponent: () =>
              import('./features/admin/generic-card-page').then((m) => m.GenericCardPage),
          },
          {
            path: 'generic-popup',
            loadComponent: () =>
              import('./features/admin/generic-popup-page').then((m) => m.GenericPopupPage),
          },
          {
            path: 'generic-chart',
            loadComponent: () =>
              import('./features/admin/generic-chart-page').then((m) => m.GenericChartPage),
          },
          {
            path: 'product-form',
            loadComponent: () =>
              import('./features/product-form/product-form-page').then((m) => m.ProductFormPage),
          },
          {
            // Diagnostics expose request URLs and stack traces, so they need
            // their own capability rather than riding on "is signed in".
            path: 'error-log',
            canActivate: [permissionGuard(['diagnostics:read'])],
            loadComponent: () =>
              import('./features/admin/error-log/error-log-page').then((m) => m.ErrorLogPage),
          },
          ...MASTER_DATA_NAV.filter(
            (item) =>
              ![
                'products',
                'products-inline',
                'api-call-scenarios',
                'api-call-examples',
                'users',
                'theme',
                'snackbar',
                'generic-card',
                'generic-popup',
                'generic-chart',
                'product-form',
                'order-form',
                'error-log',
              ].includes(item.path),
          ).map(placeholder),
        ],
      },
      {
        // A sibling of master-data, not a child: specifications describe the
        // app, while Master Data is the sample-data and component gallery.
        path: 'documentation',
        loadComponent: () =>
          import('./layout/documentation-layout/documentation-layout').then(
            (m) => m.DocumentationLayout,
          ),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'spec-doc' },
          {
            path: 'spec-doc',
            loadComponent: () =>
              import('./features/documentation/spec-doc-page').then((m) => m.SpecDocPage),
          },
          {
            path: 'api-spec-doc',
            loadComponent: () =>
              import('./features/documentation/api-spec-doc-page').then((m) => m.ApiSpecDocPage),
          },
          {
            path: 'spring-spec-doc',
            loadComponent: () =>
              import('./features/documentation/spring-spec-doc-page').then(
                (m) => m.SpringSpecDocPage,
              ),
          },
        ],
      },
    ],
  },
  // 404. Logs the miss to the app channel — see `not-found-page.ts`.
  {
    path: '**',
    loadComponent: () =>
      import('./features/errors/not-found-page').then((m) => m.NotFoundPage),
  },
];
