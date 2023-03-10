import { EchoBackend, EchoEventType, MetricEchoEvent, MetricEchoEventPayload } from '@grafana/runtime';

console.log('debug', { MetricEchoEvent, MetricEchoEventPayload });

export class MetricsEchoBackend implements EchoBackend<MetricEchoEvent, MetricEchoEventPayload> {
  supportedEvents = [EchoEventType.Metrics];
  trackedUserId: number | null = null;

  constructor(public options: MetricEchoEventPayload) {}

  addEvent = (event: MetricEchoEvent) => {
    console.log({ event });
  };

  // Not using Echo buffering, addEvent above sends events to GA as soon as they appear
  flush = () => {};
}
