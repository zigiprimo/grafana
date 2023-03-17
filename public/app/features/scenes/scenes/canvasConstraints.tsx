import {
  SceneTimeRange,
  SceneTimePicker,
  SceneCanvasText,
  SceneCanvasLayout,
  SceneCanvasRootLayout,
  HorizontalConstraint,
  VerticalConstraint,
} from '@grafana/scenes';

import { DashboardScene } from '../dashboard/DashboardScene';
import { SceneEditManager } from '../editor/SceneEditManager';

import { getQueryRunnerWithRandomWalkQuery } from './queries';

export function getCanvasConstraintTest(): DashboardScene {
  return new DashboardScene({
    title: 'Canvas constraints test',
    body: new SceneCanvasRootLayout({
      children: [
        new SceneCanvasLayout({
          children: [
            new SceneCanvasText({
              placement: { width: 200, height: 200 },
              border: { color: 'purple', width: 2 },
              text: 'SCALE SCALE',
              fontSize: 20,
              align: 'center',
              constraint: { vertical: VerticalConstraint.Scale, horizontal: HorizontalConstraint.Scale },
            }),
            new SceneCanvasText({
              placement: { width: 200, height: 200 },
              border: { color: 'red', width: 2 },
              text: 'BOTTOM RIGHT',
              fontSize: 20,
              align: 'center',
              constraint: { vertical: VerticalConstraint.Bottom, horizontal: HorizontalConstraint.Right },
            }),
            new SceneCanvasText({
              placement: { width: 200, height: 200 },
              border: { color: 'cyan', width: 2 },
              text: 'BOTTOM LEFT',
              fontSize: 20,
              align: 'center',
              constraint: { vertical: VerticalConstraint.Bottom, horizontal: HorizontalConstraint.Left },
            }),
            new SceneCanvasText({
              placement: { width: 200, height: 200 },
              border: { color: 'orange', width: 2 },
              text: 'TOP LEFT',
              fontSize: 20,
              align: 'center',
              constraint: { vertical: VerticalConstraint.Top, horizontal: HorizontalConstraint.Left },
            }),
            new SceneCanvasText({
              placement: { width: 200, height: 200 },
              border: { color: 'white', width: 2 },
              text: 'TOP RIGHT',
              fontSize: 20,
              align: 'center',
              constraint: { vertical: VerticalConstraint.Top, horizontal: HorizontalConstraint.Right },
            }),
            new SceneCanvasText({
              placement: { width: 200, height: 200, top: 200, left: 200, right: 200, bottom: 200 },
              border: { color: 'blue', width: 2 },
              text: 'TOP/BOTTOM - LEFT/RIGHT',
              fontSize: 20,
              align: 'center',
              constraint: { vertical: VerticalConstraint.TopBottom, horizontal: HorizontalConstraint.LeftRight },
            }),
            new SceneCanvasText({
              placement: { width: 200, height: 200 },
              border: { color: 'green', width: 2 },
              text: 'CENTER CENTER',
              fontSize: 20,
              align: 'center',
              constraint: { vertical: VerticalConstraint.Center, horizontal: HorizontalConstraint.Center },
            }),
          ],
        }),
      ],
    }),
    $editor: new SceneEditManager({}),
    $timeRange: new SceneTimeRange(),
    $data: getQueryRunnerWithRandomWalkQuery(),
    actions: [new SceneTimePicker({})],
  });
}
