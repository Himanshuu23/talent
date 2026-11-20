package signaling

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"server/internal/config"
	"server/internal/redis"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Handler struct {
	config      *config.Config
	redisClient *redis.Client
	rooms       map[string]*LocalRoom
	roomsMu     sync.RWMutex
	subscribers map[string]chan struct{}
	subMu       sync.Mutex
	timers      map[string]chan struct{}
	timerMu     sync.Mutex
}

func NewHandler(cfg *config.Config, redisClient *redis.Client) *Handler {
	return &Handler{
		config:      cfg,
		redisClient: redisClient,
		rooms:       make(map[string]*LocalRoom),
		subscribers: make(map[string]chan struct{}),
		timers:      make(map[string]chan struct{}),
	}
}

func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	conn.SetReadLimit(64 * 1024)

	client := &Client{
		ID:          uuid.New().String(),
		ConnID:      uuid.New().String(),
		Conn:        conn,
		ServerID:    h.config.ServerID,
		SocialLinks: make(map[string]string),
	}

	defer func() {
		if client.Room != "" {
			h.handleClientLeave(client)
		}
		conn.Close()
	}()

	for {
		var msg map[string]interface{}
		if err := conn.ReadJSON(&msg); err != nil {
			log.Println("Read error:", err)
			break
		}
		msgType, _ := msg["type"].(string)
		h.handleMessage(client, msgType, msg)
	}
}

func (h *Handler) handleMessage(client *Client, msgType string, msg map[string]interface{}) {
	switch msgType {
	case "create-room":
		h.handleCreateRoom(client, msg)
	case "join-room":
		h.handleJoinRoom(client, msg)
	case "leave-room":
		h.handleLeaveRoom(client)
	case "close-room":
		h.handleCloseRoom(client, msg)
	case "send-message":
		h.handleSendMessage(client, msg)
	case "vote":
		h.handleVote(client, msg)
	case "cheer":
		h.handleCheer(client, msg)
	case "donate":
		h.handleDonate(client, msg)
	case "admin-score":
		h.handleAdminScore(client, msg)
	case "join-queue":
		h.handleJoinQueue(client, msg)
	case "leave-queue":
		h.handleLeaveQueue(client, msg)
	case "start-performance":
		h.handleStartPerformance(client, msg)
	case "end-performance":
		h.handleEndPerformance(client, msg, true)
	case "signal":
		h.handleSignal(client, msg)
	case "get-users":
		h.handleGetUsers(client, msg)
	case "get-room-info":
		h.handleGetRoomInfo(client, msg)
	case "update-profile":
		h.handleUpdateProfile(client, msg)
	case "list-rooms":
		h.handleListRooms(client)
	case "make-admin":
		h.handleMakeAdmin(client, msg)
	default:
		log.Printf("Unknown message type: %s", msgType)
	}
}

func (h *Handler) handleCreateRoom(client *Client, msg map[string]interface{}) {
	if client.Room != "" {
		h.handleClientLeave(client)
	}
	h.applyIdentity(client, msg)
	client.Role = RoleAdmin

	roomCategory := str(msg["roomCategory"])
	if roomCategory == "" {
		roomCategory = "variety"
	}
	roomName := str(msg["roomName"])
	if roomName == "" {
		roomName = h.generateRoomName(roomCategory)
	}
	duration := intFrom(msg["performerDuration"], 180)
	if duration < 30 {
		duration = 30
	}
	if duration > 1800 {
		duration = 1800
	}

	roomCode := h.generateRoomCode()
	for {
		exists, _ := h.redisClient.Exists("room:" + roomCode)
		if !exists {
			break
		}
		roomCode = h.generateRoomCode()
	}

	if !h.checkSecret(roomCode, client.ID, str(msg["secret"])) {
		client.Role = RoleViewer
		_ = client.Send(map[string]interface{}{"type": "create-room", "error": "Identity check failed. Refresh the page and try again."})
		return
	}
	_ = h.redisClient.HSet("room:"+roomCode+":admins", client.ID, "1")

	now := time.Now().Unix()
	_ = h.redisClient.HSet("rooms", roomCode, strconv.FormatInt(now, 10))
	_ = h.redisClient.HSet("room:"+roomCode,
		"adminId", client.ID,
		"admin", client.Username,
		"roomCode", roomCode,
		"roomCategory", roomCategory,
		"roomName", roomName,
		"createdAt", strconv.FormatInt(now, 10),
		"performerDuration", strconv.Itoa(duration),
		"currentPerformer", "",
		"totalDonations", "0",
	)

	client.Room = roomCode
	h.addLocalClient(roomCode, client)
	h.saveUser(client)
	h.startRoomSubscription(roomCode)

	snapshot := h.roomSnapshot(roomCode)
	_ = client.Send(map[string]interface{}{
		"type":     "create-room",
		"message":  "Room created",
		"roomCode": roomCode,
		"room":     snapshot,
		"you":      client.Public(),
		"chat":     h.chatHistory(roomCode),
	})
}

