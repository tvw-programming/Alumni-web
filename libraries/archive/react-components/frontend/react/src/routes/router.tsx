import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RouteErrorView } from '@/components/errors/RouteErrorView';
import { AdminShellLayout } from '@/components/layout/AdminShellLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PublicLayout } from '@/components/layout/PublicLayout';

/**
 * Two isolated shells:
 *   - Public marketing site (PublicLayout) — anyone.
 *   - Admin console (AdminShellLayout behind ProtectedRoute) — authenticated only.
 *
 * Feature pages are lazy route modules (chunk-per-page). Each shell keeps its
 * own errorElement so a 404 renders inside the active shell's chrome.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteErrorView />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/features/public/HomePage')).HomePage }),
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await import('@/features/public/AboutPage')).AboutPage }),
      },
      {
        path: 'team',
        lazy: async () => ({ Component: (await import('@/features/public/TeamPage')).TeamPage }),
      },
      {
        path: 'contact',
        lazy: async () => ({
          Component: (await import('@/features/public/ContactPage')).ContactPage,
        }),
      },
      {
        path: 'login',
        lazy: async () => ({ Component: (await import('@/features/auth/LoginPage')).LoginPage }),
      },
      {
        path: 'forgot-password',
        lazy: async () => ({
          Component: (await import('@/features/auth/ForgotPasswordPage')).ForgotPasswordPage,
        }),
      },
      {
        // The token arrives as a query parameter, so the path itself is static.
        path: 'reset-password',
        lazy: async () => ({
          Component: (await import('@/features/auth/ResetPasswordPage')).ResetPasswordPage,
        }),
      },
      // 404 within the public shell.
      { path: '*', element: <RouteErrorView /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminShellLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorView />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      {
        // Reachable by any signed-in user: it is the destination for a denial,
        // so gating it on a permission could bounce someone in a loop.
        path: 'forbidden',
        lazy: async () => ({
          Component: (await import('@/features/auth/ForbiddenPage')).ForbiddenPage,
        }),
      },
      {
        path: 'dashboard',
        lazy: async () => ({
          Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage,
        }),
      },
      {
        path: 'documentation',
        lazy: async () => ({
          Component: (await import('@/features/admin/DocumentationLayout')).DocumentationLayout,
        }),
        children: [
          { index: true, element: <Navigate to="spec-doc" replace /> },
          {
            path: 'spec-doc',
            lazy: async () => ({
              Component: (await import('@/features/admin/documentation/SpecDocPage')).SpecDocPage,
            }),
          },
          {
            path: 'api-spec-doc',
            lazy: async () => ({
              Component: (await import('@/features/admin/documentation/ApiSpecDocPage'))
                .ApiSpecDocPage,
            }),
          },
          {
            path: 'component-spec-doc',
            lazy: async () => ({
              Component: (await import('@/features/admin/documentation/ComponentSpecDocPage'))
                .ComponentSpecDocPage,
            }),
          },
          {
            path: 'spring-spec-doc',
            lazy: async () => ({
              Component: (await import('@/features/admin/documentation/SpringSpecDocPage'))
                .SpringSpecDocPage,
            }),
          },
        ],
      },
      {
        path: 'master-data',
        lazy: async () => ({
          Component: (await import('@/features/admin/MasterDataLayout')).MasterDataLayout,
        }),
        children: [
          { index: true, element: <Navigate to="products" replace /> },
          {
            path: 'products',
            lazy: async () => ({
              Component: (await import('@/features/admin/ManageProductPage')).ManageProductPage,
            }),
          },
          {
            path: 'domain-components',
            lazy: async () => ({
              Component: (await import('@/features/admin/domainComponents/DomainComponentsPage'))
                .DomainComponentsPage,
            }),
          },
          {
            path: 'products-inline',
            lazy: async () => ({
              Component: (await import('@/features/admin/ManageProductInlinePage'))
                .ManageProductInlinePage,
            }),
          },
          {
            path: 'users',
            lazy: async () => ({
              Component: (await import('@/features/admin/ManageUserPage')).ManageUserPage,
            }),
          },
          {
            path: 'theme',
            lazy: async () => ({
              Component: (await import('@/features/admin/ManageThemePage')).ManageThemePage,
            }),
          },
          {
            path: 'snackbar',
            lazy: async () => ({
              Component: (await import('@/features/admin/ManageSnackbarPage')).ManageSnackbarPage,
            }),
          },
          {
            path: 'generic-card',
            lazy: async () => ({
              Component: (await import('@/features/admin/ManageGenericCardPage'))
                .ManageGenericCardPage,
            }),
          },
          {
            path: 'generic-popup',
            lazy: async () => ({
              Component: (await import('@/features/admin/ManageGenericPopupPage'))
                .ManageGenericPopupPage,
            }),
          },
          {
            path: 'generic-chart',
            lazy: async () => ({
              Component: (await import('@/features/admin/ManageGenericChartPage'))
                .ManageGenericChartPage,
            }),
          },
          {
            path: 'api-call-scenarios',
            lazy: async () => ({
              Component: (await import('@/features/admin/ApiCallScenariosPage'))
                .ApiCallScenariosPage,
            }),
          },
          {
            path: 'api-call-examples',
            lazy: async () => ({
              Component: (await import('@/features/admin/ApiCallExamplesPage')).ApiCallExamplesPage,
            }),
          },
          {
            path: 'product-form',
            lazy: async () => ({ Component: (await import('@/components/ProductForm')).default }),
          },
          {
            path: 'order-form',
            lazy: async () => ({ Component: (await import('@/components/OrderForm')).default }),
          },
          {
            // Diagnostics expose request URLs, payload fragments and stack
            // traces, so they need their own capability rather than riding on
            // "is signed in".
            path: 'error-log',
            element: <ProtectedRoute requires={['diagnostics:read']} />,
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/components/errors/AdminErrorLog')).AdminErrorLog,
                }),
              },
            ],
          },
        ],
      },
      // 404 within the admin shell.
      { path: '*', element: <RouteErrorView /> },
    ],
  },
]);
