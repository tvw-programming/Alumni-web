# API (Spring Boot) specification documents

Component specifications for `api-spring/`, the Java port of the Go Fiber API.
One file per component, each following the same schema as the other `specDoc`
sets in this repository.

```
specDoc/
├── auth/        sessions, tokens, lockout, permissions
├── products/    the products endpoint, pagination, uploads
├── core/        errors, request ids, rate limiting
└── platform/    application wiring, idempotency, audit
```

## Reading order

1. [`platform/application.md`](platform/application.md) — what is wired, and the
   four dependencies
2. [`core/errors.md`](core/errors.md) — the failure shape every endpoint returns
3. [`auth/auth-controller.md`](auth/auth-controller.md) — how a caller is identified
4. [`products/product-controller.md`](products/product-controller.md) — the one
   endpoint with real behaviour

## What these describe

Only what is in the code. Where this app differs from the Go API, the difference
is stated in the component that owns it, and the full list is in
[`../documentation/features/spring-boot-api.md`](../documentation/features/spring-boot-api.md).

The structural facts worth knowing before reading any of them:

- **No layering.** Controllers hold SQL. There is no service, repository or DTO
  layer, and the specifications describe what exists rather than an idealised
  design.
- **No tests.** Nothing here has a test to point at.
- **The database enforces the rules.** Validation lives in `db/init/*.sql`.
