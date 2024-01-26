import { css } from '@emotion/css';
import React, { useState } from 'react';

import { DashboardCursorSync, GrafanaTheme2 } from '@grafana/data';
import {
  behaviors,
  QueryVariable,
  SceneComponentProps,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneQueryRunner,
  SceneVariableSet,
} from '@grafana/scenes';
import { Box, Icon, Stack, Tab, TabsBar, ToolbarButton, useStyles2 } from '@grafana/ui';
import { SearchTableType } from '@grafana-plugins/tempo/dataquery.gen';
import { TempoQuery } from '@grafana-plugins/tempo/types';

import { getExploreUrl } from '../../core/utils/explore';

import { buildBreakdownActionScene } from './ActionTabs/BreakdownScene';
import { buildRelatedMetricsScene } from './ActionTabs/RelatedMetricsScene';
import { AutoVizPanel } from './AutomaticMetricQueries/AutoVizPanel';
import { ShareTrailButton } from './ShareTrailButton';
import { TraceTimeSeriesPanel } from './TraceTimeSeriesPanel';
import { buildTracesListScene } from './TracesTabs/TracesListScene';
import { getTrailStore } from './TrailStore/TrailStore';
import {
  ActionViewDefinition,
  ActionViewType,
  MakeOptional,
  OpenEmbeddedTrailEvent,
  trailDS,
  VAR_FILTERS_EXPR,
  VAR_GROUP_BY,
  VAR_METRIC_EXPR,
} from './shared';
import { getDataSource, getTrailFor } from './utils';

export interface TraceSceneState extends SceneObjectState {
  body: SceneFlexLayout;
  actionView?: string;
  query?: TempoQuery;
}

