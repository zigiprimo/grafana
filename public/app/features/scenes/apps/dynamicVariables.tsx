import {
  CustomVariable,
  EmbeddedScene,
  QueryVariable,
  SceneControlsSpacer,
  SceneDataState,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectStatePlain,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueSelectors,
  VizPanel,
} from '@grafana/scenes';

import { getInstantQuery, getTimeSeriesQuery } from './scenes';

export function getDynamicVariablesScene(): EmbeddedScene {
  const scene = new EmbeddedScene({
    $variables: new SceneVariableSet({
      variables: [
        new QueryVariable({
          name: 'metric',
          datasource: { uid: 'gdev-prometheus' },
          query: { query: 'metrics(.*)' },
        }),
      ],
    }),
    $timeRange: new SceneTimeRange({ from: 'now-1h', to: 'now' }),
    controls: [
      new DynamicVariablesManager({
        $data: getInstantQuery({
          key: 'dynavars',
          expr: `$metric`,
          format: 'time_series',
        }),
      }),
      new VariableValueSelectors({}),
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneRefreshPicker({}),
    ],
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new VizPanel({
          $data: getTimeSeriesQuery({
            expr: `$metric`,
          }),
          pluginId: 'timeseries',
          title: 'Results',
          placement: {},
          //displayMode: 'transparent',
          options: {},
        }),
      ],
    }),
  });

  return scene;
}

interface DynamicVariablesManagerState extends SceneObjectStatePlain {}

class DynamicVariablesManager extends SceneObjectBase<DynamicVariablesManagerState> {
  public activate(): void {
    super.activate();
    this._subs.add(this.state.$data?.subscribeToState({ next: (data) => this.handleDataReceived(data) }));
  }

  public handleDataReceived(data: SceneDataState) {
    if (!data.data?.series.length) {
      return;
    }

    const labels = new Map<string, Set<string>>();

    for (const frame of data.data.series) {
      for (const field of frame.fields) {
        if (field.labels) {
          for (const [key, value] of Object.entries(field.labels)) {
            if (key === '__name__') {
              continue;
            }

            if (labels.get(key)) {
              labels.get(key)!.add(value);
            } else {
              labels.set(key, new Set([value]));
            }
          }
        }
      }
    }

    const variableSet = sceneGraph.getVariables(this);
    // Always preserve the first variable
    const variableArray = [variableSet.state.variables[0]];

    for (const [key, values] of labels) {
      if (values.size === 1) {
        continue;
      }

      variableArray.push(
        new CustomVariable({
          name: key,
          query: Array.from(values).join(','),
        })
      );
    }

    variableSet.setState({ variables: variableArray });
  }
}
