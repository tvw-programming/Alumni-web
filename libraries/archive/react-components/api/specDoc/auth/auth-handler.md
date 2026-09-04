## Component Specification

### Name & Purpose
`AuthHandler` — the HTTP surface for authentication. Owns the cookie policy and
the dev-mode reset-link behaviour; every rule beyond that lives in `auth.Service`.

### Location
`api/internal/handler/auth_handler.go`

### Public Interface

```go
const RefreshCookieName = "idol_refresh"

func NewAuthHandler(service *auth.Service, timeout time.Duration,
                    secure bool, resetURL string, devMode bool) *AuthHandler

func (h *AuthHandler) Login(c *fiber.Ctx) error           // POST /api/auth/login
func (h *AuthHandler) Refresh(c *fiber.Ctx) error         // POST /api/auth/refresh
func (h *AuthHandler) Logout(c *fiber.Ctx) error          // POST /api/auth/logout?all=true
func (h *AuthHandler) Me(c *fiber.Ctx) error              // GET  /api/auth/me
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error  // POST /api/auth/forgot-password
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error   // POST /api/auth/reset-password
```

Routing, with the rate limiter (`cmd/server/main.go`):

```go
authRoutes := app.Group("/api/auth")
authRoutes.Post("/login", credentialLimiter, authHandler.Login)
authRoutes.Post("/forgot-password", credentialLimiter, authHandler.ForgotPassword)
authRoutes.Post("/reset-password", credentialLimiter, authHandler.ResetPassword)
authRoutes.Post("/refresh", authHandler.Refresh)   // deliberately not limited
authRoutes.Post("/logout", authHandler.Logout)
authRoutes.Get("/me", handler.RequireAuth(tokenIssuer), authHandler.Me)
```

### Dependencies
- Internal: `auth.Service`, `apperror`, `model`.
- External: Fiber; `fiber/middleware/limiter` at the route.

### Data Models

Request:
```json
{ "email": "…", "password": "…", "rememberMe": true }
```

Response (`login`, `refresh`) — the refresh token is **not** in the body:
```json
{ "token": "<jwt>", "expiresIn": 900,
  "user": { "id": 1, "email": "…", "displayName": "…", "role": "admin" } }
```

### Business Rules & Constraints

**The refresh token is an httpOnly cookie, never a body field:**

```go
cookie := &fiber.Cookie{
    Name: RefreshCookieName, Value: token,
    Path: "/api/auth", HTTPOnly: true, Secure: h.secure,
    SameSite: "Lax", // the refresh endpoint is only called same-origin
}
if persistent {           // "remember me"
    cookie.Expires = time.Now().Add(ttl)
    cookie.MaxAge  = int(ttl.Seconds())
}
```

- `HTTPOnly` — script cannot read it, so an XSS bug cannot exfiltrate a 30-day
  session.
- `SameSite=Lax` — blocks the cross-site POST that CSRF depends on.
- **No `Expires`/`MaxAge` without "remember me"** — the cookie is then
  session-scoped and dies with the browser.
- `Path=/api/auth` — the cookie is not sent to any other endpoint.

**A failed refresh clears the cookie.** It can never work again; leaving it
would make the client retry forever.

**`ForgotPassword` always answers 202** with the same message, whether or not the
address exists. The dev-mode reset link is gated:

```go
if h.devMode && token != "" && user != nil {
    response["devResetUrl"] = h.resetURL + "?token=" + token
}
```
Returning that in production would hand anyone a password reset for any address.

**`Me` reads the database, not the token,** so a role change takes effect without
waiting for the access token to expire.

**Rate limiting is per-IP, 10/minute, on the credential endpoints only.** It is
the network-level companion to the per-account lockout: the lockout stops one
account being ground down, this stops one source spraying many accounts. Refresh
is excluded — it is a normal background action and limiting it would sign people out.

### Extension Points

- **A new auth endpoint:** add to the `authRoutes` group; apply
  `credentialLimiter` if it accepts credentials.
- **A mailer:** replace the `devResetUrl` branch in `ForgotPassword` with a send
  call. The service already returns the token and the user.
- **Cookie policy changes:** `setRefreshCookie` / `clearRefreshCookie` only —
  they are the two places the policy is expressed.
