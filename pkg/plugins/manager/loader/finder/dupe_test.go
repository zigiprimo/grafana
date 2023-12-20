package finder

import (
	"reflect"
	"testing"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/log"
	"github.com/grafana/grafana/pkg/plugins/manager/fakes"
)

func Test_dupeSelector_groupByIdAndVersion(t *testing.T) {
	tcs := []struct {
		name     string
		plugins  []plugins.FoundPlugin
		expected map[string][]plugins.FoundPlugin
	}{
		{
			name: "Invalid plugin versions will be discarded as long as valid semver versions exist",

			plugins: []plugins.FoundPlugin{
				plugin("foo-datasource", "1.0.0"),
				plugin("foo-datasource", "%VERSION%"),
				plugin("foo-datasource", ""),
				plugin("foo-datasource", "2.0.0"),
			},
			expected: map[string][]plugins.FoundPlugin{
				"foo-datasource@1.0.0": {
					plugin("foo-datasource", "1.0.0"),
				},
				"foo-datasource@2.0.0": {
					plugin("foo-datasource", "2.0.0"),
				},
			},
		},
		{
			name: "Invalid plugin versions will be kept as long as no valid semver versions exist",
			plugins: []plugins.FoundPlugin{
				plugin("foo-datasource", "%VERSION%"),
				plugin("foo-datasource", ""),
			},
			expected: map[string][]plugins.FoundPlugin{
				"foo-datasource@unknown": {
					plugin("foo-datasource", "%VERSION%"),
					plugin("foo-datasource", ""),
				},
			},
		},
	}

	for _, tc := range tcs {
		t.Run(tc.name, func(t *testing.T) {
			ds := &dupeSelector{
				features: &fakes.FakeFeatureToggles{},
				log:      log.NewTestLogger(),
			}
			if got := ds.groupByIdAndVersion(tc.plugins); !reflect.DeepEqual(got, tc.expected) {
				t.Errorf("groupByIdAndVersion() = %v, want %v", got, tc.expected)
			}
		})
	}
}

func plugin(id, version string) plugins.FoundPlugin {
	return plugins.FoundPlugin{
		JSONData: plugins.JSONData{
			ID: id,
			Info: plugins.Info{
				Version: version,
			},
		},
	}
}
