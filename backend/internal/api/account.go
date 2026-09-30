package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/HrushiBhatt/Productivity-Manager/backend/internal/auth"
	"github.com/HrushiBhatt/Productivity-Manager/backend/internal/store"
)

type registration struct {
	Email    string `json:"email" binding:"required,email,max=254"`
	Password string `json:"password" binding:"required,min=8,max=72"` // bcrypt reads at most 72 bytes
	Name     string `json:"name" binding:"max=60"`
}

type credentials struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *handler) register(c *gin.Context) {
	var in registration
	if !bind(c, &in) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	var taken int64
	if !ok(c, h.DB.Model(&store.User{}).Where("email = ?", email).Count(&taken).Error) {
		return
	}
	if taken > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "that email already has an account, so try logging in"})
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if !ok(c, err) {
		return
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		name, _, _ = strings.Cut(email, "@")
	}
	user := store.User{Email: email, Name: name, PasswordHash: hash, Settings: store.DefaultSettings}
	if !ok(c, h.DB.Create(&user).Error) || !ok(c, h.Auth.SignIn(c, user.ID)) {
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (h *handler) login(c *gin.Context) {
	var in credentials
	if !bind(c, &in) {
		return
	}
	var user store.User
	err := h.DB.Where("email = ?", strings.ToLower(strings.TrimSpace(in.Email))).Limit(1).Find(&user).Error
	if !ok(c, err) {
		return
	}
	if !auth.CheckPassword(user.PasswordHash, in.Password) { // runs bcrypt even for unknown emails
		c.JSON(http.StatusUnauthorized, gin.H{"error": "wrong email or password"})
		return
	}
	if ok(c, h.Auth.SignIn(c, user.ID)) {
		c.JSON(http.StatusOK, user)
	}
}

func (h *handler) logout(c *gin.Context) {
	h.Auth.SignOut(c)
	c.Status(http.StatusNoContent)
}

func (h *handler) me(c *gin.Context) {
	var user store.User
	if err := h.DB.First(&user, auth.UserID(c)).Error; err != nil {
		h.Auth.SignOut(c) // valid token for an account that no longer exists
		c.JSON(http.StatusUnauthorized, gin.H{"error": "please log in"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *handler) saveSettings(c *gin.Context) {
	var settings store.Settings
	if !bind(c, &settings) {
		return
	}
	uid := auth.UserID(c)
	if !ok(c, h.DB.Model(&store.User{ID: uid}).Select("settings").Updates(store.User{Settings: settings}).Error) {
		return
	}
	h.changed(uid, "settings")
	c.JSON(http.StatusOK, settings)
}
