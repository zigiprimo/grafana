import { PanelMenuItem, PanelModel } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { SceneQueryRunner, SceneTimeRange, VizPanel } from '@grafana/scenes';
import appEvents from 'app/core/app_events';
import { buildVisualQueryFromString } from 'app/plugins/datasource/prometheus/querybuilder/parsing';
import { ShowModalReactEvent } from 'app/types/events';

import { DashboardModel } from '../dashboard/state';
import { DashboardScene } from '../dashboard-scene/scene/DashboardScene';
import { getQueryRunnerFor } from '../dashboard-scene/utils/utils';

import { DataTrailDrawer } from './DataTrailDrawer';

export function addDataTrailPanelAction(
  dashboard: DashboardScene | DashboardModel,
  panel: VizPanel | PanelModel,
  items: PanelMenuItem[]
) {
  const queryRunner =
    panel instanceof VizPanel
      ? getQueryRunnerFor(panel)
      : new SceneQueryRunner({ datasource: panel.datasource || undefined, queries: panel.targets || [] });
  if (!queryRunner) {
    return;
  }

  const ds = getDataSourceSrv().getInstanceSettings(queryRunner.state.datasource);
  console.log('DS', ds);
  if (!ds || ds.meta.id !== 'prometheus' || queryRunner.state.queries.length > 1) {
    return;
  }

  const query = queryRunner.state.queries[0];
  const parsedResult = buildVisualQueryFromString(query.expr);
  if (parsedResult.errors.length > 0) {
    return;
  }

  items.push({
    text: 'Data trail',
    iconClassName: 'code-branch',
    onClick: () => {
      if (dashboard instanceof DashboardScene) {
        const drawer = new DataTrailDrawer({
          query: parsedResult.query,
          dsRef: ds,
          timeRange: dashboard.state.$timeRange!.clone(),
        });
        dashboard.showModal(drawer);
      } else if (dashboard instanceof DashboardModel) {
        const drawer = new DataTrailDrawer({
          query: parsedResult.query,
          dsRef: ds,
          timeRange: new SceneTimeRange({ ...dashboard.time }),
        });

        const payload = {
          component: DataTrailDrawer.Component,
          props: { model: drawer },
        };

        appEvents.publish(new ShowModalReactEvent(payload));
      }
    },
    shortcut: 'p s',
  });
}
