package passwordimpl_test

import (
	"fmt"
	"strings"
	"testing"

	"gopkg.in/ini.v1"

	"github.com/grafana/grafana/pkg/services/password"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/util"

	"github.com/grafana/grafana/pkg/services/password/passwordimpl"
	"github.com/grafana/grafana/pkg/setting"
)

func TestValidatePassword(t *testing.T) {
	z := util.Pointer(0)

	configurations := map[string]config{
		"noRequirements":   {minLen: z, maxRep: z, minComplexity: z},
		"default":          {},
		"length":           {minLen: util.Pointer(14), maxRep: z, minComplexity: z},
		"repetition":       {minLen: z, maxRep: util.Pointer(2), minComplexity: z},
		"complexity":       {minLen: z, maxRep: z, minComplexity: util.Pointer(3)},
		"highExpectations": {minLen: util.Pointer(14), maxRep: util.Pointer(2), minComplexity: util.Pointer(3)},
	}

	tests := []struct {
		password string
		pass     map[string]struct{}
	}{
		{"", map[string]struct{}{"noRequirements": {}, "repetition": {}}},
		{"abc", map[string]struct{}{"noRequirements": {}, "repetition": {}}},
		{"admin", map[string]struct{}{"noRequirements": {}, "default": {}, "repetition": {}}},
		{"aaaaaaaaaaaaaaaaaaaa", map[string]struct{}{
			"noRequirements": {},
			"default":        {},
			"length":         {},
		}},
		{"EiKzNeGyng3r79Ih/A/E16Bk", map[string]struct{}{
			"noRequirements":   {},
			"default":          {},
			"highExpectations": {},
			"length":           {},
			"repetition":       {},
			"complexity":       {},
		}},
		{"EiKzNeGyng3r79Ih/AAA/E16Bk", map[string]struct{}{
			"noRequirements": {},
			"default":        {},
			"length":         {},
			"complexity":     {},
		}},
		{"EiKzNeGyng3r79IhAE16Bk", map[string]struct{}{
			"noRequirements": {},
			"default":        {},
			"length":         {},
			"repetition":     {},
		}},
	}

	for _, tc := range tests {
		for key, val := range configurations {
			var pass bool
			if _, ok := tc.pass[key]; ok {
				pass = true
			}

			t.Run(fmt.Sprintf("%s (%s) = %v", tc.password, key, pass), func(t *testing.T) {
				cfg := setting.NewCfg()
				cfg.Raw = val.Ini(t)

				svc := passwordimpl.ProvideService(cfg)
				err := svc.ValidatePassword([]rune(tc.password))
				if pass {
					require.NoError(t, err)
				} else {
					require.ErrorIs(t, err, password.ErrPasswordRejected)
				}
			})
		}
	}
}

type config struct {
	minLen        *int
	maxRep        *int
	minComplexity *int
}

func (c config) Ini(t testing.TB) *ini.File {
	t.Helper()

	lines := []string{"[security.passwords]"}
	if c.minLen != nil {
		lines = append(lines, fmt.Sprintf("min_length = %d", *c.minLen))
	}
	if c.maxRep != nil {
		lines = append(lines, fmt.Sprintf("max_repetition = %d", *c.maxRep))
	}
	if c.minComplexity != nil {
		lines = append(lines, fmt.Sprintf("min_complexity = %d", *c.minComplexity))
	}
	raw := strings.Join(lines, "\n")
	file, err := ini.Load([]byte(raw))
	require.NoError(t, err)
	return file
}