func (h *Handler) handleJoinRoom(client *Client, msg map[string]interface{}) {
	roomCode := strings.ToLower(strings.TrimSpace(str(msg["roomCode"])))
	if roomCode == "" {
		_ = client.Send(map[string]interface{}{"type": "join-room", "error": "Enter a room code."})
		return
	}

	meta, err := h.redisClient.HGetAll("room:" + roomCode)
	if err != nil || len(meta) == 0 {
		_ = client.Send(map[string]interface{}{"type": "join-room", "error": "Invalid room code."})
		return
	}

	if client.Room != "" && client.Room != roomCode {
		h.handleClientLeave(client)
	}
	h.applyIdentity(client, msg)
	if !h.checkSecret(roomCode, client.ID, str(msg["secret"])) {
		_ = client.Send(map[string]interface{}{"type": "join-room", "error": "Identity check failed. Refresh the page and try again."})
		return
	}

	// Admin rights are decided by the server only: the creator or someone the
	// host promoted. A client asking for role "admin" gets nothing extra.
	switch strings.ToLower(str(msg["role"])) {
	case "performer":
		client.Role = RolePerformer
	default:
		client.Role = RoleViewer
	}
	if meta["adminId"] == client.ID || h.isRoomAdmin(roomCode, client.ID) {
		client.Role = RoleAdmin
	}

	if prev, ok := h.findLocalClient(roomCode, client.ID); ok && prev != client {
		prev.Room = ""
		h.removeLocalClient(roomCode, prev.ID)
	}

	client.Room = roomCode
	h.addLocalClient(roomCode, client)
	h.saveUser(client)
	h.startRoomSubscription(roomCode)

	snapshot := h.roomSnapshot(roomCode)
	_ = client.Send(map[string]interface{}{
		"type":     "join-room",
		"message":  client.Username + " joined the room",
		"roomCode": roomCode,
		"room":     snapshot,
		"you":      client.Public(),
		"chat":     h.chatHistoryFor(client, roomCode),
	})

	h.publishAndBroadcast(roomCode, client.ID, map[string]interface{}{
		"type":   "user-joined",
		"user":   client.Public(),
		"userId": client.ID,
		"room":   snapshot,
	})
}

func (h *Handler) handleLeaveRoom(client *Client) {
	if client.Room == "" {
		return
	}
	h.handleClientLeave(client)
	_ = client.Send(map[string]interface{}{
		"type":    "leave-room",
		"message": "Left room successfully",
	})
}

func (h *Handler) handleCloseRoom(client *Client, msg map[string]interface{}) {
	roomCode := client.Room
	meta, _ := h.redisClient.HGetAll("room:" + roomCode)
	if roomCode == "" || len(meta) == 0 || client.Role != RoleAdmin {
		_ = client.Send(map[string]interface{}{"type": "close-room", "error": "Only the room admin can close this room."})
		return
	}

	payload := map[string]interface{}{
		"type":    "room-closed",
		"message": "The host closed this room.",
	}
	h.publishAndBroadcast(roomCode, "", payload)

	room := h.getLocalRoom(roomCode)
	if room != nil {
		for _, c := range room.GetAllClients() {
			c.Room = ""
		}
	}

	h.stopTimer(roomCode)
	h.removeLocalRoom(roomCode)
	h.deleteRoomKeys(roomCode)

	_ = client.Send(map[string]interface{}{
		"type":    "close-room",
		"message": "Room closed successfully",
	})
}

func (h *Handler) handleSendMessage(client *Client, msg map[string]interface{}) {
	if client.Room == "" || (client.Role != RoleAdmin && client.Role != RolePerformer) {
		return
	}
	text := clip(strings.TrimSpace(str(msg["message"])), 500)
	if text == "" {
		return
	}
	message := map[string]interface{}{
		"type":       "send-message",
		"id":         uuid.New().String(),
		"message":    text,
		"username":   client.Username,
		"userId":     client.ID,
		"profilePic": client.ProfilePic,
		"role":       string(client.Role),
		"roomCode":   client.Room,
		"timestamp":  time.Now().Unix(),
	}
	if raw, err := json.Marshal(message); err == nil {
		_ = h.redisClient.RPush("room:"+client.Room+":chat", string(raw))
		_ = h.redisClient.LTrim("room:"+client.Room+":chat", -200, -1)
	}
	h.publishAndBroadcast(client.Room, "", message)
}

func (h *Handler) handleVote(client *Client, msg map[string]interface{}) {
	if client.Role != RoleViewer || client.Room == "" {
		_ = client.Send(map[string]interface{}{"type": "vote", "error": "Only viewers can vote."})
		return
	}
	performerID := str(msg["performerEmail"])
	if performerID == "" {
		performerID = str(msg["performerId"])
	}
	current, _ := h.redisClient.HGet("room:"+client.Room, "currentPerformer")
	if current == "" || current != performerID {
		_ = client.Send(map[string]interface{}{"type": "vote", "error": "Vote the performer who is currently on stage."})
		return
	}
	score := intFrom(msg["score"], 0)
	if score < 1 || score > 10 {
		_ = client.Send(map[string]interface{}{"type": "vote", "error": "Score must be between 1 and 10."})
		return
	}
	key := "room:" + client.Room + ":votes:" + performerID
	_ = h.redisClient.HSet(key, client.ID, strconv.Itoa(score))
	info := h.scoreFor(client.Room, performerID)
	h.publishAndBroadcast(client.Room, "", map[string]interface{}{
		"type":           "vote",
		"performerId":    performerID,
		"performerEmail": performerID,
		"score":          score,
		"voterId":        client.ID,
		"averageScore":   info.ViewerAverage,
		"viewerCount":    info.ViewerCount,
		"room":           h.roomSnapshot(client.Room),
	})
}

