import { trace, context } from '@opentelemetry/api';
import { cloneDeep } from 'lodash';
import { from, merge, Observable, of } from 'rxjs';
import { catchError, filter, finalize, map, mergeAll, mergeMap, reduce, takeUntil, tap } from 'rxjs/operators';

import { AnnotationQuery, DataSourceApi, rangeUtil } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { getConfig } from 'app/core/config';

import { AnnotationQueryFinished, AnnotationQueryStarted } from '../../../../types/events';
import { PUBLIC_DATASOURCE, PublicDashboardDataSource } from '../../../dashboard/services/PublicDashboardDataSource';

import { AnnotationsQueryRunner } from './AnnotationsQueryRunner';
import { getDashboardQueryRunner } from './DashboardQueryRunner';
import { LegacyAnnotationQueryRunner } from './LegacyAnnotationQueryRunner';
import {
  AnnotationQueryRunner,
  DashboardQueryRunnerOptions,
  DashboardQueryRunnerWorker,
  DashboardQueryRunnerWorkerResult,
} from './types';
import { emptyResult, handleDatasourceSrvError, translateQueryResult } from './utils';

export class AnnotationsWorker implements DashboardQueryRunnerWorker {
  constructor(
    private readonly runners: AnnotationQueryRunner[] = [
      new LegacyAnnotationQueryRunner(),
      new AnnotationsQueryRunner(),
    ]
  ) {}

  canWork({ dashboard }: DashboardQueryRunnerOptions): boolean {
    const annotations = dashboard.annotations.list.find(AnnotationsWorker.getAnnotationsToProcessFilter);

    return Boolean(annotations);
  }

  work(options: DashboardQueryRunnerOptions): Observable<DashboardQueryRunnerWorkerResult> {
    return trace.getTracer('grafana').startActiveSpan(
      'AnnotationsWorker.work',
      {
        attributes: {
          'dashboard.id': options.dashboard.id,
          'dashboard.title': options.dashboard.title,
          range: rangeUtil.describeTimeRange(options.range),
        },
      },
      (span) => {
        const tc = context.active();

        if (!this.canWork(options)) {
          span.end();
          return emptyResult();
        }

        const { dashboard, range } = options;
        let annotations = dashboard.annotations.list.filter(AnnotationsWorker.getAnnotationsToProcessFilter);
        // We only want to create a single PublicDashboardDatasource. This will get all annotations in one request.
        if (dashboard.meta.publicDashboardAccessToken && annotations.length > 0) {
          annotations = [annotations[0]];
        }
        const observables = annotations.map((annotation) => {
          let datasourceObservable;

          if (getConfig().isPublicDashboardView) {
            const pubdashDatasource = new PublicDashboardDataSource(PUBLIC_DATASOURCE);
            datasourceObservable = of(pubdashDatasource).pipe(catchError(handleDatasourceSrvError));
          } else {
            datasourceObservable = from(getDataSourceSrv().get(annotation.datasource)).pipe(
              catchError(handleDatasourceSrvError) // because of the reduce all observables need to be completed, so an erroneous observable wont do
            );
          }

          return datasourceObservable.pipe(
            mergeMap((datasource?: DataSourceApi) => {
              return context.with(tc, () => {
                const runner = this.runners.find((r) => r.canRun(datasource));
                if (!runner) {
                  return of([]);
                }

                dashboard.events.publish(new AnnotationQueryStarted(annotation));

                return runner.run({ annotation, datasource, dashboard, range }).pipe(
                  takeUntil(
                    getDashboardQueryRunner()
                      .cancellations()
                      .pipe(filter((a) => a === annotation))
                  ),
                  map((results) => {
                    // store response in annotation object if this is a snapshot call
                    if (dashboard.snapshot) {
                      annotation.snapshotData = cloneDeep(results);
                    }
                    // translate result
                    if (dashboard.meta.publicDashboardAccessToken) {
                      return results;
                    } else {
                      return translateQueryResult(annotation, results);
                    }
                  }),
                  finalize(() => {
                    dashboard.events.publish(new AnnotationQueryFinished(annotation));
                  })
                );
              });
            })
          );
        });

        return merge(observables).pipe(
          mergeAll(),
          reduce((acc, value) => {
            // should we use scan or reduce here
            // reduce will only emit when all observables are completed
            // scan will emit when any observable is completed
            // choosing reduce to minimize re-renders
            return acc.concat(value);
          }),
          map((annotations) => {
            return { annotations, alertStates: [] };
          }),
          tap(() => span.end())
        );
      }
    );
  }

  private static getAnnotationsToProcessFilter(annotation: AnnotationQuery): boolean {
    return annotation.enable && !Boolean(annotation.snapshotData);
  }
}
