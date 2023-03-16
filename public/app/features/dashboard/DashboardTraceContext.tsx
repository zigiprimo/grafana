import * as otel from '@opentelemetry/api';
import React from 'react';

const PANEL_RENDER_TIMEOUT_MS = 1000;

export class DashboardTracerImpl {
  private currentSpan?: otel.Span;
  private parentContext?: otel.Context;
  private currentContext?: otel.Context;
  private stopTimeout?: NodeJS.Timeout;
  private started = false;

  start() {
    if (!this.started) {
      console.log('start dashboard trace context');
      this.parentContext = otel.context.active();
      this.currentSpan = otel.trace.getTracer('grafana').startSpan('dashboard render', {}, this.parentContext);
      this.currentContext = otel.trace.setSpan(this.parentContext, this.currentSpan);
      this.resetStopTimeout();
      this.started = true;
    }
  }

  getCurrentContext() {
    if (this.currentContext) {
      this.resetStopTimeout();

      return this.currentContext;
    }
    return undefined;
  }

  stop() {
    if (this.currentSpan) {
      console.log('stop dashboard trace context');
      this.currentSpan.end();
      this.currentSpan = this.parentContext = this.currentContext = undefined;
    }
  }

  private resetStopTimeout() {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
    }

    this.stopTimeout = setTimeout(() => {
      this.stop();
    }, PANEL_RENDER_TIMEOUT_MS);
  }
}

export const DashboardTraceContext = React.createContext<DashboardTracerImpl>(new DashboardTracerImpl());

export function DashboardTracer({
  children,
  dashboardTracer,
}: {
  children: React.ReactNode;
  dashboardTracer: DashboardTracerImpl;
}) {
  return <DashboardTraceContext.Provider value={dashboardTracer}>{children}</DashboardTraceContext.Provider>;
}