func (h *Handler) handleCheer(client *Client, msg map[string]interface{}) {
	if client.Role != RoleViewer || client.Room == "" {
		return
	}
	performerID := str(msg["performerEmail"])
	if performerID == "" {
		performerID = str(msg["performerId"])
	}
	text := clip(strings.TrimSpace(str(msg["message"])), 140)
	if text == "" {
		text = "Let's go!"
	}
	cheer := map[string]interface{}{
		"type":           "cheer",
		"performerId":    performerID,
		"performerEmail": performerID,
		"viewerId":       client.ID,
		"viewerName":     client.Username,
		"message":        text,
		"timestamp":      time.Now().Unix(),
	}
	h.publishAndBroadcast(client.Room, "", cheer)
}

func (h *Handler) handleDonate(client *Client, msg map[string]interface{}) {
	if client.Role != RoleViewer || client.Room == "" {
		return
	}
	toUserID := str(msg["toUserID"])
	if toUserID == "" {
		toUserID = str(msg["performerId"])
	}
	if current, _ := h.redisClient.HGet("room:"+client.Room, "currentPerformer"); toUserID == "" {
		toUserID = current
	}
	if toUserID == "" {
		_ = client.Send(map[string]interface{}{"type": "donation", "error": "Nobody is on stage to receive a tip."})
		return
	}
	amount := math.Round(floatFrom(msg["amount"], 0)*100) / 100
	if amount <= 0 || amount > 10000 {
		_ = client.Send(map[string]interface{}{"type": "donation", "error": "Enter a tip between 0.01 and 10,000."})
		return
	}
	_, _ = h.redisClient.IncrByFloat("room:"+client.Room+":tips:"+toUserID, amount)
	total, _ := h.redisClient.IncrByFloat("room:"+client.Room+":donations-total", amount)
	_ = h.redisClient.HSet("room:"+client.Room, "totalDonations", strconv.FormatFloat(total, 'f', 2, 64))

	donation := map[string]interface{}{
		"type":         "donation",
		"fromUserID":   client.ID,
		"fromUsername": client.Username,
		"toUserID":     toUserID,
		"amount":       amount,
		"message":      clip(strings.TrimSpace(str(msg["message"])), 140),
		"timestamp":    time.Now().Unix(),
		"total":        total,
		"room":         h.roomSnapshot(client.Room),
	}
	data, _ := json.Marshal(donation)
	_ = h.redisClient.LPush("room:"+client.Room+":donations", string(data))
	h.publishAndBroadcast(client.Room, "", donation)
}

func (h *Handler) handleAdminScore(client *Client, msg map[string]interface{}) {
	if client.Role != RoleAdmin || client.Room == "" {
		return
	}
	performerID := str(msg["performerEmail"])
	if performerID == "" {
		performerID = str(msg["performerId"])
	}
	score := floatFrom(msg["score"], 0)
	if score < 1 || score > 10 {
		return
	}
	_ = h.redisClient.Set("room:"+client.Room+":admin-score:"+performerID, strconv.FormatFloat(score, 'f', 1, 64), 0)
	info := h.scoreFor(client.Room, performerID)
	h.publishAndBroadcast(client.Room, "", map[string]interface{}{
		"type":           "admin-score",
		"performerId":    performerID,
		"performerEmail": performerID,
		"score":          score,
		"averageScore":   info.ViewerAverage,
		"adminScore":     info.AdminScore,
		"room":           h.roomSnapshot(client.Room),
	})
}

func (h *Handler) handleJoinQueue(client *Client, msg map[string]interface{}) {
	if client.Role != RolePerformer || client.Room == "" {
		return
	}
	roomCode := client.Room
	queue, _ := h.redisClient.LRange("room:"+roomCode+":queue", 0, -1)
	for _, id := range queue {
		if id == client.ID {
			h.publishAndBroadcast(roomCode, "", map[string]interface{}{
				"type":  "queue-updated",
				"queue": queue,
				"room":  h.roomSnapshot(roomCode),
			})
			return
		}
	}
	_ = h.redisClient.RPush("room:"+roomCode+":queue", client.ID)
	queue, _ = h.redisClient.LRange("room:"+roomCode+":queue", 0, -1)
	h.publishAndBroadcast(roomCode, "", map[string]interface{}{
		"type":           "queue-updated",
		"performerId":    client.ID,
		"performerEmail": client.ID,
		"action":         "joined",
		"queue":          queue,
		"room":           h.roomSnapshot(roomCode),
	})
}

func (h *Handler) handleLeaveQueue(client *Client, msg map[string]interface{}) {
	if client.Room == "" {
		return
	}
	_ = h.redisClient.LRem("room:"+client.Room+":queue", 0, client.ID)
	queue, _ := h.redisClient.LRange("room:"+client.Room+":queue", 0, -1)
	h.publishAndBroadcast(client.Room, "", map[string]interface{}{
		"type":   "queue-updated",
		"action": "left",
		"queue":  queue,
		"room":   h.roomSnapshot(client.Room),
	})
}

