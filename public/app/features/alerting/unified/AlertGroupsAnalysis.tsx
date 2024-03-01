import dbscan from '@cdxoo/dbscan';
import { format, getUnixTime } from 'date-fns';
import * as React from 'react';

import { findCommonLabels } from '@grafana/data';
import { Stack } from '@grafana/ui';

import { alertmanagerApi } from './api/alertmanagerApi';
import { AlertLabels } from './components/AlertLabels';
import { useAlertmanager } from './state/AlertmanagerContext';

interface AlertGroupsAnalysisProps {}

export function AlertGroupAnalysis({}: AlertGroupsAnalysisProps) {
  const { selectedAlertmanager } = useAlertmanager();

  const { data: alerts = [] } = alertmanagerApi.endpoints.getAlertmanagerAlerts.useQuery({
    amSourceName: selectedAlertmanager || '',
  });

  const dataset = alerts.map((alert) => ({
    key: alert.fingerprint,
    timestamp: getUnixTime(alert.startsAt),
  }));

  const result = dbscan({
    dataset,
    epsilon: 5 * 60, // 5 minutes
    distanceFunction: (a, b) => Math.abs(a.timestamp - b.timestamp),
  });

  return (
    <Stack direction="column" gap={3}>
      {result.clusters.map((cluster, index) => {
        const clusterAlerts = cluster.map((index) => alerts[index]);
        const commonLabels = findCommonLabels(clusterAlerts.map((alert) => alert.labels));

        return (
          <Stack direction="column" gap={1} key={index}>
            <Stack direction="row">
              Common labels: {Object.keys(commonLabels).length > 0 ? <AlertLabels labels={commonLabels} /> : 'None'}
            </Stack>
            {clusterAlerts.map((alert) => (
              <Stack key={alert.fingerprint} direction="row">
                <div>{format(alert.startsAt, 'dd/MM/yy hh:mm')}</div>
                <AlertLabels labels={alert.labels} commonLabels={commonLabels} />
                {/*<div>{alert.startsAt}</div>*/}
              </Stack>
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
