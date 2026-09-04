## Component Specification

### Name & Purpose

`AppError` and its normaliser — the app-wide failure shape. Every error reaching
a component has already been through `normalizeError`.

### Location

`src/utils/errors.ts`, `src/types/api.ts`

### Public Interface

```ts
export function normalizeError(error: unknown): AppError;
export function getUserMessage(error: AppError): string;

// types/api.ts — a discriminated union, NOT an Error subclass
type AppError =
  | { kind: 'auth'; status: 401 | 403; message: string }
  | { kind: 'api'; status: number; message: string; code?: string }
  | { kind: 'network'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'canceled'; message: string }
  | { kind: 'unknown'; message: string };
```

### Dependencies

- Internal: none.
- External: `axios` (only to recognise an Axios error).

### Data Models

Owns no entity.

### Business Rules & Constraints

- **`AppError` is a plain object, not an `Error`.** The shape is the contract;
  `@typescript-eslint/only-throw-error` is disabled at the throw sites for
  exactly this reason, and the same choice is mirrored in the Go API.
- **`kind` is the discriminator.** Switch on it; never parse `message`.
- **Status 0 is `network`, unless the cause is an abort**, in which case it is
  `canceled` — and `canceled` is excluded from error logging.
- **`getUserMessage` maps a kind to safe wording.** It maps every 401 to
  "Please sign in to continue.", which is right for an expired session and
  **wrong on a login form** — the login pages deliberately prefer
  `normalized.message` (the API's own text) and fall back to `getUserMessage`.

```ts
const normalized = normalizeError(error);
setSubmitError(normalized.message || getUserMessage(normalized));
```

### Extension Points

- **A new failure kind:** add to the union in `types/api.ts`, a branch in
  `normalizeError`, and a case in `getUserMessage`. TypeScript will find every
  switch that needs updating.
- **A new transport** (fetch, WebSocket): add a recognition branch at the top of
  `normalizeError`; nothing downstream changes.
