package signaling

import "testing"

func TestUniqueQueue(t *testing.T) {
	q := UniqueQueue(nil, "a")
	q = UniqueQueue(q, "b")
	q = UniqueQueue(q, "a")
	if len(q) != 2 {
		t.Fatalf("expected 2, got %d", len(q))
	}
}

func TestRemoveFromSlice(t *testing.T) {
	q := []string{"a", "b", "c"}
	q = RemoveFromSlice(q, "b")
	if len(q) != 2 || q[0] != "a" || q[1] != "c" {
		t.Fatalf("unexpected queue: %v", q)
	}
}
