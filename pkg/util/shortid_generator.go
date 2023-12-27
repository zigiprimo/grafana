package util

import (
	"errors"
	"fmt"
	"regexp"
	"sync"

	"github.com/teris-io/shortid"
)

const MaxUIDLength = 40

var (
	ErrUIDTooLong       = fmt.Errorf("UID is longer than %d symbols", MaxUIDLength)
	ErrUIDFormatInvalid = errors.New("invalid format of UID. Only letters, numbers, '-' and '_' are allowed")
	ErrUIDEmpty         = fmt.Errorf("UID is empty")
)

// Legacy UID pattern
var validUIDPattern = regexp.MustCompile(`^[a-zA-Z0-9\-\_]*$`).MatchString

// IsValidShortUID checks if short unique identifier contains valid characters
// NOTE: future Grafana UIDs will need conform to https://github.com/kubernetes/apimachinery/blob/master/pkg/util/validation/validation.go#L43
func IsValidShortUID(uid string) bool {
	return validUIDPattern(uid)
}

// IsShortUIDTooLong checks if short unique identifier is too long
func IsShortUIDTooLong(uid string) bool {
	return len(uid) > MaxUIDLength
}

// GenerateShortUID will generate a UID that can also be used as k8s name
// it is guaranteed to have a character as the first and last letter
func GenerateShortUID() string {
	orig, err := shortid.Generate()
	if err != nil {
		orig, _ = GetRandomString(11)
	}

	uid := []rune{next()} // start with an alpha
	for _, v := range orig {
		if v == '_' || v == '-' {
			uid = append(uid, next())
			uid = append(uid, next())
		} else {
			uid = append(uid, v)
		}
	}
	uid = append(uid, next()) // end with an alpha
	return string(uid)
}

var alphaRunes = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
var counter = 0
var counter_mu = sync.Mutex{}

func next() rune {
	counter_mu.Lock()
	defer counter_mu.Unlock()
	counter = (counter + 1) % len(alphaRunes)
	return alphaRunes[counter]
}

// ValidateUID checks the format and length of the string and returns error if it does not pass the condition
func ValidateUID(uid string) error {
	if len(uid) == 0 {
		return ErrUIDEmpty
	}
	if IsShortUIDTooLong(uid) {
		return ErrUIDTooLong
	}
	if !IsValidShortUID(uid) {
		return ErrUIDFormatInvalid
	}
	return nil
}
