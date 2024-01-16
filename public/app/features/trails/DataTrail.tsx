import { css } from '@emotion/css';
import React from 'react';

import { AdHocVariableFilter, GrafanaTheme2, SelectableValue } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import {
  AdHocFiltersVariable,
  DataSourceVariable,
  getUrlSyncManager,
  SceneComponentProps,
  SceneControlsSpacer,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { Button, Select, Stack, useStyles2 } from '@grafana/ui';

import { DataTrailSettings } from './DataTrailSettings';
import { DataTrailsApp } from './DataTrailsApp';
import { DataTrailHistory, DataTrailHistoryStep } from './DataTrailsHistory';
import { MetricScene } from './MetricScene';
import { MetricSelectScene } from './MetricSelectScene';
import { getTrailStore } from './TrailStore/TrailStore';
import { MetricSelectedEvent, trailDS, LOGS_METRIC, VAR_DATASOURCE, VAR_FILTERS } from './shared';
import { getDatasourceForNewTrail, getUrlForTrail, newMetricsTrail } from './utils';

export interface DataTrailState extends SceneObjectState {
  topScene?: SceneObject;
  embedded?: boolean;
  controls: SceneObject[];
  history: DataTrailHistory;
  settings: DataTrailSettings;

  // just for for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];

  // Synced with url
  metric?: string;
}

export class DataTrail extends SceneObjectBase<DataTrailState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['metric'] });

  public constructor(state: Partial<DataTrailState>) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialDS, state.metric, state.initialFilters),
      controls: state.controls ?? [
        new VariableValueSelectors({ layout: 'vertical' }),
        new SceneControlsSpacer(),
        new SceneTimePicker({}),
        new SceneRefreshPicker({}),
      ],
      history: state.history ?? new DataTrailHistory({}),
      settings: state.settings ?? new DataTrailSettings({}),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.topScene) {
      this.setState({ topScene: getTopSceneFor(this.state.metric) });
    }

    // Some scene elements publish this
    this.subscribeToEvent(MetricSelectedEvent, this._handleMetricSelectedEvent.bind(this));

    // Pay attention to changes in history (i.e., changing the step)
    this.state.history.subscribeToState((newState, oldState) => {
      const oldNumberOfSteps = oldState.steps.length;
      const newNumberOfSteps = newState.steps.length;

      const newStepWasAppended = newNumberOfSteps > oldNumberOfSteps;

      if (newStepWasAppended) {
        // Do nothing because the state is already up to date -- it created a new step!
        return;
      }

      if (oldState.currentStep === newState.currentStep) {
        // The same step was clicked on -- no need to change anything.
        return;
      }

      // History changed because a different node was selected
      const step = newState.steps[newState.currentStep];

      this.goBackToStep(step);
    });

    return () => {
      if (!this.state.embedded) {
        getUrlSyncManager().cleanUp(this);
        getTrailStore().setRecentTrail(this);
      }
    };
  }

  private goBackToStep(step: DataTrailHistoryStep) {
    if (!this.state.embedded) {
      getUrlSyncManager().cleanUp(this);
    }

    if (!step.trailState.metric) {
      step.trailState.metric = undefined;
    }

    this.setState(step.trailState);

    if (!this.state.embedded) {
      locationService.replace(getUrlForTrail(this));

      getUrlSyncManager().initSync(this);
    }
  }

  private _handleMetricSelectedEvent(evt: MetricSelectedEvent) {
    if (this.state.embedded) {
      this.setState(this.getSceneUpdatesForNewMetricValue(evt.payload));
    } else {
      locationService.partial({ metric: evt.payload, actionView: null });
    }

    // Add metric to adhoc filters baseFilter
    const filterVar = sceneGraph.lookupVariable(VAR_FILTERS, this);
    if (filterVar instanceof AdHocFiltersVariable) {
      filterVar.state.set.setState({
        baseFilters: getBaseFiltersForMetric(evt.payload),
      });
    }
  }

  private getSceneUpdatesForNewMetricValue(metric: string | undefined) {
    const stateUpdate: Partial<DataTrailState> = {};
    stateUpdate.metric = metric;
    stateUpdate.topScene = getTopSceneFor(metric);
    return stateUpdate;
  }

  getUrlState() {
    return { metric: this.state.metric };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const stateUpdate: Partial<DataTrailState> = {};

    if (typeof values.metric === 'string') {
      if (this.state.metric !== values.metric) {
        Object.assign(stateUpdate, this.getSceneUpdatesForNewMetricValue(values.metric));
      }
    } else if (values.metric === null) {
      stateUpdate.metric = undefined;
      stateUpdate.topScene = new MetricSelectScene({ showHeading: true });
    }

    this.setState(stateUpdate);
  }

  private onNewMetricsTrail() {
    const app = sceneGraph.getAncestor(this, DataTrailsApp);
    const trail = newMetricsTrail(getDatasourceForNewTrail());

    getTrailStore().setRecentTrail(trail);
    app.goToUrlForTrail(trail);
  }

  public onSelectTrail = (trail?: DataTrail) => {
    if (!trail) {
      return;
    }
    const app = sceneGraph.getAncestor(this, DataTrailsApp);

    getTrailStore().setRecentTrail(trail);
    app.goToUrlForTrail(trail);
  };

  static Component = ({ model }: SceneComponentProps<DataTrail>) => {
    const { controls, topScene, history, settings } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <history.Component model={history} />
          <Stack gap={1}>
            <Select
              width={'auto'}
              onChange={(evt) => model.onSelectTrail(evt.value)}
              value={null}
              options={getTrailStore().bookmarks.map((dt) => storedTrailItem(dt.resolve()))}
              placeholder="Bookmarks"
            />
            <Select
              width={'auto'}
              onChange={(evt) => model.onSelectTrail(evt.value)}
              value={null}
              options={getTrailStore().recent.map((dt) => storedTrailItem(dt.resolve()))}
              placeholder="Recent trails"
            />
            <Button icon="repeat" size="md" variant="secondary" onClick={model.onNewMetricsTrail}>
              Reset
            </Button>
          </Stack>
        </div>
        {controls && (
          <div className={styles.controls}>
            {controls.map((control) => (
              <control.Component key={control.state.key} model={control} />
            ))}
            <settings.Component model={settings} />
          </div>
        )}
        <div className={styles.body}>{topScene && <topScene.Component model={topScene} />}</div>
      </div>
    );
  };
}

