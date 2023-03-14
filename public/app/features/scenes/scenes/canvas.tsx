import {
  SceneTimeRange,
  SceneTimePicker,
  SceneCanvasText,
  SceneCanvasLayout,
  HorizontalConstraint,
  VerticalConstraint,
} from '@grafana/scenes';

import { panelBuilders } from '../builders/panelBuilders';
import { DashboardScene } from '../dashboard/DashboardScene';
import { SceneEditManager } from '../editor/SceneEditManager';

import { getQueryRunnerWithRandomWalkQuery } from './queries';

export function getCanvasLayoutTest(): DashboardScene {
  return new DashboardScene({
    title: 'Canvas layout test',
    body: new SceneCanvasLayout({
      children: [
        panelBuilders.newCanvas({
          title: 'Canvas test',
          background: { color: 'rgba(200,0,0,0.5)' },
          placement: { left: 100, top: 100, width: 500, height: 500 },
          border: { color: 'green', width: 2 },
          constraint: { horizontal: HorizontalConstraint.Left, vertical: VerticalConstraint.Top },
        }),
        new SceneCanvasText({
          background: { image: 'https://i.redd.it/kg3cgpznfql01.jpg' },
          placement: { left: 100, bottom: 100, width: 200, height: 200 },
          border: { color: 'red', width: 2 },
          text: 'red box',
          fontSize: 20,
          align: 'center',
          constraint: { horizontal: HorizontalConstraint.Left, vertical: VerticalConstraint.Bottom },
        }),
        new SceneCanvasText({
          background: { color: 'rgba(200,0,0,0.5)' },
          placement: { right: 100, top: 100, width: 100, height: 100 },
          border: { color: 'green', width: 2 },
          text: 'green box',
          fontSize: 10,
          align: 'center',
          constraint: { horizontal: HorizontalConstraint.Right, vertical: VerticalConstraint.Top },
        }),
        panelBuilders.newGraph({
          title: 'Fixed height',
          background: { color: 'rgba(200,0,0,0.5)' },
          placement: { left: 10, top: 10, width: 500, height: 500 },
          border: { color: 'green', width: 2 },
          constraint: { horizontal: HorizontalConstraint.Left, vertical: VerticalConstraint.Top },
        }),
      ],
    }),
    $editor: new SceneEditManager({}),
    $timeRange: new SceneTimeRange(),
    $data: getQueryRunnerWithRandomWalkQuery(),
    actions: [new SceneTimePicker({})],
  });
}
