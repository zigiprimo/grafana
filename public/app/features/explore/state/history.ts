import { AnyAction, createAction } from '@reduxjs/toolkit';

import { HistoryItem, RichHistoryQuery, RichHistorySearchFilters, RichHistorySettings } from '@grafana/data';
import { getQueryHistorySrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { ExploreThunkResult } from 'app/features/explore/state/store';

import { ExploreItemState, ExploreState } from '../types';

import {
  richHistoryLimitExceededAction,
  richHistorySearchFiltersUpdatedAction,
  richHistorySettingsUpdatedAction,
  richHistoryStorageFullAction,
  richHistoryUpdatedAction,
} from './main';
import { selectPanesEntries } from './selectors';

//
// Actions and Payloads
//

export interface HistoryUpdatedPayload {
  exploreId: string;
  history: HistoryItem[];
}
export const historyUpdatedAction = createAction<HistoryUpdatedPayload>('explore/historyUpdated');

//
// Action creators
//

type SyncHistoryUpdatesOptions = {
  updatedQuery?: RichHistoryQuery;
  deletedId?: string;
};

/**
 * Updates current state in both Explore panes after changing or deleting a query history item
 */
const updateRichHistoryState = ({ updatedQuery, deletedId }: SyncHistoryUpdatesOptions): ExploreThunkResult<void> => {
  return async (dispatch, getState) => {
    forEachExplorePane(getState(), (item, exploreId) => {
      const newRichHistory = item.richHistory
        // update
        .map((query) => (query.id === updatedQuery?.id ? updatedQuery : query))
        // or remove
        .filter((query) => query.id !== deletedId);
      const deletedItems = item.richHistory.length - newRichHistory.length;
      dispatch(
        richHistoryUpdatedAction({
          richHistoryResults: { richHistory: newRichHistory, total: item.richHistoryTotal! - deletedItems },
          exploreId,
        })
      );
    });
  };
};

const forEachExplorePane = (state: ExploreState, callback: (item: ExploreItemState, exploreId: string) => void) => {
  Object.entries(state.panes).forEach(([exploreId, item]) => {
    item && callback(item, exploreId);
  });
};

export const addHistoryItem = (
  datasourceUid: string,
  datasourceName: string,
  queries: DataQuery[]
): ExploreThunkResult<void> => {
  return async (dispatch, getState) => {
    const { richHistoryStorageFull, limitExceeded } = await getQueryHistorySrv().addToRichHistory(
      datasourceUid,
      datasourceName,
      queries,
      false,
      '',
      !getState().richHistoryStorageFull,
      !getState().richHistoryLimitExceededWarningShown
    );
    if (richHistoryStorageFull) {
      dispatch(richHistoryStorageFullAction());
    }
    if (limitExceeded) {
      dispatch(richHistoryLimitExceededAction());
    }
  };
};

export const starHistoryItem = (id: string, starred: boolean): ExploreThunkResult<void> => {
  return async (dispatch) => {
    const updatedQuery = await getQueryHistorySrv().updateStarredInRichHistory(id, starred);
    dispatch(updateRichHistoryState({ updatedQuery }));
  };
};

export const commentHistoryItem = (id: string, comment?: string): ExploreThunkResult<void> => {
  return async (dispatch) => {
    const updatedQuery = await getQueryHistorySrv().updateCommentInRichHistory(id, comment);
    dispatch(updateRichHistoryState({ updatedQuery }));
  };
};

export const deleteHistoryItem = (id: string): ExploreThunkResult<void> => {
  return async (dispatch) => {
    const deletedId = await getQueryHistorySrv().deleteQueryInRichHistory(id);
    dispatch(updateRichHistoryState({ deletedId }));
  };
};

export const deleteRichHistory = (): ExploreThunkResult<void> => {
  return async (dispatch, getState) => {
    await getQueryHistorySrv().deleteAllFromRichHistory();
    selectPanesEntries(getState()).forEach(([exploreId]) => {
      dispatch(richHistoryUpdatedAction({ richHistoryResults: { richHistory: [], total: 0 }, exploreId }));
      dispatch(richHistoryUpdatedAction({ richHistoryResults: { richHistory: [], total: 0 }, exploreId }));
    });
  };
};

export const loadRichHistory = (exploreId: string): ExploreThunkResult<void> => {
  return async (dispatch, getState) => {
    const filters = getState().panes[exploreId]!.richHistorySearchFilters;
    if (filters) {
      const richHistoryResults = await getQueryHistorySrv().getRichHistory(filters);
      dispatch(richHistoryUpdatedAction({ richHistoryResults, exploreId }));
    }
  };
};

export const loadMoreRichHistory = (exploreId: string): ExploreThunkResult<void> => {
  return async (dispatch, getState) => {
    const currentFilters = getState().panes[exploreId]?.richHistorySearchFilters;
    const currentRichHistory = getState().panes[exploreId]?.richHistory;
    if (currentFilters && currentRichHistory) {
      const nextFilters = { ...currentFilters, page: (currentFilters?.page || 1) + 1 };
      const moreRichHistory = await getQueryHistorySrv().getRichHistory(nextFilters);
      const richHistory = [...currentRichHistory, ...moreRichHistory.richHistory];
      dispatch(richHistorySearchFiltersUpdatedAction({ filters: nextFilters, exploreId }));
      dispatch(
        richHistoryUpdatedAction({ richHistoryResults: { richHistory, total: moreRichHistory.total }, exploreId })
      );
    }
  };
};

export const clearRichHistoryResults = (exploreId: string): ExploreThunkResult<void> => {
  return async (dispatch) => {
    dispatch(richHistorySearchFiltersUpdatedAction({ filters: undefined, exploreId }));
    dispatch(richHistoryUpdatedAction({ richHistoryResults: { richHistory: [], total: 0 }, exploreId }));
  };
};

/**
 * Initialize query history pane. To load history it requires settings to be loaded first
 * (but only once per session). Filters are initialised by the tab (starred or home).
 */
export const initRichHistory = (): ExploreThunkResult<void> => {
  return async (dispatch, getState) => {
    let settings = getState().richHistorySettings;
    if (!settings) {
      settings = await getQueryHistorySrv().getRichHistorySettings();
      dispatch(richHistorySettingsUpdatedAction(settings));
    }
  };
};

export const updateHistorySettings = (settings: RichHistorySettings): ExploreThunkResult<void> => {
  return async (dispatch) => {
    dispatch(richHistorySettingsUpdatedAction(settings));
    await getQueryHistorySrv().updateRichHistorySettings(settings);
  };
};

/**
 * Assumed this can be called only when settings and filters are initialised
 */
export const updateHistorySearchFilters = (
  exploreId: string,
  filters: RichHistorySearchFilters
): ExploreThunkResult<void> => {
  return async (dispatch, getState) => {
    await dispatch(richHistorySearchFiltersUpdatedAction({ exploreId, filters: { ...filters } }));
    const currentSettings = getState().richHistorySettings!;
    if (getQueryHistorySrv().supportedFeatures().lastUsedDataSourcesAvailable) {
      await dispatch(
        updateHistorySettings({
          ...currentSettings,
          lastUsedDatasourceFilters: filters.datasourceFilters,
        })
      );
    }
  };
};

export const historyReducer = (state: ExploreItemState, action: AnyAction): ExploreItemState => {
  if (historyUpdatedAction.match(action)) {
    return {
      ...state,
      history: action.payload.history,
    };
  }
  return state;
};
