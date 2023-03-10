package password

import (
	"errors"
	"unicode"

	"github.com/grafana/grafana/pkg/util/errutil"
)

var (
	ErrPasswordRejected = errors.New("password rejected")
	ErrMinLength        = errutil.NewBase(
		errutil.StatusBadRequest,
		"password.tooShort",
		errutil.WithPublicMessage("New password is too short"),
	)
	ErrRepetition = errutil.NewBase(errutil.StatusBadRequest, "password.characterRepetition").
			MustTemplate(
			"character repeated more than {{ .Public.maxRepetition }} times: {{ .Error }}",
			errutil.WithPublic("Password rejected, cannot repeat a character more than {{.Public.maxRepetition}} times"),
		)
	ErrCharacterClasses = errutil.NewBase(
		errutil.StatusBadRequest,
		"password.charTypes",
		errutil.WithPublicMessage("Password complexity is insufficient"),
	)
)

type Service interface {
	ValidatePassword(password []rune) error
}

type Password struct {
	Password   []rune
	Validators []ComplexityValidator
}

func (p Password) Validate() error {
	var err error
	for _, validator := range p.Validators {
		innerErr := validator(p.Password)
		if innerErr != nil {
			err = errors.Join(err, innerErr)
		}
	}
	return err
}

type ComplexityValidator func(password []rune) error

// MinLengthCheck validates that a password contains at least minLen
// characters.
func MinLengthCheck(minLen int) ComplexityValidator {
	return func(password []rune) error {
		if len(password) < minLen {
			return ErrMinLength.Errorf("provided password is too short: %w", ErrPasswordRejected)
		}
		return nil
	}
}

// Repetition ensures that a single character cannot exist more than
// maxRepetition times in sequence in a password.
func Repetition(maxRepetition int) ComplexityValidator {
	return func(password []rune) error {
		rep := 0
		var last rune
		for _, c := range password {
			if c == last {
				rep++
			} else {
				rep = 1
			}
			last = c

			if rep > maxRepetition {
				return ErrRepetition.Build(errutil.TemplateData{
					Public: map[string]any{
						"maxRepetition": maxRepetition,
					},
					Error: ErrPasswordRejected,
				})
			}
		}
		return nil
	}
}

// CharacterComplexity validates that the provided password contains
// unicode characters from at least minClasses character types.
//
// The type categories are derived from unicode's L, M, N, P, and S
// categories, with a sixth category for Z and C and any other
// potential value.
// The description of the character categories can be found on
// https://unicode.org/reports/tr44/#General_Category_Values
//
// The amount of categories and their definitions is not guaranteed to
// be static between releases.
func CharacterComplexity(minClasses int) ComplexityValidator {
	checkedClasses := map[byte]*unicode.RangeTable{
		'L': unicode.L, // letters
		'M': unicode.M, // marks
		'N': unicode.N, // numbers
		'P': unicode.P, // punctuation
		'S': unicode.S, // symbols
	}

	return func(password []rune) error {
		classes := map[byte]struct{}{}
		for _, r := range password {
			class := byte('?') // control characters, separators, and not assigned
			for ident, ranges := range checkedClasses {
				if unicode.Is(ranges, r) {
					class = ident
				}
			}
			classes[class] = struct{}{}
		}

		if len(classes) < minClasses {
			return ErrCharacterClasses.Errorf("password with insufficient character type composition chosen: %w", ErrPasswordRejected)
		}
		return nil
	}
}
