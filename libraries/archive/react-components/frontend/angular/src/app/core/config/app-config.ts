import { isDevMode } from '@angular/core';

import pkg from '../../../../package.json' with { type: 'json' };

/**
 * Build/runtime configuration.
 *
 * The React app reads `import.meta.env.*`, which Vite inlines. Angular has no
 * equivalent, so the same values are centralised here: `isDevMode()` for the
 * dev flag, and plain constants for the rest. Keeping them in one module means
 * the ported logger and monitoring code changes in exactly one place rather
 * than at every `import.meta.env` site.
 *
 * To point these at a real deployment, replace this file via `fileReplacements`
 * in angular.json, or swap it for an injected token if the values must be
 * resolved at runtime rather than build time.
 */

/** True in `ng serve` and in unit tests; false in a production build. */
export const IS_DEV = isDevMode();

/** Build identifier, so a log entry can be traced to the deploy that produced it. */
export const RELEASE = `${pkg.version}${IS_DEV ? '-dev' : ''}`;

/** Base URL for the demo data source (mirrors the React app's `apiClient`). */
export const API_BASE_URL = 'https://dummyjson.com';

/** Relative path proxied to the Go service (mirrors `goApiClient`). */
export const GO_API_BASE_URL = '/api';

/**
 * Optional remote sink for the error log. Unset means localStorage only.
 * Equivalent to the React app's `VITE_ERROR_LOG_ENDPOINT`.
 */
export const ERROR_LOG_ENDPOINT: string | undefined = undefined;

/**
 * Real sign-in endpoint. Unset means the dev mock is used, and a production
 * build refuses to sign anyone in — the same fail-safe as the React app.
 */
export const AUTH_ENDPOINT: string | undefined = undefined;

/** Request timeout, in milliseconds. */
export const REQUEST_TIMEOUT_MS = 15_000;
