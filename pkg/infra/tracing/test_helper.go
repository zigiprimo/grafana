package tracing

import (
	"go.opentelemetry.io/otel"
)

func InitializeTracerForTest() Tracer {
	ots := &OpenTelemetry{propagation: "jaeger,w3c"}
	tp, _ := ots.initNoopTracerProvider()
	otel.SetTracerProvider(tp)

	_ = ots.initOpenTelemetryTracer()
	return ots
}
