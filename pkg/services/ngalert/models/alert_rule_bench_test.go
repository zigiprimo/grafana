package models

import (
	"fmt"
	"io"
	"math/rand"
	"testing"
)

func BenchmarkRuleWithFolderFingerprint(b *testing.B) {
	rules := GenerateAlertRules(b.N, AlertRuleGen(func(rule *AlertRule) {
		rule.Data = make([]AlertQuery, 0, 5)
		for i := 0; i < rand.Intn(5)+1; i++ {
			rule.Data = append(rule.Data, GenerateAlertQuery())
		}
	}))
	b.ReportAllocs()
	b.ResetTimer()
	var f Fingerprint
	for i := 0; i < b.N; i++ {
		f = CalculateAlertRuleFingerprint(rules[i])
	}
	b.StopTimer()
	_, _ = fmt.Fprint(io.Discard, f)
}
