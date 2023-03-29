import { QueryRunnerState, SceneQueryRunner } from '@grafana/scenes';
import { TestData } from 'app/plugins/datasource/testdata/dataquery.gen';

export function getQueryRunnerWithRandomWalkQuery(
  overrides?: Partial<TestData>,
  queryRunnerOverrides?: Partial<QueryRunnerState>
) {
  return new SceneQueryRunner({
    queries: [
      {
        refId: 'A',
        datasource: {
          uid: 'gdev-testdata',
          type: 'testdata',
        },
        scenarioId: 'random_walk',
        ...overrides,
      },
    ],
    ...queryRunnerOverrides,
  });
}

export function getQueryRunnerFor3SeriesWithLabels() {
  return new SceneQueryRunner({
    datasource: {
      uid: 'gdev-testdata',
      type: 'testdata',
    },
    queries: [
      {
        datasource: {
          type: 'testdata',
          uid: 'PD8C576611E62080A',
        },
        labels: 'cluster=eu',
        refId: 'A',
        scenarioId: 'random_walk',
        seriesCount: 1,
      },
      {
        datasource: {
          type: 'testdata',
          uid: 'PD8C576611E62080A',
        },
        hide: false,
        labels: 'cluster=us',
        refId: 'B',
        scenarioId: 'random_walk',
        seriesCount: 1,
      },
      {
        datasource: {
          type: 'testdata',
          uid: 'PD8C576611E62080A',
        },
        hide: false,
        labels: 'cluster=asia',
        refId: 'C',
        scenarioId: 'random_walk',
        seriesCount: 1,
      },
    ],
  });
}
