package loki

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/grafana/grafana/pkg/tsdb/intervalv2"
)

// round the duration to the nearest millisecond larger-or-equal-to the duration
func ceilMs(duration time.Duration) time.Duration {
	floatMs := float64(duration.Nanoseconds()) / 1000.0 / 1000.0
	ceilMs := math.Ceil(floatMs)
	return time.Duration(ceilMs) * time.Millisecond
}

func durationMax(d1 time.Duration, d2 time.Duration) time.Duration {
	if d1.Nanoseconds() >= d2.Nanoseconds() {
		return d1
	} else {
		return d2
	}
}

func calculateStep(baseInterval time.Duration, timeRange time.Duration, resolution int64) time.Duration {
	step := time.Duration(baseInterval.Nanoseconds() * resolution)

	safeStep := timeRange / 11000

	chosenStep := durationMax(step, safeStep)

	return ceilMs(chosenStep)
}

type StepQuery struct {
	IntervalMS int64  `json:"intervalMs"`
	FromMs     int64  `json:"from"`
	ToMs       int64  `json:"to"`
	Resolution int64  `json:"resolution"`
	Step       string `json:"step"`
	RefId      string `json:"refId"`
}

type StepObj struct {
	StepMs int64  `json:"stepMs"`
	Step   string `json:"step"`
	RefId  string `json:"refId"`
}

type StepResponse struct {
	Data []StepObj `json:"data"`
}

func getStepResponse(body []byte) ([]byte, error) {
	var queries []StepQuery
	b := bytes.NewReader(body)
	err := json.NewDecoder(b).Decode(&queries)
	if err != nil {
		return nil, fmt.Errorf("failed to read data source resource body: %w", err)
	}

	res := StepResponse{Data: []StepObj{}}

	for _, query := range queries {
		step := calculateStep(time.Duration(query.IntervalMS)*time.Millisecond, time.Duration(query.ToMs-query.FromMs)*time.Millisecond, query.Resolution)
		res.Data = append(res.Data, StepObj{StepMs: step.Milliseconds(), Step: intervalv2.FormatDuration(step), RefId: query.RefId})
	}

	resBytes, err := json.Marshal(res)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal step data: %w", err)
	}
	return resBytes, nil
}
