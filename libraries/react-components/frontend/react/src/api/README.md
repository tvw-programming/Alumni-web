# API layer

All HTTP traffic flows through `axiosClient.ts` and the typed verbs in `request.ts`. Feature services
describe endpoints and response contracts; hooks own TanStack Query orchestration; components consume
typed query or mutation state without importing Axios.

Every request receives `projName: CGen`, the current bearer token, and a bounded timeout. The client
normalizes failures to `AppError`, supports a single refresh-and-retry cycle when a refresh callback is
configured, and preserves Axios `AbortSignal` cancellation.

`queryKeys.ts` is the only key factory. Hooks should co-locate a key and query function with
`queryOptions`, pass the supplied signal into services, invalidate the narrowest useful key after
mutations, and use `useQueries` for dynamic parallel requests. Dependent queries use `enabled`; browser
polling uses `refetchInterval` and is not a replacement for a durable server-side cron worker.
