import { BaseInstrumentation } from '@grafana/faro-core';
/**
 * Instrumentation for Performance Timeline API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTimeline
 *
 * !!! This instrumentation is in experimental state and it's not meant to be used in production yet. !!!
 * !!! If you want to use it, do it at your own risk. !!!
 */
export declare class SessionReplayInstrumentation extends BaseInstrumentation {
    readonly name = "@grafana/faro-web-sdk:session-replay";
    readonly version = "1.2.8";
    private stopFn;
    initialize(): void;
    destroy(): void;
}
