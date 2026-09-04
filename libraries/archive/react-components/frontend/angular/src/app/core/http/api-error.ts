/**
 * Discriminated union covering every failure shape the app can surface.
 * All API/form/route/UI errors are normalized into this type.
 */
export type AppError =
  | {
      kind: 'api';
      message: string;
      status: number;
      code?: string;
      fieldErrors?: Record<string, string>;
    }
  | { kind: 'auth'; message: string; status: 401 | 403 }
  | { kind: 'network'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'canceled'; message: string }
  | { kind: 'validation'; message: string; fieldErrors: Record<string, string> }
  | { kind: 'unknown'; message: string; cause?: unknown };

export type AppErrorKind = AppError['kind'];

const APP_ERROR_KINDS: readonly string[] = [
  'api',
  'auth',
  'network',
  'timeout',
  'canceled',
  'validation',
  'unknown',
];

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { kind?: unknown; message?: unknown };
  return (
    typeof candidate.kind === 'string' &&
    typeof candidate.message === 'string' &&
    APP_ERROR_KINDS.includes(candidate.kind)
  );
}

/** Common shape for list endpoints (dummyjson-style). */
export interface PaginatedResponse<TItem> {
  items: TItem[];
  total: number;
  skip: number;
  limit: number;
}
