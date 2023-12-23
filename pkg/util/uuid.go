package util

import (
	"sync"

	"github.com/google/uuid"
)

// We want to protect our number generator as they are not thread safe. Not using
// the mutex could result in panics in certain cases where UIDs would be generated
// at the same time.
var mtx sync.Mutex

// Get a thread safe UUID
func NewRandomUUID() (uuid.UUID, error) {
	mtx.Lock()
	defer mtx.Unlock()

	return uuid.NewRandom()
}
