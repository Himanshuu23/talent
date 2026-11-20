package main

import (
	"log"
	"math/rand"
	"net/http"
	"time"

	"server/internal/config"
	"server/internal/redis"
	"server/internal/signaling"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	cfg := config.Load()

	redisClient, err := redis.NewClient(cfg.RedisURL)
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	defer redisClient.Close()

	handler := signaling.NewHandler(cfg, redisClient)

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler.HandleWebSocket)
	mux.HandleFunc("/health", handler.HandleHealth)

	log.Printf("Server %s starting on port %s", cfg.ServerID, cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatal("ListenAndServe error:", err)
	}
}
