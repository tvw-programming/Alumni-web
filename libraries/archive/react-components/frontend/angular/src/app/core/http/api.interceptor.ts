import { HttpErrorResponse, HttpEventType, type HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

import { getStoredAuthToken } from '../auth/auth-storage';
import { normalizeError } from '../errors/normalize-error';

import {
  CORRELATION_HEADER,
  completeRequestTrace,
  logApiFailure,
  startRequestTrace,
} from './api-telemetry';

/** Correlation header the React app also sends, so both stacks join to one backend log. */
const PROJECT_HEADER = { key: 'projName', value: 'CGen' } as const;

/**
 * Hosts we own, and may therefore send internal headers to.
 *
 * A relative URL is same-origin by definition. Anything else is third-party
 * until proven otherwise.
 */
function isOwnBackend(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return true; // relative → same origin
  try {
    return new URL(url).origin === globalThis.location.origin;
  } catch {
    return false;
  }
}

/**
 * One interceptor doing what the Axios request/response pair did: stamp
 * headers, time the request, and log every failure exactly once as a normalised
 * `AppError`.
 *
 * ## Why headers are conditional
 *
 * Internal headers are attached **only to our own backend**. Two reasons, and
 * the first was found the hard way:
 *
 * 1. **CORS.** A custom header turns a simple cross-origin GET into a
 *    preflighted one. A third-party API that does not list our headers in
 *    `Access-Control-Allow-Headers` fails the preflight, and the request never
 *    completes — which is exactly what happened against the demo data source.
 * 2. **Secrecy.** `Authorization` is a bearer token. Sending it to a host we do
 *    not control leaks a credential for no benefit.
 *
 * Timing and failure logging still apply to every request, because those are
 * ours regardless of who serves the response.
 */
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const trace = startRequestTrace(request);

  const token = getStoredAuthToken();
  const outbound = isOwnBackend(request.url)
    ? request.clone({
        setHeaders: {
          [PROJECT_HEADER.key]: PROJECT_HEADER.value,
          [CORRELATION_HEADER]: trace.correlationId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
    : request;

  return next(outbound).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          completeRequestTrace(request, event.status);
        }
      },
      error: (error: unknown) => {
        // `normalizeError` understands HttpErrorResponse; anything else is
        // still normalised rather than leaking a raw framework object.
        const appError = normalizeError(
          error instanceof HttpErrorResponse ? error : new Error(String(error)),
        );
        logApiFailure(request, appError);
      },
    }),
  );
};
