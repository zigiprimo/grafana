package password_test

import (
	"sort"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/grafana/grafana/pkg/services/password"
)

func FuzzLength(f *testing.F) {
	f.Fuzz(func(t *testing.T, min uint8, pw string) {
		checker := password.MinLengthCheck(int(min))
		err := checker([]rune(pw))
		if len([]rune(pw)) < int(min) {
			assert.ErrorIs(t, err, password.ErrMinLength)
		} else {
			assert.NoError(t, err)
		}
	})
}

func FuzzRepetition(f *testing.F) {
	f.Fuzz(func(t *testing.T, max uint8, pw string) {
		runes := []rune(pw)
		// all recurrences of same char will be subsequent after a sort
		sort.Slice(runes, func(i, j int) bool {
			return runes[i] < runes[j]
		})
		err := password.Repetition(int(max))(runes)
		if len(runes) < int(max) {
			assert.NoError(t, err)
		}

		counts := map[rune]int{}
		for _, r := range runes {
			if _, ok := counts[r]; !ok {
				counts[r] = 0
			}
			counts[r]++
		}

		var n int
		for _, count := range counts {
			if count > n {
				n = count
			}
		}

		if n <= int(max) {
			assert.NoError(t, err)
		} else {
			assert.ErrorIs(t, err, password.ErrRepetition)
		}
	})
}

func FuzzTypeComplexity_moreComplexityThanPossible(f *testing.F) {
	checker := password.CharacterComplexity(7)

	f.Fuzz(func(t *testing.T, pw string) {
		err := checker([]rune(pw))
		assert.ErrorIs(t, err, password.ErrCharacterClasses)
	})
}