func (h *Handler) handleStartPerformance(client *Client, msg map[string]interface{}) {
	if client.Role != RoleAdmin || client.Room == "" {
		return
	}
	roomCode := client.Room
	performerID := str(msg["performerEmail"])
	if performerID == "" {
		performerID = str(msg["performerId"])
	}
	if performerID == "" {
		queue, _ := h.redisClient.LRange("room:"+roomCode+":queue", 0, -1)
		if len(queue) == 0 {
			_ = client.Send(map[string]interface{}{"type": "start-performance", "error": "The queue is empty."})
			return
		}
		performerID = queue[0]
	}

	current, _ := h.redisClient.HGet("room:"+roomCode, "currentPerformer")
	if current != "" && current != performerID {
		h.finishPerformance(roomCode, current, false)
	}

	_ = h.redisClient.LRem("room:"+roomCode+":queue", 0, performerID)
	_ = h.redisClient.HSet("room:"+roomCode, "currentPerformer", performerID)
	h.setPerforming(roomCode, performerID, true)

	meta, _ := h.redisClient.HGetAll("room:" + roomCode)
	duration, _ := strconv.Atoi(meta["performerDuration"])
	if duration <= 0 {
		duration = 180
	}
	endsAt := time.Now().Unix() + int64(duration)
	_ = h.redisClient.HSet("room:"+roomCode, "endsAt", strconv.FormatInt(endsAt, 10))

	h.startTimer(roomCode, performerID, time.Duration(duration)*time.Second)

	h.publishAndBroadcast(roomCode, "", map[string]interface{}{
		"type":           "performance-started",
		"performerId":    performerID,
		"performerEmail": performerID,
		"duration":       duration,
		"endsAt":         endsAt,
		"room":           h.roomSnapshot(roomCode),
	})
}

func (h *Handler) handleEndPerformance(client *Client, msg map[string]interface{}, startNext bool) {
	if client.Room == "" {
		return
	}
	if client.Role != RoleAdmin && client.Role != RolePerformer {
		return
	}
	roomCode := client.Room
	performerID := str(msg["performerEmail"])
	if performerID == "" {
		performerID = str(msg["performerId"])
	}
	current, _ := h.redisClient.HGet("room:"+roomCode, "currentPerformer")
	if performerID == "" {
		performerID = current
	}
	if performerID == "" {
		return
	}
	if client.Role == RolePerformer && client.ID != performerID {
		return
	}
	h.finishPerformance(roomCode, performerID, startNext)
}

func (h *Handler) finishPerformance(roomCode, performerID string, startNext bool) {
	h.stopTimer(roomCode)
	current, _ := h.redisClient.HGet("room:"+roomCode, "currentPerformer")
	if current == "" || current != performerID {
		return
	}
	_ = h.redisClient.HSet("room:"+roomCode, "currentPerformer", "", "endsAt", "")
	h.setPerforming(roomCode, performerID, false)

	h.publishAndBroadcast(roomCode, "", map[string]interface{}{
		"type":           "performance-ended",
		"performerId":    performerID,
		"performerEmail": performerID,
		"room":           h.roomSnapshot(roomCode),
	})

	if !startNext {
		return
	}
	queue, _ := h.redisClient.LRange("room:"+roomCode+":queue", 0, -1)
	if len(queue) == 0 {
		return
	}
	next := queue[0]
	// Locate a local admin to keep role checks; start directly if none.
	admin := h.findLocalAdmin(roomCode)
	if admin != nil {
		h.handleStartPerformance(admin, map[string]interface{}{
			"performerId": next,
		})
		return
	}
	_ = h.redisClient.LRem("room:"+roomCode+":queue", 0, next)
	_ = h.redisClient.HSet("room:"+roomCode, "currentPerformer", next)
	h.setPerforming(roomCode, next, true)
	meta, _ := h.redisClient.HGetAll("room:" + roomCode)
	duration, _ := strconv.Atoi(meta["performerDuration"])
	if duration <= 0 {
		duration = 180
	}
	endsAt := time.Now().Unix() + int64(duration)
	_ = h.redisClient.HSet("room:"+roomCode, "endsAt", strconv.FormatInt(endsAt, 10))
	h.startTimer(roomCode, next, time.Duration(duration)*time.Second)
	h.publishAndBroadcast(roomCode, "", map[string]interface{}{
		"type":           "performance-started",
		"performerId":    next,
		"performerEmail": next,
		"duration":       duration,
		"endsAt":         endsAt,
		"room":           h.roomSnapshot(roomCode),
	})
}

func (h *Handler) handleSignal(client *Client, msg map[string]interface{}) {
	if client.Room == "" {
		return
	}
	to := str(msg["to"])
	if to == "" {
		return
	}
	payload := map[string]interface{}{
		"type":    "signal",
		"from":    client.ID,
		"to":      to,
		"payload": msg["signal"],
		"signal":  msg["signal"],
	}
	if target, ok := h.getLocalClient(client.Room, to); ok {
		_ = target.Send(payload)
	}
	raw, _ := json.Marshal(payload)
	_ = h.redisClient.PublishMessage(&redis.Message{
		Type:     "signal",
		From:     client.ID,
		To:       to,
		Room:     client.Room,
		ServerID: h.config.ServerID,
		Payload:  raw,
	})
}

func (h *Handler) handleGetUsers(client *Client, msg map[string]interface{}) {
	roomCode := client.Room
	if roomCode == "" {
		return
	}
	_ = client.Send(map[string]interface{}{
		"type":  "get-users",
		"users": h.usersFromRedis(roomCode),
		"room":  h.roomSnapshot(roomCode),
	})
}

