import { SceneFlexLayout, SceneTimeRange, SceneTimePicker } from '@grafana/scenes';

import { panelBuilders } from '../builders/panelBuilders';
import { DashboardScene } from '../dashboard/DashboardScene';

import { getQueryRunnerFor3SeriesWithLabels } from './queries';

export function getPanelContextDemoScene(): DashboardScene {
  return new DashboardScene({
    title: 'Flex layout test',
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        panelBuilders.newGraph({
          placement: { height: 300 },
          title: 'Check legend visibility actions, and color change',
          $data: getQueryRunnerFor3SeriesWithLabels(),
          fieldConfig: {
            defaults: {
              displayName: '${__field.labels.cluster}',
            },
            overrides: [],
          },
        }),
      ],
    }),
    $timeRange: new SceneTimeRange(),
    actions: [new SceneTimePicker({})],
  });
}
