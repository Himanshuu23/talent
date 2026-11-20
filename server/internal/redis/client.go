package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type Client struct {
	rdb *redis.Client
	ctx context.Context
}

type Message struct {
	Type      string          `json:"type"`
	From      string          `json:"from"`
	To        string          `json:"to"`
	Room      string          `json:"room"`
	ServerID  string          `json:"server_id"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp int64           `json:"timestamp"`
}

func NewClient(addr string) (*Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  0, // allow blocking pub/sub
		WriteTimeout: 5 * time.Second,
	})

	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("Connected to Redis")
	return &Client{rdb: rdb, ctx: ctx}, nil
}

func (c *Client) PublishMessage(msg *Message) error {
	msg.Timestamp = time.Now().Unix()
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	channel := fmt.Sprintf("room:%s", msg.Room)
	return c.rdb.Publish(c.ctx, channel, data).Err()
}

func (c *Client) Subscribe(room string, handler func(*Message)) error {
	channel := fmt.Sprintf("room:%s", room)
	pubsub := c.rdb.Subscribe(c.ctx, channel)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		var message Message
		if err := json.Unmarshal([]byte(msg.Payload), &message); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}
		handler(&message)
	}
	return nil
}

func (c *Client) Set(key string, value interface{}, expiration time.Duration) error {
	return c.rdb.Set(c.ctx, key, value, expiration).Err()
}

func (c *Client) Get(key string) (string, error) {
	return c.rdb.Get(c.ctx, key).Result()
}

func (c *Client) Exists(key string) (bool, error) {
	count, err := c.rdb.Exists(c.ctx, key).Result()
	return count > 0, err
}

func (c *Client) HSet(key string, values ...interface{}) error {
	if len(values) == 0 {
		return nil
	}
	return c.rdb.HSet(c.ctx, key, values...).Err()
}

func (c *Client) HGet(key, field string) (string, error) {
	return c.rdb.HGet(c.ctx, key, field).Result()
}

func (c *Client) HGetAll(key string) (map[string]string, error) {
	return c.rdb.HGetAll(c.ctx, key).Result()
}

func (c *Client) HDel(key string, fields ...string) error {
	return c.rdb.HDel(c.ctx, key, fields...).Err()
}

func (c *Client) Del(keys ...string) error {
	return c.rdb.Del(c.ctx, keys...).Err()
}

func (c *Client) LPush(key string, values ...interface{}) error {
	return c.rdb.LPush(c.ctx, key, values...).Err()
}

func (c *Client) RPush(key string, values ...interface{}) error {
	return c.rdb.RPush(c.ctx, key, values...).Err()
}

func (c *Client) LPop(key string) (string, error) {
	return c.rdb.LPop(c.ctx, key).Result()
}

func (c *Client) LRange(key string, start, stop int64) ([]string, error) {
	return c.rdb.LRange(c.ctx, key, start, stop).Result()
}

func (c *Client) LLen(key string) (int64, error) {
	return c.rdb.LLen(c.ctx, key).Result()
}

func (c *Client) LTrim(key string, start, stop int64) error {
	return c.rdb.LTrim(c.ctx, key, start, stop).Err()
}

func (c *Client) LRem(key string, count int64, value interface{}) error {
	return c.rdb.LRem(c.ctx, key, count, value).Err()
}

func (c *Client) Incr(key string) (int64, error) {
	return c.rdb.Incr(c.ctx, key).Result()
}

func (c *Client) IncrByFloat(key string, value float64) (float64, error) {
	return c.rdb.IncrByFloat(c.ctx, key, value).Result()
}

func (c *Client) ZAdd(key string, score float64, member interface{}) error {
	return c.rdb.ZAdd(c.ctx, key, redis.Z{Score: score, Member: member}).Err()
}

func (c *Client) ZRange(key string, start, stop int64) ([]string, error) {
	return c.rdb.ZRange(c.ctx, key, start, stop).Result()
}

func (c *Client) Keys(pattern string) ([]string, error) {
	return c.rdb.Keys(c.ctx, pattern).Result()
}

func (c *Client) Close() error {
	return c.rdb.Close()
}
