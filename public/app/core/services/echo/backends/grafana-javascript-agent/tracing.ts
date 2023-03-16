import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';

import { faro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation, FaroSessionSpanProcessor } from '@grafana/faro-web-tracing';
import 'zone.js/dist/zone-patch-rxjs';

// fugly workaround for https://github.com/open-telemetry/opentelemetry-js/pull/3670
let wrapped = false;
const superEnable = FetchInstrumentation.prototype.enable;

FetchInstrumentation.prototype.enable = function () {
  superEnable.call(this);
  if (!wrapped) {
    const superFetch = window.fetch;
    window.fetch = function (...args: Parameters<typeof fetch>) {
      const url = new URL(args[0] instanceof Request ? args[0].url : String(args[0]), document.baseURI).href;
      const options = args[0] instanceof Request ? args[0] : args[1] || {};
      return superFetch.apply(this, options instanceof Request ? [options] : [url, options]);
    };
  }
};

interface Options {
  otlpEndpoint: string;
}

export function initTracingInstrumentation(options: Options) {
  const ignoreUrls = [new RegExp('/v1/traces'), new RegExp('/log-grafana-javascript-agent')];

  const instrumentations = [new DocumentLoadInstrumentation(), new FetchInstrumentation({ ignoreUrls })];

  return new TracingInstrumentation({
    instrumentations: instrumentations,
    spanProcessor: new FaroSessionSpanProcessor(
      new BatchSpanProcessor(new OTLPTraceExporter({ url: options.otlpEndpoint })),
      faro.metas
    ),
  });
}
