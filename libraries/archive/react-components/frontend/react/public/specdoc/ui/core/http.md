## Component Specification

### Name & Purpose

The HTTP layer — a configured Axios instance plus thin verb helpers. The single
place auth headers, correlation IDs, timing and refresh-on-401 are applied.

### Location

`src/api/axiosClient.ts`, `src/api/request.ts`, `src/api/apiTelemetry.ts`,
`src/api/queryKeys.ts`, `src/api/queryClient.ts`

### Public Interface

```ts
// axiosClient.ts
export const PROJECT_HEADER = { key: 'projName', value: 'CGen' } as const;
export interface ApiClientOptions {
  baseURL: string;
  getAuthToken?: () => string | null;   // null skips the Authorization header
  onAuthFailure?: () => void;
}
export function createApiClient(options: ApiClientOptions): AxiosInstance;
export const apiClient: AxiosInstance;

// request.ts
export interface RequestOptions extends Omit<AxiosRequestConfig,'url'|'method'|'data'> {
  client?: AxiosInstance;
}
export interface ListQueryInput { page?: number; pageSize?: number; search?: string; … }
export function buildListQuery(input: ListQueryInput): Record<string, string | number | boolean>;
export async function get<TResponse>(url: string, options?: RequestOptions): Promise<TResponse>;
export async function post<TResponse, TBody = unknown>(url: string, body: TBody, options?: RequestOptions): Promise<TResponse>;
export async function put<…>; export async function patch<…>; export async function del<…>;
```

### Dependencies

- Internal: `authService.getAccessToken` (injected, not imported at module scope),
  `utils/errors`, `utils/errorLogger`.
- External: `axios`, `@tanstack/react-query`.

### Data Models

Owns none. `queryKeys.ts` is the cache-key hierarchy:

```ts
queryKeys.products.all; // ['products']
queryKeys.products.list(filters); // ['products','list',filters]
queryKeys.products.detail(id); // ['products','detail',id]
```

### Business Rules & Constraints

- **The token is fetched through a callback**, not imported. That keeps the
  client free of a circular dependency on the auth service and makes it testable.
- **Every failure is logged exactly once**, at the response interceptor, as a
  normalised `AppError` — see [`errors.md`](errors.md). No call site logs.
- **Cancelled requests are not logged.** Aborting in-flight work on unmount is
  normal operation; logging it would fill the API channel with noise.
- **Query keys are hierarchical**, so `invalidateQueries(queryKeys.products.all)`
  invalidates every list and detail beneath it.
- **`buildListQuery` is the one place list parameters are named**, so a filter
  added there reaches every list call.

### Extension Points

- **A new endpoint:** a service function in `src/services/` calling `get`/`post`;
  a hook in `src/hooks/` wrapping it in `useQuery`/`useMutation`.
- **A new header for every request:** the request interceptor in
  `createApiClient`.
- **A second backend:** `createApiClient({ baseURL: … })` — that is why it is a
  factory. `authService` does exactly this for the same-origin auth API.
