/// <reference types="vite/client" />

/** App version injected at build time by Vite's `define` (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Real sign-in endpoint. Unset -> dev mock, and production sign-in refuses. */
  readonly VITE_AUTH_ENDPOINT?: string;
  /** Optional remote sink for `utils/errorLogger.ts`. Unset -> localStorage only. */
  readonly VITE_ERROR_LOG_ENDPOINT?: string;
  /** Base URL for `api/goApiClient.ts`. Unset -> relative `/api` (see that file for why). */
  readonly VITE_GO_API_BASE_URL?: string;
}
