import { DashboardLoadedEvent, DataSourcePlugin } from '@grafana/data';
import { getAppEvents } from '@grafana/runtime';

import { CloudWatchMetricsDatasource } from './MetricsDataSource';
import { ConfigEditor } from './components/ConfigEditor';
import LogsCheatSheet from './components/LogsCheatSheet';
import { MetaInspector } from './components/MetaInspector';
import { MetricsQueryEditor } from './components/MetricsQueryEditor/MetricsQueryEditor2';
import { PanelQueryEditor } from './components/PanelQueryEditor';
import { CloudWatchDatasource } from './datasource';
import { MultiTypeDataSourcePlugin } from './multiTypeDataSource';
import { onDashboardLoadedHandler } from './tracking';
import { CloudWatchJsonData, CloudWatchMetricsQuery, CloudWatchQuery } from './types';

const cwPlugin = new DataSourcePlugin<CloudWatchDatasource, CloudWatchQuery, CloudWatchJsonData>(CloudWatchDatasource)
  .setQueryEditorHelp(LogsCheatSheet)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(PanelQueryEditor)
  .setMetadataInspector(MetaInspector);

export const metricsPlugin = new DataSourcePlugin<
  CloudWatchMetricsDatasource,
  CloudWatchMetricsQuery,
  CloudWatchJsonData
>(CloudWatchMetricsDatasource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(MetricsQueryEditor);

export const plugin3 = new MultiTypeDataSourcePlugin().setDataSourcePlugins(metricsPlugin);

// Subscribe to on dashboard loaded event so that we can track plugin adoption
getAppEvents().subscribe<DashboardLoadedEvent<CloudWatchQuery>>(DashboardLoadedEvent, onDashboardLoadedHandler);