func (h *Handler) handleGetRoomInfo(client *Client, msg map[string]interface{}) {
	roomCode := client.Room
	if roomCode == "" {
		return
	}
	snapshot := h.roomSnapshot(roomCode)
	if snapshot == nil {
		_ = client.Send(map[string]interface{}{"type": "get-room-info", "error": "Room not found"})
		return
	}
	_ = client.Send(map[string]interface{}{
		"type": "get-room-info",
		"room": snapshot,
	})
}

func (h *Handler) handleUpdateProfile(client *Client, msg map[string]interface{}) {
	h.applyIdentity(client, msg)
	if client.Room != "" {
		h.saveUser(client)
		h.publishAndBroadcast(client.Room, "", map[string]interface{}{
			"type": "user-updated",
			"user": client.Public(),
			"room": h.roomSnapshot(client.Room),
		})
	}
	_ = client.Send(map[string]interface{}{
		"type": "update-profile",
		"you":  client.Public(),
	})
}

func (h *Handler) handleClientLeave(client *Client) {
	if client.Room == "" {
		return
	}
	roomCode := client.Room

	// If the same person reconnected (refresh, other server), this socket is
	// stale: drop it locally but leave their live session untouched.
	if raw, err := h.redisClient.HGet("room:"+roomCode+":users", client.ID); err == nil && raw != "" {
		var stored StoredUser
		if json.Unmarshal([]byte(raw), &stored) == nil && stored.ConnID != "" && stored.ConnID != client.ConnID {
			if local, ok := h.getLocalClient(roomCode, client.ID); ok && local == client {
				h.removeLocalClient(roomCode, client.ID)
			}
			client.Room = ""
			return
		}
	}

	_ = h.redisClient.LRem("room:"+roomCode+":queue", 0, client.ID)
	current, _ := h.redisClient.HGet("room:"+roomCode, "currentPerformer")
	if current == client.ID {
		h.finishPerformance(roomCode, client.ID, true)
	}
	_ = h.redisClient.HDel("room:"+roomCode+":users", client.ID)
	h.removeLocalClient(roomCode, client.ID)
	h.publishAndBroadcast(roomCode, client.ID, map[string]interface{}{
		"type":   "user-left",
		"userId": client.ID,
		"from":   client.ID,
		"room":   h.roomSnapshot(roomCode),
	})
	client.Room = ""
	h.scheduleEmptyRoomCleanup(roomCode)
}

func (h *Handler) publishAndBroadcast(roomCode, excludeID string, message map[string]interface{}) {
	h.broadcastLocal(roomCode, excludeID, message)
	raw, _ := json.Marshal(message)
	_ = h.redisClient.PublishMessage(&redis.Message{
		Type:     str(message["type"]),
		From:     excludeID,
		Room:     roomCode,
		ServerID: h.config.ServerID,
		Payload:  raw,
	})
}

func (h *Handler) broadcastLocal(roomCode, excludeID string, message map[string]interface{}) {
	room := h.getLocalRoom(roomCode)
	if room == nil {
		return
	}
	msgType := str(message["type"])
	for _, client := range room.GetAllClients() {
		if client.ID == excludeID {
			continue
		}
		if msgType == "send-message" && client.Role != RoleAdmin && client.Role != RolePerformer {
			continue
		}
		_ = client.Send(message)
	}
}

func (h *Handler) startRoomSubscription(roomID string) {
	h.subMu.Lock()
	if _, exists := h.subscribers[roomID]; exists {
		h.subMu.Unlock()
		return
	}
	stop := make(chan struct{})
	h.subscribers[roomID] = stop
	h.subMu.Unlock()

	go func() {
		defer func() {
			h.subMu.Lock()
			delete(h.subscribers, roomID)
			h.subMu.Unlock()
		}()
		_ = h.redisClient.Subscribe(roomID, func(msg *redis.Message) {
			if msg.ServerID == h.config.ServerID {
				return
			}
			h.handleRedisMessage(msg)
		})
	}()
}

func (h *Handler) handleRedisMessage(msg *redis.Message) {
	if msg.Type == "signal" {
		var payload map[string]interface{}
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			return
		}
		if client, ok := h.getLocalClient(msg.Room, msg.To); ok {
			_ = client.Send(payload)
		}
		return
	}

	var payload map[string]interface{}
	if len(msg.Payload) > 0 {
		_ = json.Unmarshal(msg.Payload, &payload)
	}
	if payload == nil {
		payload = map[string]interface{}{"type": msg.Type, "from": msg.From}
	}
	if msg.Type == "role-changed" {
		h.applyRoleChange(msg.Room, str(payload["userId"]), UserRole(str(payload["role"])))
	}
	h.broadcastLocal(msg.Room, "", payload)
	if msg.Type == "room-closed" {
		if room := h.getLocalRoom(msg.Room); room != nil {
			for _, c := range room.GetAllClients() {
				c.Room = ""
			}
		}
		h.stopTimer(msg.Room)
		h.removeLocalRoom(msg.Room)
	}
}

func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":    "healthy",
		"server_id": h.config.ServerID,
	})
}

