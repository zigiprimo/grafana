import { ThresholdsMode } from '@grafana/data';
import {
  SceneTimeRange,
  SceneTimePicker,
  SceneCanvasLayout,
  HorizontalConstraint,
  VerticalConstraint,
  BackgroundImageSize,
} from '@grafana/scenes';
import { ResourceDimensionMode } from 'app/features/dimensions';

import { panelBuilders } from '../builders/panelBuilders';
import { DashboardScene } from '../dashboard/DashboardScene';
import { SceneEditManager } from '../editor/SceneEditManager';

import { getCanvasDemoQuery, queries } from './canvasDemoQueries';
import { getQueryRunnerWithRandomWalkQuery } from './queries';

export function getCanvasDemoSolar(): DashboardScene {
  return new DashboardScene({
    title: 'Canvas Solar Demo',
    body: new SceneCanvasLayout({
      children: [
        panelBuilders.newCanvas({
          title: 'Canvas background',
          background: { color: 'red' },
          placement: {
            left: 0,
            top: 0,
            minWidth: '100%',
            minHeight: '100%',
            isDraggable: false,
          },
          border: { width: 0 },
          constraint: { horizontal: HorizontalConstraint.Left, vertical: VerticalConstraint.Top },
          $data: getCanvasDemoQuery(queries.SolarDay),
          fieldConfig: {
            defaults: {
              color: {
                mode: 'thresholds',
              },
              mappings: [],
              thresholds: {
                mode: ThresholdsMode.Absolute,
                steps: [
                  {
                    color: 'green',
                    value: 0,
                  },
                  {
                    color: 'red',
                    value: 80,
                  },
                ],
              },
              unit: 'kwatt',
            },
            overrides: [],
          },
          options: {
            inlineEditing: true,
            root: {
              background: {
                color: {
                  fixed: 'transparent',
                },
                image: {
                  field: '',
                  fixed:
                    'https://www.sunnova.com/-/media/Marketing-Components/Infographic/Solar-Storage-For-Non-Export-Markets/Solar-Storage-Export-Outage-Day.ashx',
                  mode: ResourceDimensionMode.Fixed,
                },
                size: BackgroundImageSize.Original,
              },
              border: {
                color: {
                  fixed: 'red',
                },
                width: 0,
              },
              constraint: {
                horizontal: HorizontalConstraint.Left,
                vertical: VerticalConstraint.Top,
              },
              elements: [
                {
                  background: {
                    color: {
                      fixed: 'super-light-blue',
                    },
                    image: {
                      mode: ResourceDimensionMode.Fixed,
                      fixed: '',
                    },
                  },
                  border: {
                    color: {
                      fixed: 'dark-green',
                    },
                  },
                  config: {
                    align: 'center',
                    color: {
                      fixed: 'dark-blue',
                    },
                    size: 16,
                    text: {
                      field: 'solar_output',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Solar output',
                  placement: {
                    height: 30,
                    left: 752,
                    top: 253,
                    width: 75,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: '#ffffff',
                    },
                    image: {
                      mode: ResourceDimensionMode.Fixed,
                      fixed: '',
                    },
                  },
                  border: {
                    color: {
                      fixed: 'dark-green',
                    },
                  },
                  config: {
                    align: 'center',
                    color: {
                      fixed: '#000000',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Hide logo',
                  placement: {
                    height: 93,
                    left: 27,
                    top: 467,
                    width: 222,
                  },
                  type: 'rectangle',
                },
                {
                  background: {
                    color: {
                      fixed: 'super-light-green',
                    },
                    image: {
                      mode: ResourceDimensionMode.Fixed,
                      fixed: '',
                    },
                  },
                  border: {
                    color: {
                      fixed: 'dark-green',
                    },
                  },
                  config: {
                    align: 'center',
                    color: {
                      fixed: 'dark-green',
                    },
                    size: 16,
                    text: {
                      field: 'battery_charge',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Battery charge',
                  placement: {
                    height: 30,
                    left: 648,
                    top: 349,
                    width: 75,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'super-light-red',
                    },
                    image: {
                      mode: ResourceDimensionMode.Fixed,
                      fixed: '',
                    },
                  },
                  border: {
                    color: {
                      fixed: 'dark-green',
                    },
                  },
                  config: {
                    align: 'center',
                    color: {
                      fixed: 'dark-red',
                    },
                    size: 16,
                    text: {
                      field: 'house_draw',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'House draw',
                  placement: {
                    height: 30,
                    left: 747,
                    top: 352,
                    width: 75,
                  },
                  type: 'metric-value',
                },
              ],
              name: 'Element 1659400716798',
              placement: {
                height: 100,
                left: 0,
                top: 0,
                width: 100,
              },
              type: 'frame',
            },
            showAdvancedTypes: false,
          },
        }),
        panelBuilders.newGraph({
          title: 'Energy Produced',
          background: { color: 'rgba(200,0,0,0.5)' },
          placement: { left: 20, top: 50, width: 200, height: 200 },
          border: { color: 'green', width: 2 },
          constraint: { horizontal: HorizontalConstraint.Left, vertical: VerticalConstraint.Top },
        }),
        panelBuilders.newGraph({
          title: 'Energy Consumed',
          background: { color: 'rgba(200,0,0,0.5)' },
          placement: { left: 20, top: 350, width: 200, height: 200 },
          border: { color: 'green', width: 2 },
          constraint: { horizontal: HorizontalConstraint.Left, vertical: VerticalConstraint.Top },
        }),
        panelBuilders.newGraph({
          title: 'Energy Stored',
          background: { color: 'rgba(200,0,0,0.5)' },
          placement: { left: 900, top: 350, width: 200, height: 200 },
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
