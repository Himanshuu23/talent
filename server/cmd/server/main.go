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

	var redisClient *redis.Client
	var err error
	for i := 1; i <= 10; i++ {
		redisClient, err = redis.NewClient(cfg.RedisURL)
		if err == nil {
			break
		}
		log.Printf("Redis not ready (attempt %d/10): %v", i, err)
		time.Sleep(3 * time.Second)
	}
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
