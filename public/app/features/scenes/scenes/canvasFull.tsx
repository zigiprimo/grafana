import { MappingType, ThresholdsMode } from '@grafana/data';
import {
  SceneTimeRange,
  SceneTimePicker,
  SceneCanvasText,
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

export function getCanvasFull(): DashboardScene {
  return new DashboardScene({
    title: 'Canvas full',
    body: new SceneCanvasLayout({
      children: [
        panelBuilders.newCanvas({
          title: 'Canvas background',
          background: { color: 'rgba(200,0,0,0.5)' },
          placement: {
            left: 0,
            top: 0,
            minWidth: '100%',
            minHeight: '100%',
            isDraggable: false,
          },
          border: { width: 0 },
          constraint: { horizontal: HorizontalConstraint.Left, vertical: VerticalConstraint.Top },
          $data: getCanvasDemoQuery(queries.Wind),
          fieldConfig: {
            defaults: {
              color: {
                mode: 'thresholds',
              },
              mappings: [
                {
                  options: {
                    from: 1,
                    result: {
                      color: 'green',
                      index: 0,
                    },
                    to: 2,
                  },
                  type: MappingType.RangeToText,
                },
                {
                  options: {
                    from: 0,
                    result: {
                      color: 'red',
                      index: 1,
                    },
                    to: 1,
                  },
                  type: MappingType.RangeToText,
                },
              ],
              thresholds: {
                mode: ThresholdsMode.Absolute,
                steps: [
                  {
                    color: 'orange',
                    value: 0,
                  },
                  {
                    color: 'green',
                    value: 10,
                  },
                ],
              },
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
                  mode: ResourceDimensionMode.Fixed,
                  fixed: 'https://dl.grafana.com/files/temp/ryan/landscape_2x.jpg',
                },
                size: BackgroundImageSize.Original,
              },
              border: {
                color: {
                  fixed: 'dark-green',
                },
              },
              constraint: {
                horizontal: HorizontalConstraint.Left,
                vertical: VerticalConstraint.Top,
              },
              elements: [
                {
                  background: {
                    color: {
                      fixed: 'transparent',
                    },
                  },
                  border: {
                    color: {
                      fixed: 'dark-green',
                    },
                  },
                  config: {
                    rpm: {
                      field: 'w3_rpm',
                    },
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Windmill 3',
                  placement: {
                    height: 179,
                    left: 15,
                    top: 234,
                    width: 190,
                  },
                  type: 'windTurbine',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
                    },
                  },
                  border: {
                    color: {
                      fixed: 'dark-green',
                    },
                  },
                  config: {
                    rpm: {
                      field: 'w4_rpm',
                    },
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Windmill 4',
                  placement: {
                    height: 104,
                    left: 199,
                    top: 257,
                    width: 167,
                  },
                  type: 'windTurbine',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
                    },
                  },
                  border: {
                    color: {
                      fixed: 'dark-green',
                    },
                  },
                  config: {
                    rpm: {
                      field: 'w1_rpm',
                    },
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Windmill 1',
                  placement: {
                    height: 383,
                    left: 438,
                    top: 77,
                    width: 299,
                  },
                  type: 'windTurbine',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
                    },
                  },
                  border: {
                    color: {
                      fixed: 'dark-green',
                    },
                  },
                  config: {
                    rpm: {
                      field: 'w2_rpm',
                    },
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Windmill 2',
                  placement: {
                    height: 280,
                    left: 726,
                    top: 137,
                    width: 259,
                  },
                  type: 'windTurbine',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 11,
                    text: {
                      fixed: 'W4',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Windmill 4_label',
                  placement: {
                    height: 26,
                    left: 263,
                    top: 480,
                    width: 39,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 11,
                    text: {
                      fixed: 'W3',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Windmill 3_label',
                  placement: {
                    height: 26,
                    left: 91,
                    top: 491,
                    width: 39,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 11,
                    text: {
                      fixed: 'W2',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Windmill 2_label',
                  placement: {
                    height: 26,
                    left: 836,
                    top: 495,
                    width: 39,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 11,
                    text: {
                      fixed: 'W1',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'Windmill 1_label',
                  placement: {
                    height: 26,
                    left: 570,
                    top: 495,
                    width: 39,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      field: 'w4_status',
                      fixed: 'green',
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
                    size: 14,
                    text: {
                      field: 'w4_status',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w4_status',
                  placement: {
                    height: 31,
                    left: 306,
                    top: 496,
                    width: 137,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      field: 'w4_energy_output',
                      fixed: '#D9D9D9',
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
                    size: 14,
                    text: {
                      field: 'w4_energy_output',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w4_energy_value',
                  placement: {
                    height: 31,
                    left: 306,
                    top: 462,
                    width: 58,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 14,
                    text: {
                      fixed: 'MW',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w4_energy_label',
                  placement: {
                    height: 26,
                    left: 357,
                    top: 465,
                    width: 56,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      field: 'w4_rpm',
                      fixed: '#D9D9D9',
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
                    size: 14,
                    text: {
                      field: 'w4_rpm',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w4_rpm_value',
                  placement: {
                    height: 31,
                    left: 306,
                    top: 429,
                    width: 37,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 14,
                    text: {
                      fixed: 'rpm',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w4_rpm_label',
                  placement: {
                    height: 26,
                    left: 335,
                    top: 431,
                    width: 48,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      field: 'w3_status',
                      fixed: 'green',
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
                    size: 14,
                    text: {
                      field: 'w3_status',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w3_status',
                  placement: {
                    height: 31,
                    left: 133,
                    top: 490,
                    width: 110,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      field: 'w3_energy_output',
                      fixed: '#D9D9D9',
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
                    size: 14,
                    text: {
                      field: 'w3_energy_output',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w3_energy_value',
                  placement: {
                    height: 31,
                    left: 133,
                    top: 456,
                    width: 58,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 14,
                    text: {
                      fixed: 'MW',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w3_energy_label',
                  placement: {
                    height: 27,
                    left: 184,
                    top: 458,
                    width: 56,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      field: 'w3_rpm',
                      fixed: '#D9D9D9',
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
                    size: 13,
                    text: {
                      field: 'w3_rpm',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w3_rpm_value',
                  placement: {
                    height: 31,
                    left: 133,
                    top: 422,
                    width: 37,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 14,
                    text: {
                      fixed: 'rpm',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w3_rpm_label',
                  placement: {
                    height: 31,
                    left: 167,
                    top: 422,
                    width: 43,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      fixed: 'green',
                    },
                    image: {
                      fixed: '',
                      mode: ResourceDimensionMode.Fixed,
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
                    size: 14,
                    text: {
                      field: 'w2_status',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w2_status',
                  placement: {
                    height: 31,
                    left: 874,
                    top: 488,
                    width: 110,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      field: 'w2_energy_output',
                      fixed: '#D9D9D9',
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
                    size: 14,
                    text: {
                      field: 'w2_energy_output',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w2_energy_value',
                  placement: {
                    height: 31,
                    left: 874,
                    top: 453,
                    width: 58,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 14,
                    text: {
                      fixed: 'MW',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w2_energy_label',
                  placement: {
                    height: 31,
                    left: 922,
                    top: 453,
                    width: 62,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      field: 'w2_rpm',
                      fixed: '#D9D9D9',
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
                    size: 14,
                    text: {
                      field: 'w2_rpm',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w2_rpm_value',
                  placement: {
                    height: 31,
                    left: 874,
                    top: 418,
                    width: 37,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 14,
                    text: {
                      fixed: 'rpm',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w2_rpm_label',
                  placement: {
                    height: 41,
                    left: 889,
                    top: 412,
                    width: 80,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      fixed: 'green',
                    },
                    image: {
                      fixed: '',
                      mode: ResourceDimensionMode.Fixed,
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
                    size: 14,
                    text: {
                      field: 'w1_status',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w1_status',
                  placement: {
                    height: 31,
                    left: 617,
                    top: 500,
                    width: 110,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      field: 'w1_energy_output',
                      fixed: '#D9D9D9',
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
                    size: 14,
                    text: {
                      field: 'w1_energy_output',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w1_energy_value',
                  placement: {
                    height: 31,
                    left: 618,
                    top: 465,
                    width: 58,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 14,
                    text: {
                      fixed: 'MW',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w1_energy_label',
                  placement: {
                    height: 31,
                    left: 667,
                    top: 465,
                    width: 58,
                  },
                  type: 'text',
                },
                {
                  background: {
                    color: {
                      field: 'w1_rpm',
                      fixed: '#D9D9D9',
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
                    size: 14,
                    text: {
                      field: 'w1_rpm',
                      fixed: '',
                      mode: 'field',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w1_rpm_value',
                  placement: {
                    height: 31,
                    left: 619,
                    top: 429,
                    width: 37,
                  },
                  type: 'metric-value',
                },
                {
                  background: {
                    color: {
                      fixed: 'transparent',
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
                    size: 14,
                    text: {
                      fixed: 'rpm',
                    },
                    valign: 'middle',
                  },
                  constraint: {
                    horizontal: HorizontalConstraint.Left,
                    vertical: VerticalConstraint.Top,
                  },
                  name: 'w1_rpm_label',
                  placement: {
                    height: 32,
                    left: 646,
                    top: 428,
                    width: 54,
                  },
                  type: 'text',
                },
              ],
              name: 'Element 1664917007512',
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
          placement: { left: 500, top: 10, width: 200, height: 200 },
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
