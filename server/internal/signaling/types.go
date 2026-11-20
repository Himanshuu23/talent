package signaling

import (
	"sync"

	"github.com/gorilla/websocket"
)

type UserRole string

const (
	RoleAdmin     UserRole = "admin"
	RolePerformer UserRole = "performer"
	RoleViewer    UserRole = "viewer"
)

type Client struct {
	ID           string
	Conn         *websocket.Conn
	Room         string
	ServerID     string
	Role         UserRole
	Email        string
	Username     string
	ProfilePic   string
	IsPerforming bool
	SocialLinks  map[string]string
	ConnID       string // unique per websocket connection; used to ignore stale disconnects
	writeMu      sync.Mutex
}

func (c *Client) Send(v interface{}) error {
	if c == nil || c.Conn == nil {
		return nil
	}
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	return c.Conn.WriteJSON(v)
}

func (c *Client) Public() map[string]interface{} {
	links := c.SocialLinks
	if links == nil {
		links = map[string]string{}
	}
	return map[string]interface{}{
		"userId":       c.ID,
		"username":     c.Username,
		"profilePic":   c.ProfilePic,
		"role":         string(c.Role),
		"isPerforming": c.IsPerforming,
		"socialLinks":  links,
		"hasMedia":     c.Role == RoleAdmin || c.Role == RolePerformer,
	}
}

type StoredUser struct {
	UserID       string            `json:"userId"`
	Username     string            `json:"username"`
	Email        string            `json:"email"`
	ProfilePic   string            `json:"profilePic"`
	Role         string            `json:"role"`
	IsPerforming bool              `json:"isPerforming"`
	SocialLinks  map[string]string `json:"socialLinks"`
	HasMedia     bool              `json:"hasMedia"`
	ServerID     string            `json:"serverId"`
	ConnID       string            `json:"connId"`
}

func (u StoredUser) Map() map[string]interface{} {
	links := u.SocialLinks
	if links == nil {
		links = map[string]string{}
	}
	return map[string]interface{}{
		"userId":       u.UserID,
		"username":     u.Username,
		"profilePic":   u.ProfilePic,
		"role":         u.Role,
		"isPerforming": u.IsPerforming,
		"socialLinks":  links,
		"hasMedia":     u.HasMedia,
	}
}

type ScoreInfo struct {
	ViewerAverage float64 `json:"viewerAverage"`
	ViewerCount   int     `json:"viewerCount"`
	AdminScore    float64 `json:"adminScore"`
	HasAdminScore bool    `json:"hasAdminScore"`
	Tips          float64 `json:"tips"`
}
