package signaling

import "sync"

// LocalRoom tracks only the clients connected to this server process.
type LocalRoom struct {
	ID      string
	Clients map[string]*Client
	mu      sync.RWMutex
}

func NewLocalRoom(id string) *LocalRoom {
	return &LocalRoom{
		ID:      id,
		Clients: make(map[string]*Client),
	}
}

func (r *LocalRoom) AddClient(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Clients[client.ID] = client
}

func (r *LocalRoom) RemoveClient(clientID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.Clients, clientID)
}

func (r *LocalRoom) GetClient(clientID string) (*Client, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	client, exists := r.Clients[clientID]
	return client, exists
}

func (r *LocalRoom) GetAllClients() []*Client {
	r.mu.RLock()
	defer r.mu.RUnlock()
	clients := make([]*Client, 0, len(r.Clients))
	for _, client := range clientsCopy(r.Clients) {
		clients = append(clients, client)
	}
	return clients
}

func clientsCopy(in map[string]*Client) map[string]*Client {
	out := make(map[string]*Client, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func (r *LocalRoom) GetClientCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Clients)
}

func UniqueQueue(queue []string, userID string) []string {
	for _, id := range queue {
		if id == userID {
			return queue
		}
	}
	return append(queue, userID)
}

func RemoveFromSlice(queue []string, userID string) []string {
	out := make([]string, 0, len(queue))
	for _, id := range queue {
		if id != userID {
			out = append(out, id)
		}
	}
	return out
}
