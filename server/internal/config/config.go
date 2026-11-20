package config

import "os"

type Config struct {
	ServerID string
	RedisURL string
	Port     string
}

func Load() *Config {
	return &Config{
		ServerID: getEnv("SERVER_ID", "server-1"),
		RedisURL: getEnv("REDIS_URL", "localhost:6379"),
		Port:     getEnv("PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
