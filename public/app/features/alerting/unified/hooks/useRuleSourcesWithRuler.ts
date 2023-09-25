import { DataSourceInstanceSettings } from '@grafana/data';
import { AlertRuleSource } from 'app/types/unified-alerting';

import { getDataSourceByName } from '../utils/datasource';

import { useUnifiedAlertingSelector } from './useUnifiedAlertingSelector';

export function useRulesSourcesWithRuler(): DataSourceInstanceSettings[] {
  const dataSources = useUnifiedAlertingSelector((state) => state.dataSources);

  const dataSourcesWithRuler = Object.values(dataSources)
    .map((ds) => ds.result)
    .filter((ds): ds is AlertRuleSource => Boolean(ds?.rulerConfig));
  // try fetching rules for each prometheus to see if it has ruler

  return dataSourcesWithRuler
    .map((ds) => getDataSourceByName(ds.name))
    .filter((dsConfig): dsConfig is DataSourceInstanceSettings => Boolean(dsConfig));
}
