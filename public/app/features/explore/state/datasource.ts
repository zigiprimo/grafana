// Libraries
import { AnyAction, createAction } from '@reduxjs/toolkit';

import { DataSourceApi, HistoryItem } from '@grafana/data';
import { reportInteraction, getCorrelationsSrv, getMiscSrv } from '@grafana/runtime';
import { DataSourceRef } from '@grafana/schema';
import { RefreshPicker } from '@grafana/ui';
import { ExploreThunkResult } from 'app/features/explore/state/store';
import { stopQueryState } from 'app/features/explore/utils';

import { ExploreItemState } from '../types';
import { loadSupplementaryQueries } from '../utils/supplementaryQueries';

import { saveCorrelationsAction } from './explorePane';
import { importQueries, runQueries } from './query';
import { changeRefreshInterval } from './time';
import { createEmptyQueryResponse, getDatasourceUIDs, loadAndInitDatasource } from './utils';

//
// Actions and Payloads
//

/**
 * Updates datasource instance before datasource loading has started
 */
export interface UpdateDatasourceInstancePayload {
  exploreId: string;
  datasourceInstance: DataSourceApi;
  history: HistoryItem[];
}
export const updateDatasourceInstanceAction = createAction<UpdateDatasourceInstancePayload>(
  'explore/updateDatasourceInstance'
);

//
// Action creators
//

/**
 * Loads a new datasource identified by the given name.
 */
export function changeDatasource(
  exploreId: string,
  datasource: string | DataSourceRef,
  options?: { importQueries: boolean }
): ExploreThunkResult<Promise<void>> {
  return async (dispatch, getState) => {
    const orgId = getMiscSrv().getUserOrgId();
    const { history, instance } = await loadAndInitDatasource(orgId, datasource);
    const currentDataSourceInstance = getState().panes[exploreId]!.datasourceInstance;

    reportInteraction('explore_change_ds', {
      from: (currentDataSourceInstance?.meta?.mixed ? 'mixed' : currentDataSourceInstance?.type) || 'unknown',
      to: instance.meta.mixed ? 'mixed' : instance.type,
      exploreId,
    });
    dispatch(
      updateDatasourceInstanceAction({
        exploreId,
        datasourceInstance: instance,
        history,
      })
    );

    const queries = getState().panes[exploreId]!.queries;

    const datasourceUIDs = getDatasourceUIDs(instance.uid, queries);
    const correlations = await getCorrelationsSrv().getCorrelationsBySourceUIDs(datasourceUIDs);
    dispatch(saveCorrelationsAction({ exploreId: exploreId, correlations: correlations.correlations || [] }));

    if (options?.importQueries) {
      await dispatch(importQueries(exploreId, queries, currentDataSourceInstance, instance));
    }

    if (getState().panes[exploreId]!.isLive) {
      dispatch(changeRefreshInterval({ exploreId, refreshInterval: RefreshPicker.offOption.value }));
    }

    // Exception - we only want to run queries on data source change, if the queries were imported
    if (options?.importQueries) {
      dispatch(runQueries({ exploreId }));
    }
  };
}

//
// Reducer
//

/**
 * Reducer for an Explore area, to be used by the global Explore reducer.
 */
// Redux Toolkit uses ImmerJs as part of their solution to ensure that state objects are not mutated.
// ImmerJs has an autoFreeze option that freezes objects from change which means this reducer can't be migrated to createSlice
// because the state would become frozen and during run time we would get errors because flot (Graph lib) would try to mutate
// the frozen state.
// https://github.com/reduxjs/redux-toolkit/issues/242
export const datasourceReducer = (state: ExploreItemState, action: AnyAction): ExploreItemState => {
  if (updateDatasourceInstanceAction.match(action)) {
    const { datasourceInstance, history } = action.payload;

    // Custom components
    stopQueryState(state.querySubscription);

    return {
      ...state,
      datasourceInstance,
      graphResult: null,
      tableResult: null,
      logsResult: null,
      supplementaryQueries: loadSupplementaryQueries(),
      queryResponse: createEmptyQueryResponse(),
      queryKeys: [],
      queries: state.queries.map((q) => {
        return {
          ...q,
          datasource: datasourceInstance.getRef(),
        };
      }),
      history,
    };
  }

  return state;
};