export class TraceScene extends SceneObjectBase<TraceSceneState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['actionView'] });

  public constructor(state: MakeOptional<TraceSceneState, 'body'>) {
    const query = state.query ?? buildQuery();
    super({
      $variables: state.$variables ?? getVariableSet(),
      body: state.body ?? buildGraphScene(query),
      $data:
        state.queryRunner ??
        new SceneQueryRunner({
          datasource: trailDS,
          queries: [query],
        }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    if (this.state.actionView === undefined) {
      this.setActionView('overview');
    }
  }

  getUrlState() {
    return { actionView: this.state.actionView };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    if (typeof values.actionView === 'string') {
      if (this.state.actionView !== values.actionView) {
        const actionViewDef = actionViewsDefinitions.find((v) => v.value === values.actionView);
        if (actionViewDef) {
          this.setActionView(actionViewDef.value);
        }
      }
    } else if (values.actionView === null) {
      this.setActionView(undefined);
    }
  }

  public setActionView(actionView?: ActionViewType) {
    const { body } = this.state;
    const actionViewDef = actionViewsDefinitions.find((v) => v.value === actionView);

    if (actionViewDef && actionViewDef.value !== this.state.actionView) {
      // reduce max height for main panel to reduce height flicker
      body.state.children[0].setState({ maxHeight: MAIN_PANEL_MIN_HEIGHT });
      body.setState({ children: [...body.state.children.slice(0, 2), actionViewDef.getScene()] });
      this.setState({ actionView: actionViewDef.value });
    } else {
      // restore max height
      body.state.children[0].setState({ maxHeight: MAIN_PANEL_MAX_HEIGHT });
      body.setState({ children: body.state.children.slice(0, 2) });
      this.setState({ actionView: undefined });
    }
  }

  static Component = ({ model }: SceneComponentProps<TraceScene>) => {
    const { body } = model.useState();
    return <body.Component model={body} />;
  };
}

const actionViewsDefinitions: ActionViewDefinition[] = [
  { displayName: 'Traces', value: 'overview', getScene: buildTracesListScene },
  { displayName: 'Group By', value: 'breakdown', getScene: buildBreakdownActionScene },
  { displayName: 'Related metrics', value: 'related', getScene: buildRelatedMetricsScene },
];

export interface TracesActionBarState extends SceneObjectState {}

export class TracesActionBar extends SceneObjectBase<TracesActionBarState> {
  public onOpenTrail = () => {
    this.publishEvent(new OpenEmbeddedTrailEvent(), true);
  };

  public getLinkToExplore = async () => {
    const metricScene = sceneGraph.getAncestor(this, TraceScene);
    const trail = getTrailFor(this);
    const dsValue = getDataSource(trail);

    const flexItem = metricScene.state.body.state.children[0] as SceneFlexItem;
    const autoVizPanel = flexItem.state.body as AutoVizPanel;
    const queries = autoVizPanel.state.queryDef?.queries || [];
    const timeRange = sceneGraph.getTimeRange(autoVizPanel);

    return getExploreUrl({
      queries,
      dsRef: { uid: dsValue },
      timeRange: timeRange.state.value,
      scopedVars: { __sceneObject: { value: metricScene } },
    });
  };

  public openExploreLink = async () => {
    this.getLinkToExplore().then((link) => {
      // We use window.open instead of a Link or <a> because we want to compute the explore link when clicking,
      // if we precompute it we have to keep track of a lot of dependencies
      window.open(link, '_blank');
    });
  };

  public static Component = ({ model }: SceneComponentProps<TraceActionBar>) => {
    const metricScene = sceneGraph.getAncestor(model, TraceScene);
    const styles = useStyles2(getStyles);
    const trail = getTrailFor(model);
    const [isBookmarked, setBookmarked] = useState(false);
    const { actionView } = metricScene.useState();

    const onBookmarkTrail = () => {
      getTrailStore().addBookmark(trail);
      setBookmarked(!isBookmarked);
    };

    return (
      <Box paddingY={1}>
        <div className={styles.actions}>
          <Stack gap={2}>
            <ToolbarButton
              variant={'canvas'}
              icon="compass"
              tooltip="Open in explore"
              onClick={model.openExploreLink}
            ></ToolbarButton>
            <ShareTrailButton trail={trail} />
            <ToolbarButton
              variant={'canvas'}
              icon={
                isBookmarked ? (
                  <Icon name={'favorite'} type={'mono'} size={'lg'} />
                ) : (
                  <Icon name={'star'} type={'default'} size={'lg'} />
                )
              }
              tooltip={'Bookmark'}
              onClick={onBookmarkTrail}
            />
            {trail.state.embedded && (
              <ToolbarButton variant={'canvas'} onClick={model.onOpenTrail}>
                Open
              </ToolbarButton>
            )}
          </Stack>
        </div>

        <TabsBar>
          {actionViewsDefinitions.map((tab, index) => {
            return (
              <Tab
                key={index}
                label={tab.displayName}
                active={actionView === tab.value}
                onChangeTab={() => metricScene.setActionView(tab.value)}
              />
            );
          })}
        </TabsBar>
      </Box>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    actions: css({
      [theme.breakpoints.up(theme.breakpoints.values.md)]: {
        position: 'absolute',
        right: 0,
        zIndex: 2,
      },
    }),
  };
}

function getVariableSet() {
  return new SceneVariableSet({
    variables: [
      new QueryVariable({
        name: VAR_GROUP_BY,
        label: 'Group by',
        datasource: trailDS,
        includeAll: true,
        defaultToAll: true,
        query: { query: `label_names(${VAR_METRIC_EXPR})`, refId: 'A' },
        value: '',
        text: '',
      }),
    ],
  });
}

const MAIN_PANEL_MIN_HEIGHT = 200;
const MAIN_PANEL_MAX_HEIGHT = '30%';

function buildQuery(): TempoQuery {
  return {
    refId: 'A',
    query: `${VAR_FILTERS_EXPR} | select(status)`,
    queryType: 'traceql',
    tableType: SearchTableType.Spans,
    limit: 100,
    spss: 10,
    filters: [],
  };
}

function buildGraphScene() {
  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [new behaviors.CursorSync({ key: 'metricCrosshairSync', sync: DashboardCursorSync.Crosshair })],
    children: [
      new SceneFlexItem({
        minHeight: MAIN_PANEL_MIN_HEIGHT,
        maxHeight: MAIN_PANEL_MAX_HEIGHT,
        body: new TraceTimeSeriesPanel({}),
      }),
      new SceneFlexItem({
        ySizing: 'content',
        body: new TracesActionBar({}),
      }),
    ],
  });
}