func (h *Handler) applyIdentity(client *Client, msg map[string]interface{}) {
	// The id is only accepted before joining a room, so nobody can switch to
	// someone else's id mid-session.
	if id := str(msg["userId"]); client.Room == "" && len(id) >= 8 && len(id) <= 64 {
		client.ID = id
	}
	if name := clip(strings.TrimSpace(str(msg["username"])), 40); name != "" {
		client.Username = name
	} else if name := clip(strings.TrimSpace(str(msg["admin"])), 40); name != "" {
		client.Username = name
	}
	if client.Username == "" {
		client.Username = "Guest-" + client.ID[:4]
	}
	if email := clip(str(msg["email"]), 120); email != "" {
		client.Email = email
	}
	if pic := httpURL(str(msg["profilePicUrl"])); pic != "" {
		client.ProfilePic = pic
	} else if pic := httpURL(str(msg["profilePic"])); pic != "" {
		client.ProfilePic = pic
	}
	if raw, ok := msg["socialLinks"].(map[string]interface{}); ok {
		client.SocialLinks = map[string]string{
			"instagram": clip(strings.TrimSpace(str(raw["instagram"])), 100),
			"twitter":   clip(strings.TrimSpace(str(raw["twitter"])), 100),
			"tiktok":    clip(strings.TrimSpace(str(raw["tiktok"])), 100),
			"demo":      httpURL(strings.TrimSpace(str(raw["demo"]))),
		}
	}
}

func (h *Handler) saveUser(client *Client) {
	user := StoredUser{
		UserID:       client.ID,
		Username:     client.Username,
		Email:        client.Email,
		ProfilePic:   client.ProfilePic,
		Role:         string(client.Role),
		IsPerforming: client.IsPerforming,
		SocialLinks:  client.SocialLinks,
		HasMedia:     client.Role == RoleAdmin || client.Role == RolePerformer,
		ServerID:     h.config.ServerID,
		ConnID:       client.ConnID,
	}
	raw, _ := json.Marshal(user)
	_ = h.redisClient.HSet("room:"+client.Room+":users", client.ID, string(raw))
}

func (h *Handler) usersFromRedis(roomCode string) []map[string]interface{} {
	raw, _ := h.redisClient.HGetAll("room:" + roomCode + ":users")
	users := make([]map[string]interface{}, 0, len(raw))
	for _, value := range raw {
		var user StoredUser
		if err := json.Unmarshal([]byte(value), &user); err != nil {
			continue
		}
		users = append(users, user.Map())
	}
	return users
}

func (h *Handler) roomSnapshot(roomCode string) map[string]interface{} {
	meta, err := h.redisClient.HGetAll("room:" + roomCode)
	if err != nil || len(meta) == 0 {
		return nil
	}
	createdAt, _ := strconv.ParseInt(meta["createdAt"], 10, 64)
	duration, _ := strconv.Atoi(meta["performerDuration"])
	endsAt, _ := strconv.ParseInt(meta["endsAt"], 10, 64)
	total, _ := strconv.ParseFloat(meta["totalDonations"], 64)
	queue, _ := h.redisClient.LRange("room:"+roomCode+":queue", 0, -1)
	users := h.usersFromRedis(roomCode)
	scores := map[string]ScoreInfo{}
	for _, user := range users {
		id, _ := user["userId"].(string)
		if user["role"] == "performer" || user["isPerforming"] == true {
			scores[id] = h.scoreFor(roomCode, id)
		}
	}
	if current := meta["currentPerformer"]; current != "" {
		scores[current] = h.scoreFor(roomCode, current)
	}
	return map[string]interface{}{
		"roomCode":          meta["roomCode"],
		"roomName":          meta["roomName"],
		"roomCategory":      meta["roomCategory"],
		"createdAt":         createdAt,
		"performerDuration": duration,
		"currentPerformer":  meta["currentPerformer"],
		"endsAt":            endsAt,
		"queue":             queue,
		"users":             users,
		"scores":            scores,
		"totalDonations":    total,
		"adminId":           meta["adminId"],
	}
}

func (h *Handler) scoreFor(roomCode, performerID string) ScoreInfo {
	info := ScoreInfo{}
	votes, _ := h.redisClient.HGetAll("room:" + roomCode + ":votes:" + performerID)
	total := 0.0
	for _, value := range votes {
		n, err := strconv.ParseFloat(value, 64)
		if err != nil {
			continue
		}
		total += n
		info.ViewerCount++
	}
	if info.ViewerCount > 0 {
		info.ViewerAverage = math.Round((total/float64(info.ViewerCount))*10) / 10
	}
	if tips, err := h.redisClient.Get("room:" + roomCode + ":tips:" + performerID); err == nil && tips != "" {
		if n, err := strconv.ParseFloat(tips, 64); err == nil {
			info.Tips = n
		}
	}
	if admin, err := h.redisClient.Get("room:" + roomCode + ":admin-score:" + performerID); err == nil && admin != "" {
		if n, err := strconv.ParseFloat(admin, 64); err == nil {
			info.AdminScore = n
			info.HasAdminScore = true
		}
	}
	return info
}

func (h *Handler) setPerforming(roomCode, userID string, performing bool) {
	raw, err := h.redisClient.HGet("room:"+roomCode+":users", userID)
	if err != nil || raw == "" {
		return
	}
	var user StoredUser
	if err := json.Unmarshal([]byte(raw), &user); err != nil {
		return
	}
	user.IsPerforming = performing
	updated, _ := json.Marshal(user)
	_ = h.redisClient.HSet("room:"+roomCode+":users", userID, string(updated))
	if local, ok := h.getLocalClient(roomCode, userID); ok {
		local.IsPerforming = performing
	}
}

