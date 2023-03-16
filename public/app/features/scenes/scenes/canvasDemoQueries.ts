import { QueryRunnerState, SceneQueryRunner } from '@grafana/scenes';
import { TestData } from 'app/plugins/datasource/testdata/dataquery.gen';

export enum queries {
  Wind,
  SolarDay,
  SolarNight,
}

export function getCanvasDemoQuery(
  query: queries,
  overrides?: Partial<TestData>,
  queryRunnerOverrides?: Partial<QueryRunnerState>
) {
  switch (query) {
    case queries.Wind: {
      return new SceneQueryRunner({
        queries: [
          {
            csvContent:
              'w1_rpm, w1_energy_output, w1_status, w2_rpm, w2_energy_output, w2_status, w3_rpm, w3_energy_output, w3_status, w4_rpm, w4_energy_output, w4_status, bg_url\n12, 1.2, operational, 22, 1.8, operational, 8, 0.6, operational, 0, 0, needs maintenance, "https://www.sunnova.com/-/media/Marketing-Components/Infographic/Solar-Storage-For-Non-Export-Markets/Solar-Storage-Export-Outage-Day.ashx"',
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
    case queries.SolarDay: {
      return new SceneQueryRunner({
        queries: [
          {
            csvContent: 'house_draw, battery_charge, solar_output\n1.1, 2.2, 3.3',
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
  }
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
