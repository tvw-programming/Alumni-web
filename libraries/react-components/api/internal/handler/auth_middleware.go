package handler

import (
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/apperror"
	"github.com/example/idol-promo/api/internal/auth"
)

const claimsContextKey = "auth.claims"

type Permission string

const (
	PermissionProductCreate Permission = "products:create"
	PermissionProductUpdate Permission = "products:update"
	PermissionProductDelete Permission = "products:delete"
)

var rolePermissions = map[string]map[Permission]struct{}{
	"admin": {
		PermissionProductCreate: {},
		PermissionProductUpdate: {},
		PermissionProductDelete: {},
	},
	"user": {},
}

// RequireAuth rejects a request without a valid access token.
func RequireAuth(tokens *auth.TokenIssuer) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		// Case-insensitive scheme match: the RFC says the scheme is not
		// case-sensitive, and some clients send "bearer".
		if len(header) < 7 || !strings.EqualFold(header[:7], "bearer ") {
			return apperror.New(http.StatusUnauthorized, "UNAUTHENTICATED",
				"Sign in to continue.", nil)
		}

		claims, err := tokens.Verify(strings.TrimSpace(header[7:]))
		if err != nil {
			return apperror.New(http.StatusUnauthorized, "UNAUTHENTICATED",
				"Your session has expired. Please sign in again.", err)
		}

		c.Locals(claimsContextKey, claims)
		return c.Next()
	}
}

// RequireRole gates a route on the caller's role.
//
// The role is read from the verified token, so this is only as fresh as the
// access token's lifetime — which is why that lifetime is minutes, not days.
func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		claims, ok := ClaimsFrom(c)
		if !ok {
			return apperror.New(http.StatusUnauthorized, "UNAUTHENTICATED",
				"Sign in to continue.", nil)
		}
		if _, permitted := allowed[claims.Role]; !permitted {
			return apperror.New(http.StatusForbidden, "FORBIDDEN",
				"You do not have access to this resource.", nil)
		}
		return c.Next()
	}
}

// RequirePermission keeps route policy expressed as capabilities. Roles remain
// an identity attribute, while this map is the single authorization policy.
func RequirePermission(permission Permission) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := ClaimsFrom(c)
		if !ok {
			return apperror.New(http.StatusUnauthorized, "UNAUTHENTICATED",
				"Sign in to continue.", nil)
		}
		permissions, knownRole := rolePermissions[claims.Role]
		if _, permitted := permissions[permission]; !knownRole || !permitted {
			return apperror.New(http.StatusForbidden, "FORBIDDEN",
				"You do not have access to this resource.", nil)
		}
		return c.Next()
	}
}

// ClaimsFrom returns the verified claims placed by RequireAuth.
func ClaimsFrom(c *fiber.Ctx) (*auth.Claims, bool) {
	claims, ok := c.Locals(claimsContextKey).(*auth.Claims)
	return claims, ok
}