func (h *Handler) startTimer(roomCode, performerID string, duration time.Duration) {
	h.stopTimer(roomCode)
	stop := make(chan struct{})
	h.timerMu.Lock()
	h.timers[roomCode] = stop
	h.timerMu.Unlock()
	go func() {
		timer := time.NewTimer(duration)
		defer timer.Stop()
		select {
		case <-timer.C:
			h.finishPerformance(roomCode, performerID, true)
		case <-stop:
			return
		}
	}()
}

func (h *Handler) stopTimer(roomCode string) {
	h.timerMu.Lock()
	defer h.timerMu.Unlock()
	if stop, ok := h.timers[roomCode]; ok {
		select {
		case <-stop:
		default:
			close(stop)
		}
		delete(h.timers, roomCode)
	}
}

func (h *Handler) addLocalClient(roomCode string, client *Client) {
	h.roomsMu.Lock()
	room := h.rooms[roomCode]
	if room == nil {
		room = NewLocalRoom(roomCode)
		h.rooms[roomCode] = room
	}
	h.roomsMu.Unlock()
	room.AddClient(client)
}

func (h *Handler) removeLocalClient(roomCode, clientID string) {
	room := h.getLocalRoom(roomCode)
	if room == nil {
		return
	}
	room.RemoveClient(clientID)
}

func (h *Handler) getLocalRoom(roomCode string) *LocalRoom {
	h.roomsMu.RLock()
	defer h.roomsMu.RUnlock()
	return h.rooms[roomCode]
}

func (h *Handler) getLocalClient(roomCode, clientID string) (*Client, bool) {
	room := h.getLocalRoom(roomCode)
	if room == nil {
		return nil, false
	}
	return room.GetClient(clientID)
}

func (h *Handler) findLocalClient(roomCode, clientID string) (*Client, bool) {
	return h.getLocalClient(roomCode, clientID)
}

func (h *Handler) findLocalAdmin(roomCode string) *Client {
	room := h.getLocalRoom(roomCode)
	if room == nil {
		return nil
	}
	for _, client := range room.GetAllClients() {
		if client.Role == RoleAdmin {
			return client
		}
	}
	return nil
}

func (h *Handler) removeLocalRoom(roomCode string) {
	h.roomsMu.Lock()
	defer h.roomsMu.Unlock()
	delete(h.rooms, roomCode)
}

func (h *Handler) deleteRoomKeys(roomCode string) {
	keys := []string{
		"room:" + roomCode,
		"room:" + roomCode + ":users",
		"room:" + roomCode + ":queue",
		"room:" + roomCode + ":donations",
		"room:" + roomCode + ":donations-total",
	}
	if extra, err := h.redisClient.Keys("room:" + roomCode + ":*"); err == nil {
		keys = append(keys, extra...)
	}
	_ = h.redisClient.Del(keys...)
	_ = h.redisClient.HDel("rooms", roomCode)
}

func (h *Handler) generateRoomCode() string {
	const charset = "abcdefghjkmnpqrstuvwxyz23456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

func (h *Handler) generateRoomName(category string) string {
	names := map[string][]string{
		"dance":   {"Groove Central", "Dance Floor", "Rhythm Room"},
		"singing": {"Vocal Showcase", "Melody Hall", "Harmony Hub"},
		"music":   {"Sound Stage", "Music Lounge", "Beat Box"},
		"comedy":  {"Laugh Factory", "Comedy Club", "Joke Junction"},
		"art":     {"Art Gallery", "Creative Space", "Canvas Corner"},
		"variety": {"Open Mic Night", "Talent Showcase", "Main Stage"},
	}
	categoryNames, exists := names[strings.ToLower(category)]
	if !exists {
		categoryNames = names["variety"]
	}
	return categoryNames[rand.Intn(len(categoryNames))]
}

func str(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	default:
		return ""
	}
}

func intFrom(v interface{}, fallback int) int {
	switch t := v.(type) {
	case float64:
		return int(t)
	case int:
		return t
	case string:
		n, err := strconv.Atoi(t)
		if err == nil {
			return n
		}
	}
	return fallback
}

func floatFrom(v interface{}, fallback float64) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case int:
		return float64(t)
	case string:
		n, err := strconv.ParseFloat(t, 64)
		if err == nil {
			return n
		}
	}
	return fallback
}

// ---------------------------------------------------------------------------
// Room discovery, host promotion, identity checks, housekeeping
// ---------------------------------------------------------------------------

// handleListRooms returns the live rooms so the home page can search by name.
func (h *Handler) handleListRooms(client *Client) {
	codes, _ := h.redisClient.HGetAll("rooms")
	rooms := make([]map[string]interface{}, 0, len(codes))
	for code := range codes {
		meta, err := h.redisClient.HGetAll("room:" + code)
		if err != nil || len(meta) == 0 {
			_ = h.redisClient.HDel("rooms", code)
			continue
		}
		users := h.usersFromRedis(code)
		if len(users) == 0 {
			continue
		}
		performers, viewers := 0, 0
		for _, user := range users {
			switch user["role"] {
			case "performer":
				performers++
			case "viewer":
				viewers++
			}
		}
		live := ""
		if current := meta["currentPerformer"]; current != "" {
			if raw, err := h.redisClient.HGet("room:"+code+":users", current); err == nil {
				var stored StoredUser
				if json.Unmarshal([]byte(raw), &stored) == nil {
					live = stored.Username
				}
			}
		}
		queueLen, _ := h.redisClient.LLen("room:" + code + ":queue")
		createdAt, _ := strconv.ParseInt(meta["createdAt"], 10, 64)
		rooms = append(rooms, map[string]interface{}{
			"roomCode":     code,
			"roomName":     meta["roomName"],
			"roomCategory": meta["roomCategory"],
			"host":         meta["admin"],
			"performers":   performers,
			"viewers":      viewers,
			"queue":        queueLen,
			"livePerformer": live,
			"createdAt":    createdAt,
		})
	}
	sort.Slice(rooms, func(i, j int) bool {
		vi, _ := rooms[i]["viewers"].(int)
		vj, _ := rooms[j]["viewers"].(int)
		if vi != vj {
			return vi > vj
		}
		ci, _ := rooms[i]["createdAt"].(int64)
		cj, _ := rooms[j]["createdAt"].(int64)
		return ci > cj
	})
	if len(rooms) > 50 {
		rooms = rooms[:50]
	}
	_ = client.Send(map[string]interface{}{"type": "list-rooms", "rooms": rooms})
}