function storedTrailItem(trail: DataTrail): SelectableValue<DataTrail> {
  const filtersVariable = sceneGraph.lookupVariable(VAR_FILTERS, trail)!;
  if (!(filtersVariable instanceof AdHocFiltersVariable)) {
    return {};
  }

  const filters = filtersVariable.state.set.state.filters;
  return {
    value: trail,
    label: trail.state.metric,
    description: filters.map((filter) => `${filter.key}=${filter.value}`).join(', '),
  };
}

function getTopSceneFor(metric?: string) {
  if (metric) {
    return new MetricScene({ metric: metric });
  } else {
    return new MetricSelectScene({ showHeading: true });
  }
}

function getVariableSet(initialDS?: string, metric?: string, initialFilters?: AdHocVariableFilter[]) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: 'Data source',
        value: initialDS,
        pluginId: metric === LOGS_METRIC ? 'loki' : 'prometheus',
      }),
      AdHocFiltersVariable.create({
        name: 'filters',
        datasource: trailDS,
        layout: 'vertical',
        filters: initialFilters ?? [],
        baseFilters: getBaseFiltersForMetric(metric),
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      flexGrow: 1,
      display: 'flex',
      gap: theme.spacing(2),
      minHeight: '100%',
      flexDirection: 'column',
    }),
    body: css({
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      padding: theme.spacing(0, 3),
    }),
    controls: css({
      display: 'flex',
      gap: theme.spacing(2),
      padding: theme.spacing(0, 3),
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    }),
    header: css({
      display: 'flex',
      padding: theme.spacing(1, 3),
      background: theme.colors.background.primary,
      justifyContent: 'space-between',
    }),
  };
}

function getBaseFiltersForMetric(metric?: string): AdHocVariableFilter[] {
  if (metric) {
    return [{ key: '__name__', operator: '=', value: metric }];
  }
  return [];
}
