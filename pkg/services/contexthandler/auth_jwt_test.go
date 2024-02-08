package contexthandler

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestExtractGroups(t *testing.T) {
	tc := []struct {
		name     string
		claims   map[string]any
		jmespath string
		groups   []string
		wantErr  bool
	}{
		{
			name:     "extracts groups from the JWT token",
			claims:   map[string]interface{}{"groups": []any{"first", "second"}},
			jmespath: "groups",
			groups:   []string{"first", "second"},
		},
		{
			name:     "return empty when groups attribute path is not set",
			claims:   map[string]interface{}{"groups": []any{"first", "second"}},
			jmespath: "",
			groups:   []string{},
		},
		{
			name:     "returns empty groups if the JWT token does not contain the groups claim",
			claims:   map[string]any{},
			jmespath: "groups",
			groups:   []string{},
		},
		{
			name:     "returns error if the JMESPath is invalid",
			claims:   map[string]any{},
			jmespath: "contains(group",
			groups:   nil,
			wantErr:  true,
		},
	}

	for _, tt := range tc {
		t.Run(tt.name, func(t *testing.T) {
			groups, err := extractGroups(tt.jmespath, tt.claims)

			if tt.wantErr {
				require.Error(t, err)
				return
			}

			require.Equal(t, tt.groups, groups)
		})
	}
}
