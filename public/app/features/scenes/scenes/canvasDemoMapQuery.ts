import { QueryRunnerState, SceneQueryRunner } from '@grafana/scenes';
import { TestData } from 'app/plugins/datasource/testdata/dataquery.gen';

export function getCanvasDemoGeoQuery(overrides?: Partial<TestData>, queryRunnerOverrides?: Partial<QueryRunnerState>) {
  return new SceneQueryRunner({
    queries: [
      {
        csvContent: 'lat, lon\n39.54207208912727, -119.43894350730443',
        datasource: {
          type: 'testdata',
          uid: 'PD8C576611E62080A',
        },
        refId: 'A',
        scenarioId: 'csv_content',
      },
    ],
    ...queryRunnerOverrides,
  });
}
