import { DataFrame } from '@grafana/data';
import { AddPanelToDashboardOptions, getAddToDashboardSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';

import { ExplorePanelData } from '../../types';

export { AddToDashboardError } from '@grafana/runtime';

export async function setDashboardInLocalStorage(
  options: Omit<AddPanelToDashboardOptions, 'panelType'> & { queryResponse: ExplorePanelData }
) {
  const panelType = getPanelType(options.queries, options.queryResponse);
  return getAddToDashboardSrv().setDashboardInLocalStorage({ ...options, panelType });
}

const isVisible = (query: DataQuery) => !query.hide;
const hasRefId = (refId: DataFrame['refId']) => (frame: DataFrame) => frame.refId === refId;

function getPanelType(queries: DataQuery[], queryResponse: ExplorePanelData) {
  for (const { refId } of queries.filter(isVisible)) {
    const hasQueryRefId = hasRefId(refId);
    if (queryResponse.flameGraphFrames.some(hasQueryRefId)) {
      return 'flamegraph';
    }
    if (queryResponse.graphFrames.some(hasQueryRefId)) {
      return 'timeseries';
    }
    if (queryResponse.logsFrames.some(hasQueryRefId)) {
      return 'logs';
    }
    if (queryResponse.nodeGraphFrames.some(hasQueryRefId)) {
      return 'nodeGraph';
    }
    if (queryResponse.traceFrames.some(hasQueryRefId)) {
      return 'traces';
    }
    if (queryResponse.customFrames.some(hasQueryRefId)) {
      // we will always have a custom frame and meta, it should never default to 'table' (but all paths must return a string)
      return queryResponse.customFrames.find(hasQueryRefId)?.meta?.preferredVisualisationPluginId ?? 'table';
    }
  }

  // falling back to table
  return 'table';
}
