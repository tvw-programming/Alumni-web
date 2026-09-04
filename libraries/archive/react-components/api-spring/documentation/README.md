# Spring Boot API documentation

Developer documentation for `api-spring/`, the Java port of the Go Fiber API in
this repository. It explains what the port does, where it matches the Go
implementation exactly, and where it deliberately does not.

## Index

| Document | Covers |
| --- | --- |
| [Spring Boot backend API](features/spring-boot-api.md) | Architecture, endpoints, authentication, pagination, concurrency, idempotency, uploads, operations, verified parity, and the differences that remain |

## Intended audience

Developers who need to run, review, or extend this API — and anyone comparing
the two implementations. The Go API is the reference; where the two disagree,
the Go behaviour is the intended one unless this documentation says otherwise.

## How decisions are presented

- **Implemented** describes current behaviour.
- **Why this practice** explains the concrete benefit here.
- **Trade-off** records the cost the choice creates.
- **Difference** records a deliberate divergence from the Go API.

## Verification commands

```bash
# from the repository root
docker compose --profile spring up -d --build api-spring
curl -s localhost:8082/health

# The parity checks used while building this, comparing 8082 against 8081.
# Both APIs must be running.
curl -s 'localhost:8082/api/products?pageSize=2&sortBy=price&sortDir=asc'
curl -s 'localhost:8081/api/products?pageSize=2&sortBy=price&sortDir=asc'
```

There is no test suite. That is a real gap, recorded as such in the feature
document rather than glossed over.