// handleMakeAdmin lets a host promote someone in the room to co-host.
func (h *Handler) handleMakeAdmin(client *Client, msg map[string]interface{}) {
	if client.Role != RoleAdmin || client.Room == "" {
		_ = client.Send(map[string]interface{}{"type": "make-admin", "error": "Only a host can promote someone."})
		return
	}
	roomCode := client.Room
	targetID := str(msg["userId"])
	raw, err := h.redisClient.HGet("room:"+roomCode+":users", targetID)
	if targetID == "" || err != nil || raw == "" {
		_ = client.Send(map[string]interface{}{"type": "make-admin", "error": "That person is no longer in the room."})
		return
	}
	var stored StoredUser
	if err := json.Unmarshal([]byte(raw), &stored); err != nil {
		return
	}
	stored.Role = string(RoleAdmin)
	stored.HasMedia = true
	updated, _ := json.Marshal(stored)
	_ = h.redisClient.HSet("room:"+roomCode+":users", targetID, string(updated))
	_ = h.redisClient.HSet("room:"+roomCode+":admins", targetID, "1")
	_ = h.redisClient.LRem("room:"+roomCode+":queue", 0, targetID)
	h.applyRoleChange(roomCode, targetID, RoleAdmin)

	h.publishAndBroadcast(roomCode, "", map[string]interface{}{
		"type":     "role-changed",
		"userId":   targetID,
		"username": stored.Username,
		"role":     string(RoleAdmin),
		"room":     h.roomSnapshot(roomCode),
	})
}

// applyRoleChange updates the in-memory role of a client connected to THIS
// server (other servers do the same when they receive the pub/sub event).
func (h *Handler) applyRoleChange(roomCode, userID string, role UserRole) {
	if userID == "" {
		return
	}
	if local, ok := h.getLocalClient(roomCode, userID); ok {
		local.Role = role
	}
}

func (h *Handler) isRoomAdmin(roomCode, userID string) bool {
	v, err := h.redisClient.HGet("room:"+roomCode+":admins", userID)
	return err == nil && v != ""
}

// checkSecret ties a user id to the random secret their browser generated the
// first time they used that id in this room, so ids (which are visible to
// everyone) cannot be used to impersonate somebody else or take over admin.
func (h *Handler) checkSecret(roomCode, userID, secret string) bool {
	if len(secret) < 16 || len(secret) > 128 {
		return false
	}
	sum := sha256.Sum256([]byte(secret))
	digest := hex.EncodeToString(sum[:])
	key := "room:" + roomCode + ":secrets"
	stored, err := h.redisClient.HGet(key, userID)
	if err != nil || stored == "" {
		_ = h.redisClient.HSet(key, userID, digest)
		return true
	}
	return subtle.ConstantTimeCompare([]byte(stored), []byte(digest)) == 1
}

func (h *Handler) chatHistory(roomCode string) []map[string]interface{} {
	raw, _ := h.redisClient.LRange("room:"+roomCode+":chat", -50, -1)
	out := make([]map[string]interface{}, 0, len(raw))
	for _, item := range raw {
		var m map[string]interface{}
		if json.Unmarshal([]byte(item), &m) == nil {
			out = append(out, m)
		}
	}
	return out
}

// chatHistoryFor only hands backstage chat to hosts and performers.
func (h *Handler) chatHistoryFor(client *Client, roomCode string) []map[string]interface{} {
	if client.Role != RoleAdmin && client.Role != RolePerformer {
		return []map[string]interface{}{}
	}
	return h.chatHistory(roomCode)
}

// scheduleEmptyRoomCleanup removes a room's data if nobody comes back.
func (h *Handler) scheduleEmptyRoomCleanup(roomCode string) {
	time.AfterFunc(10*time.Minute, func() {
		if len(h.usersFromRedis(roomCode)) > 0 {
			return
		}
		h.stopTimer(roomCode)
		h.removeLocalRoom(roomCode)
		h.deleteRoomKeys(roomCode)
	})
}

func clip(s string, limit int) string {
	r := []rune(s)
	if len(r) > limit {
		return string(r[:limit])
	}
	return s
}

// httpURL only lets http(s) links through (no javascript:, data:, etc.).
func httpURL(s string) string {
	s = strings.TrimSpace(s)
	lower := strings.ToLower(s)
	if (strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "http://")) && len(s) <= 300 {
		return s
	}
	return ""
}
