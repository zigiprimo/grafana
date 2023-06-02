package loki

import (
	"math"
	"time"
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

func calculateStep(interval time.Duration, timeRange time.Duration, resolution int64, queryStep *string) (time.Duration, error) {
	if queryStep == nil || *queryStep == "" {
		// If we don't have step from query we calculate it from interval, time range and resolution
		step := time.Duration(interval.Nanoseconds() * resolution)
		safeStep := timeRange / 11000
		chosenStep := durationMax(step, safeStep)
		return ceilMs(chosenStep), nil
	}

	// If we have step, we use it. In this case, if the step is incorrect, we return an error
	qs, err := time.ParseDuration(interpolateVariables(*queryStep, interval, timeRange))
	if err != nil {
		return qs, err
	}
	return time.Duration(qs.Nanoseconds() * resolution), nil

}
