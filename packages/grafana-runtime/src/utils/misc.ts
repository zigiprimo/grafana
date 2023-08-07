import { omit } from 'lodash';

import { DataQuery, ExploreUrlState, PanelModel, RawTimeRange, urlUtil } from '@grafana/data';

import { ExpressionDatasourceUID } from '../../../../public/app/features/expressions/types';
import { DataSourceSrv } from '../services';

// Borrowed from https://github.com/ai/nanoid/blob/3.0.2/non-secure/index.js
// This alphabet uses `A-Za-z0-9_-` symbols. A genetic algorithm helped
// optimize the gzip compression for this alphabet.
let urlAlphabet = 'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';

/**
 *
 * @public
 */
export let nanoid = (size = 21) => {
  let id = '';
  // A compact alternative for `for (var i = 0; i < step; i++)`.
  let i = size;
  while (i--) {
    // `| 0` is more compact and faster than `Math.floor()`.
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id;
};

export const copyStringToClipboard = (string: string) => {
  const el = document.createElement('textarea');
  el.value = string;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

export interface GetExploreUrlArguments {
  panel: PanelModel;
  /** Datasource service to query other datasources in case the panel datasource is mixed */
  datasourceSrv: DataSourceSrv;
  /** Time service to get the current dashboard range from */
  timeSrv: { timeRangeForUrl(): RawTimeRange };
}

export function generateExploreId() {
  return nanoid(3);
}

/**
 * Returns an Explore-URL that contains a panel's queries and the dashboard time range.
 */
export async function getExploreUrl(args: GetExploreUrlArguments): Promise<string | undefined> {
  const { panel, datasourceSrv, timeSrv } = args;
  let exploreDatasource = await datasourceSrv.get(panel.datasource);

  /** In Explore, we don't have legend formatter and we don't want to keep
   * legend formatting as we can't change it
   *
   * We also don't have expressions, so filter those out
   */
  let exploreTargets: DataQuery[] = (panel.targets || [])
    .map((t) => omit(t, 'legendFormat'))
    .filter((t) => t.datasource?.uid !== ExpressionDatasourceUID);
  let url: string | undefined;

  if (exploreDatasource) {
    const range = timeSrv.timeRangeForUrl();
    let state: Partial<ExploreUrlState> = { range };
    if (exploreDatasource.interpolateVariablesInQueries) {
      const scopedVars = panel.scopedVars || {};
      state = {
        ...state,
        datasource: exploreDatasource.uid,
        queries: exploreDatasource.interpolateVariablesInQueries(exploreTargets, scopedVars),
      };
    } else {
      state = {
        ...state,
        datasource: exploreDatasource.uid,
        queries: exploreTargets,
      };
    }

    const exploreState = JSON.stringify({ [generateExploreId()]: state });
    url = urlUtil.renderUrl('/explore', { panes: exploreState, schemaVersion: 1 });
  }

  return url;
}
