// Package firebaseauth validates Firebase ID tokens on the API edge.
//
// The rule this package exists to enforce: the browser never tells us who it
// is. It presents a token signed by Google, we verify the signature against
// Google's rotating public keys, and the uid we act on comes out of that
// verification. A uid in a request body or header is ignored everywhere.
package firebaseauth

import (
	"context"
	"errors"
	"strings"
	"time"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/gofiber/fiber/v2"
	"google.golang.org/api/option"
)

// ContextKey is where the verified token lands for downstream handlers.
const ContextKey = "firebase_token"

var (
	ErrMissingToken = errors.New("authorization header is missing a bearer token")
	ErrInvalidToken = errors.New("token failed verification")
)

type Verifier interface {
	VerifyIDTokenAndCheckRevoked(ctx context.Context, idToken string) (*auth.Token, error)
}

type Client struct {
	auth Verifier
}

// optionsFor prefers an explicit service-account file and otherwise falls back
// to Application Default Credentials, which is what Cloud Run and GKE provide.
// Returning nil options rather than erroring keeps the ADC path working.
func optionsFor(credentialsFile string) []option.ClientOption {
	if credentialsFile == "" {
		return nil
	}
	return []option.ClientOption{option.WithCredentialsFile(credentialsFile)}
}

func New(ctx context.Context, credentialsFile string) (*Client, error) {
	app, err := firebase.NewApp(ctx, nil, optionsFor(credentialsFile)...)
	if err != nil {
		return nil, err
	}
	client, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}
	return &Client{auth: client}, nil
}

// Protect rejects anything without a currently valid, unrevoked ID token.
//
// CheckRevoked costs a lookup but is the difference between "signed out" and
// "signed out everywhere": without it a stolen token stays valid for its full
// hour after the user revokes their sessions.
func (c *Client) Protect() fiber.Handler {
	return func(ctx *fiber.Ctx) error {
		raw := bearer(ctx.Get(fiber.HeaderAuthorization))
		if raw == "" {
			return fiber.NewError(fiber.StatusUnauthorized, ErrMissingToken.Error())
		}

		verifyCtx, cancel := context.WithTimeout(ctx.UserContext(), 5*time.Second)
		defer cancel()

		token, err := c.auth.VerifyIDTokenAndCheckRevoked(verifyCtx, raw)
		if err != nil {
			// Deliberately vague to the client, detailed in the log: telling a
			// caller *why* a token failed helps them forge a better one.
			return fiber.NewError(fiber.StatusUnauthorized, ErrInvalidToken.Error())
		}

		ctx.Locals(ContextKey, token)
		return ctx.Next()
	}
}

// RequireAdmin gates the admin panel behind a custom claim.
//
// The claim is set server-side with SetCustomUserClaims and travels inside the
// signed token, so it cannot be edited by the client that carries it. Checking
// a role column in Postgres instead would be a second round trip on every
// request to learn something the token already proves.
func RequireAdmin() fiber.Handler {
	return func(ctx *fiber.Ctx) error {
		token, ok := ctx.Locals(ContextKey).(*auth.Token)
		if !ok {
			return fiber.NewError(fiber.StatusUnauthorized, ErrMissingToken.Error())
		}
		if admin, _ := token.Claims["admin"].(bool); !admin {
			return fiber.NewError(fiber.StatusForbidden, "administrator access required")
		}
		return ctx.Next()
	}
}

// UID is the only sanctioned way for a handler to learn who is calling.
func UID(ctx *fiber.Ctx) string {
	token, ok := ctx.Locals(ContextKey).(*auth.Token)
	if !ok {
		return ""
	}
	return token.UID
}

func bearer(header string) string {
	const prefix = "Bearer "
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return ""
	}
	return strings.TrimSpace(header[len(prefix):])
}
