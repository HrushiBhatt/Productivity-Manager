// Package store defines the database models and opens the SQLite database.
package store

import (
	"log"
	"os"
	"time"

	"github.com/glebarez/sqlite" // pure-Go SQLite driver: no C compiler needed
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Settings are a user's preferences, stored on the server so they follow them across devices.
type Settings struct {
	Sound     bool   `json:"sound"`
	Notify    bool   `json:"notify"`
	AutoBreak bool   `json:"autoBreak"`
	Strict    bool   `json:"strict"`
	Breathe   bool   `json:"breathe"`
	Tick      string `json:"tick" binding:"oneof=off clock ominous"`
}

// DefaultSettings apply to new accounts.
var DefaultSettings = Settings{Sound: true, AutoBreak: true, Breathe: true, Tick: "off"}

type User struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Email        string    `json:"email" gorm:"size:254;uniqueIndex;not null"`
	Name         string    `json:"name" gorm:"size:60"`
	PasswordHash []byte    `json:"-" gorm:"not null"`
	Settings     Settings  `json:"settings" gorm:"serializer:json"`
	CreatedAt    time.Time `json:"created_at"`
}

// Preset is a saved custom timing mode, e.g. "Thesis 75/15".
type Preset struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"-" gorm:"index;not null"`
	Name      string    `json:"name" gorm:"size:32;not null"`
	FocusMin  int       `json:"focus" gorm:"not null"`
	RestMin   int       `json:"rest" gorm:"not null"`
	CreatedAt time.Time `json:"-"`
}

// Task is something to get done, worked on over one or more focus sessions.
type Task struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"-" gorm:"index;not null"`
	Title     string    `json:"title" gorm:"size:120;not null"`
	Estimate  int       `json:"estimate"` // planned number of focus blocks
	Done      bool      `json:"done"`
	CreatedAt time.Time `json:"created_at"`
}

// Session states. A focus session is written when it starts and updated as it runs,
// so a restarted server can pick it back up. Only done sessions count in stats.
const (
	StateRunning = "running"
	StatePaused  = "paused"
	StateDone    = "done"
)

// Session is one focus block (breaks are not stored).
type Session struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	UserID       uint   `json:"-" gorm:"index;not null"`
	TaskID       *uint  `json:"task_id"`
	Mode         string `json:"mode" gorm:"size:32;not null"`
	Planned      int    `json:"planned"`   // seconds
	Focused      int    `json:"focused"`   // seconds
	Completed    bool   `json:"completed"` // ran to zero rather than ended early
	Intention    string `json:"intention" gorm:"size:140"`
	Reflection   string `json:"reflection" gorm:"size:280"`
	Distractions int    `json:"distractions"`
	// The user's local calendar day when the block started, so streaks follow their midnight.
	Day         string     `json:"day" gorm:"size:10;index"`
	State       string     `json:"-" gorm:"size:8;index"`
	EndsAt      *time.Time `json:"-"` // while running
	RemainingMs int64      `json:"-"` // while paused
	CreatedAt   time.Time  `json:"created_at"`
}

// Done scopes a query to one user's finished sessions.
func Done(userID uint) func(*gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("user_id = ? AND state = ?", userID, StateDone)
	}
}

// Cafe lists the pixel decorations and the number of full brews that unlocks each.
// IDs match the sprites in the frontend.
var Cafe = []struct {
	ID string
	At int
}{
	{"sprout", 1}, {"lamp", 3}, {"cat", 5}, {"books", 10},
	{"moka", 20}, {"vinyl", 35}, {"candle", 50}, {"golden-mug", 100},
}

// CafeUnlock returns the decoration earned on reaching n full brews, or "".
func CafeUnlock(n int) string {
	for _, item := range Cafe {
		if item.At == n {
			return item.ID
		}
	}
	return ""
}

// Open connects to the SQLite database at path (":memory:" for tests) and migrates the schema.
func Open(path string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{
		NowFunc: func() time.Time { return time.Now().UTC() },
		Logger: logger.New(log.New(os.Stderr, "", log.LstdFlags), logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true, // a 404, not a problem worth logging
		}),
	})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	// One connection: SQLite serializes writes anyway, and ":memory:" gives each connection its own database.
	sqlDB.SetMaxOpenConns(1)
	return db, db.AutoMigrate(&User{}, &Preset{}, &Task{}, &Session{})
}
