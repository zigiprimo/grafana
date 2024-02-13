package schedule

import (
	context "context"
	"sync"
	"testing"
	"time"

	"github.com/grafana/grafana/pkg/infra/db"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/services/dashboards"
	"github.com/grafana/grafana/pkg/services/ngalert/metrics"
	ngmodels "github.com/grafana/grafana/pkg/services/ngalert/models"
	"github.com/grafana/grafana/pkg/services/ngalert/store"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/tests/testsuite"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	testsuite.Run(m)
}

func BenchmarkUpdateSchedulableAlertRules(b *testing.B) {
	sqlStore := db.InitTestDB(b)
	s := &store.DBstore{
		Cfg: setting.UnifiedAlertingSettings{
			BaseInterval:                  10 * time.Second,
			DefaultRuleEvaluationInterval: time.Minute,
		},
		SQLStore:         sqlStore,
		Logger:           log.New("alertmanager-test"),
		DashboardService: dashboards.NewFakeDashboardService(b),
	}

	const ruleCount = 1000
	rules := make([]ngmodels.AlertRule, ruleCount)
	uids := sync.Map{}
	generate := ngmodels.AlertRuleGen(ngmodels.WithUniqueID(), ngmodels.WithUniqueUID(&uids), ngmodels.WithInterval(10*time.Second))
	for i := 0; i < ruleCount; i++ {
		rule := *generate()
		rule.ID = 0
		rules[i] = rule
	}

	_, err := s.InsertAlertRules(context.Background(), rules)
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()

		r := prometheus.NewRegistry()
		metrics := metrics.NewSchedulerMetrics(r)
		sch := schedule{
			schedulableAlertRules: alertRulesRegistry{rules: make(map[ngmodels.AlertRuleKey]*ngmodels.AlertRule)},
			disableGrafanaFolder:  true, // TODO
			metrics:               metrics,
			ruleStore:             s,
			log:                   log.NewNopLogger(),
		}

		// Once to load.
		_, err = sch.updateSchedulableAlertRules(context.Background())
		require.NoError(b, err)

		b.StartTimer()

		_, err = sch.updateSchedulableAlertRules(context.Background())
		require.NoError(b, err)

	}
}
