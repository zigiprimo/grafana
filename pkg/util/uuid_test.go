package util

import (
	"sync"
	"testing"
)

// Run with: go test -race -run ^TestThreadSafeUUID$ github.com/grafana/grafana/pkg/util -count=1
func TestThreadSafeUUID(t *testing.T) {
	// This test was used to showcase the bug, unfortunately there is
	// no way to enable the -race flag programmatically.
	//t.Skip()
	// Use 1000 go routines to create 100 UIDs each at roughly the same time.
	var wg sync.WaitGroup
	for i := 0; i < 1000; i++ {
		go func() {
			for ii := 0; ii < 100; ii++ {
				_, _ = NewRandomUUID()
			}
			wg.Done()
		}()
		wg.Add(1)
	}
	wg.Wait()
}

func BenchmarkUUID(b *testing.B) {
	for n := 0; n < b.N; n++ {
		_, _ = NewRandomUUID()
	}
}
