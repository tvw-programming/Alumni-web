package handler

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/example/idol-promo/api/internal/apperror"
	"github.com/example/idol-promo/api/internal/auth"
	"github.com/example/idol-promo/api/internal/model"
	"github.com/example/idol-promo/api/internal/validation"
)

// RefreshCookieName is the only place the refresh token lives on the client.
//
// An httpOnly cookie rather than localStorage: script cannot read it, so an XSS
// bug cannot exfiltrate a 30-day session. The short-lived access token is the
// one the SPA holds, in memory only.
const RefreshCookieName = "idol_refresh"

type AuthHandler struct {
	service  *auth.Service
	timeout  time.Duration
	secure   bool
	resetURL string
	devMode  bool
}

func NewAuthHandler(service *auth.Service, timeout time.Duration, secure bool, resetURL string, devMode bool) *AuthHandler {
	return &AuthHandler{service: service, timeout: timeout, secure: secure, resetURL: resetURL, devMode: devMode}
}

type loginRequest struct {
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required"`
	RememberMe bool   `json:"rememberMe"`
}

type userPayload struct {
	ID          uint64 `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

type sessionPayload struct {
	Token     string      `json:"token"`
	ExpiresIn int         `json:"expiresIn"`
	User      userPayload `json:"user"`
}

func toUserPayload(u *model.User) userPayload {
	return userPayload{ID: u.ID, Email: u.Email, DisplayName: u.DisplayName, Role: string(u.Role)}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var body loginRequest
	if err := c.BodyParser(&body); err != nil {
		return apperror.New(http.StatusBadRequest, "INVALID_BODY", "Malformed request body.", err)
	}
	body.Email = strings.TrimSpace(body.Email)
	if err := validation.Struct(body); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	session, err := h.service.Login(ctx, auth.LoginInput{
		Email:      body.Email,
		Password:   body.Password,
		RememberMe: body.RememberMe,
		UserAgent:  c.Get("User-Agent"),
		IPAddress:  c.IP(),
	})
	if err != nil {
		return err
	}

	h.setRefreshCookie(c, session.RefreshToken, session.RefreshTTL, body.RememberMe)
	return c.JSON(sessionPayload{
		Token:     session.AccessToken,
		ExpiresIn: session.ExpiresIn,
		User:      toUserPayload(session.User),
	})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	token := c.Cookies(RefreshCookieName)
	if token == "" {
		return apperror.New(http.StatusUnauthorized, "NO_SESSION", "No session to refresh.", nil)
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	session, err := h.service.Refresh(ctx, token, c.Get("User-Agent"), c.IP())
	if err != nil {
		// The cookie is useless now; clearing it stops the client retrying with
		// a token that can never work again.
		h.clearRefreshCookie(c)
		return err
	}

	h.setRefreshCookie(c, session.RefreshToken, session.RefreshTTL, session.RefreshTTL > 24*time.Hour)
	return c.JSON(sessionPayload{
		Token:     session.AccessToken,
		ExpiresIn: session.ExpiresIn,
		User:      toUserPayload(session.User),
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	allDevices := c.Query("all") == "true"
	if err := h.service.Logout(ctx, c.Cookies(RefreshCookieName), allDevices); err != nil {
		return err
	}
	h.clearRefreshCookie(c)
	return c.SendStatus(http.StatusNoContent)
}

// Me returns the caller's identity, from the database rather than the token, so
// a role change takes effect without waiting for the token to expire.
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	claims, ok := ClaimsFrom(c)
	if !ok {
		return apperror.New(http.StatusUnauthorized, "UNAUTHENTICATED", "Sign in to continue.", nil)
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	user, err := h.service.UserByID(ctx, claims.UserID)
	if err != nil {
		return apperror.New(http.StatusUnauthorized, "UNAUTHENTICATED", "Sign in to continue.", err)
	}
	return c.JSON(toUserPayload(user))
}

type forgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ForgotPassword always answers 202, whether or not the email exists.
//
// Any difference — status, body, timing — would let someone enumerate accounts.
// In development the reset link is returned in the response so the flow is
// testable without a mail server; that branch is gated on dev mode, because
// returning it in production would hand anyone a password reset for any address.
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var body forgotPasswordRequest
	if err := c.BodyParser(&body); err != nil {
		return apperror.New(http.StatusBadRequest, "INVALID_BODY", "Malformed request body.", err)
	}
	body.Email = strings.TrimSpace(body.Email)
	if err := validation.Struct(body); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	token, user, err := h.service.RequestPasswordReset(ctx, body.Email)
	if err != nil {
		return err
	}

	response := fiber.Map{
		"message": "If that email is registered, a reset link has been sent.",
	}
	if h.devMode && token != "" && user != nil {
		response["devResetUrl"] = h.resetURL + "?token=" + token
		response["devNote"] = "Returned only because the API is in development mode."
	}
	return c.Status(http.StatusAccepted).JSON(response)
}

type resetPasswordRequest struct {
	Token    string `json:"token" validate:"required"`
	Password string `json:"password" validate:"required"`
}

func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var body resetPasswordRequest
	if err := c.BodyParser(&body); err != nil {
		return apperror.New(http.StatusBadRequest, "INVALID_BODY", "Malformed request body.", err)
	}
	if err := validation.Struct(body); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), h.timeout)
	defer cancel()

	if err := h.service.ResetPassword(ctx, body.Token, body.Password); err != nil {
		return err
	}
	// Every session was revoked, so the cookie in hand is dead too.
	h.clearRefreshCookie(c)
	return c.JSON(fiber.Map{"message": "Your password has been updated. Please sign in."})
}

func (h *AuthHandler) setRefreshCookie(c *fiber.Ctx, token string, ttl time.Duration, persistent bool) {
	cookie := &fiber.Cookie{
		Name:     RefreshCookieName,
		Value:    token,
		Path:     "/api/auth",
		HTTPOnly: true,
		Secure:   h.secure,
		// Lax, not None: the refresh endpoint is only ever called by our own
		// origin, and Lax blocks the cross-site POST that CSRF depends on.
		SameSite: "Lax",
	}
	if persistent {
		// "Remember me": an absolute expiry, so the session survives the browser
		// closing. Without it the cookie is session-scoped and dies with the tab.
		cookie.Expires = time.Now().Add(ttl)
		cookie.MaxAge = int(ttl.Seconds())
	}
	c.Cookie(cookie)
}

func (h *AuthHandler) clearRefreshCookie(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     RefreshCookieName,
		Value:    "",
		Path:     "/api/auth",
		HTTPOnly: true,
		Secure:   h.secure,
		SameSite: "Lax",
		Expires:  time.Now().Add(-time.Hour),
		MaxAge:   -1,
	})
}
