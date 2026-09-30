// Package auth handles passwords and login sessions. A signed JWT rides in an
// HttpOnly cookie, so it's sent automatically by fetch and EventSource alike and
// can't be read by page scripts.
package auth

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	cookieName = "bf_session"
	lifetime   = 30 * 24 * time.Hour
	userKey    = "userID"
)

// Cost is the bcrypt work factor. Tests lower it to stay fast.
var Cost = bcrypt.DefaultCost

type Manager struct {
	secret []byte
	secure bool // add the Secure flag: set when serving over HTTPS
}

func NewManager(secret []byte, secureCookies bool) *Manager {
	return &Manager{secret: secret, secure: secureCookies}
}

func HashPassword(password string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(password), Cost)
}

// dummyHash lets a login for an unknown email take as long as a wrong password,
// so response times don't reveal which emails have accounts.
var dummyHash = sync.OnceValue(func() []byte {
	hash, _ := bcrypt.GenerateFromPassword([]byte("no such user"), Cost)
	return hash
})

// CheckPassword reports whether password matches hash. A nil hash (no such user) never matches.
func CheckPassword(hash []byte, password string) bool {
	if hash == nil {
		_ = bcrypt.CompareHashAndPassword(dummyHash(), []byte(password))
		return false
	}
	return bcrypt.CompareHashAndPassword(hash, []byte(password)) == nil
}

// SignIn sets the session cookie for userID.
func (m *Manager) SignIn(c *gin.Context, userID uint) error {
	now := time.Now()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Subject:   strconv.FormatUint(uint64(userID), 10),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(lifetime)),
	}).SignedString(m.secret)
	if err != nil {
		return err
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(cookieName, token, int(lifetime.Seconds()), "/", "", m.secure, true)
	return nil
}

// SignOut clears the session cookie.
func (m *Manager) SignOut(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(cookieName, "", -1, "/", "", m.secure, true)
}

// Required rejects requests without a valid session and records the user for handlers.
func (m *Manager) Required() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, err := c.Cookie(cookieName)
		if err != nil {
			unauthorized(c)
			return
		}
		var claims jwt.RegisteredClaims
		_, err = jwt.ParseWithClaims(raw, &claims, func(*jwt.Token) (any, error) { return m.secret, nil },
			jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
		if err != nil {
			unauthorized(c)
			return
		}
		id, err := strconv.ParseUint(claims.Subject, 10, 64)
		if err != nil {
			unauthorized(c)
			return
		}
		c.Set(userKey, uint(id))
		c.Next()
	}
}

// UserID is the signed-in user. Only valid behind Required.
func UserID(c *gin.Context) uint {
	return c.MustGet(userKey).(uint)
}

func unauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "please log in"})
}
