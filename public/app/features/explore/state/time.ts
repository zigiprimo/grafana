import { AnyAction, createAction } from '@reduxjs/toolkit';

import {
  AbsoluteTimeRange,
  dateTimeForTimeZone,
  LoadingState,
  RawTimeRange,
  TimeRange,
  getTimeZone,
} from '@grafana/data';
import { getMiscSrv, getTemplateSrv } from '@grafana/runtime';
import { RefreshPicker } from '@grafana/ui';
import { ExploreThunkResult } from 'app/features/explore/state/store';
import { getTimeRange, stopQueryState } from 'app/features/explore/utils';

import { ExploreItemState } from '../types';

import { syncTimesAction } from './main';
import { runQueries } from './query';

//
// Actions and Payloads
//

export interface ChangeRangePayload {
  exploreId: string;
  range: TimeRange;
  absoluteRange: AbsoluteTimeRange;
}
export const changeRangeAction = createAction<ChangeRangePayload>('explore/changeRange');

/**
 * Change the time range of Explore. Usually called from the Timepicker or a graph interaction.
 */
export interface ChangeRefreshIntervalPayload {
  exploreId: string;
  refreshInterval: string;
}
export const changeRefreshInterval = createAction<ChangeRefreshIntervalPayload>('explore/changeRefreshInterval');

export const updateTimeRange = (options: {
  exploreId: string;
  rawRange?: RawTimeRange;
  absoluteRange?: AbsoluteTimeRange;
}): ExploreThunkResult<void> => {
  return (dispatch, getState) => {
    const { syncedTimes } = getState();
    if (syncedTimes) {
      Object.keys(getState().panes).forEach((exploreId) => {
        dispatch(updateTime({ ...options, exploreId }));
        dispatch(runQueries({ exploreId: exploreId, preserveCache: true }));
      });
    } else {
      dispatch(updateTime({ ...options }));
      dispatch(runQueries({ exploreId: options.exploreId, preserveCache: true }));
    }
  };
};

export const updateTime = (config: {
  exploreId: string;
  rawRange?: RawTimeRange;
  absoluteRange?: AbsoluteTimeRange;
}): ExploreThunkResult<void> => {
  return (dispatch, getState) => {
    const { exploreId, absoluteRange: absRange, rawRange: actionRange } = config;
    const itemState = getState().panes[exploreId]!;
    const timeZone = getTimeZone();
    const fiscalYearStartMonth = getMiscSrv().getUserFiscalYearStartMonth();
    const { range: rangeInState } = itemState;
    let rawRange: RawTimeRange = rangeInState.raw;

    if (absRange) {
      rawRange = {
        from: dateTimeForTimeZone(timeZone, absRange.from),
        to: dateTimeForTimeZone(timeZone, absRange.to),
      };
    }

    if (actionRange) {
      rawRange = actionRange;
    }

    const range = getTimeRange(timeZone, rawRange, fiscalYearStartMonth);
    const absoluteRange: AbsoluteTimeRange = { from: range.from.valueOf(), to: range.to.valueOf() };

    // We need to re-initialize TimeSrv because it might have been triggered by the other Explore pane (when split)
    // After re-initializing TimeSrv we need to update the time range in Template service for interpolation
    // of __from and __to variables
    getTemplateSrv().updateTimeRange(range);

    dispatch(changeRangeAction({ exploreId, range, absoluteRange }));
  };
};

/**
 * Syncs time interval, if they are not synced on both panels in a split mode.
 * Unsyncs time interval, if they are synced on both panels in a split mode.
 */
export function syncTimes(exploreId: string): ExploreThunkResult<void> {
  return (dispatch, getState) => {
    const range = getState().panes[exploreId]!.range.raw;

    Object.keys(getState().panes)
      .filter((key) => key !== exploreId)
      .forEach((exploreId) => {
        dispatch(updateTimeRange({ exploreId, rawRange: range }));
      });

    const isTimeSynced = getState().syncedTimes;
    dispatch(syncTimesAction({ syncedTimes: !isTimeSynced }));
  };
}

/**
 * Forces the timepicker's time into absolute time.
 * The conversion is applied to all Explore panes.
 * Useful to produce a bookmarkable URL that points to the same data.
 */
export function makeAbsoluteTime(): ExploreThunkResult<void> {
  return (dispatch, getState) => {
    const timeZone = getTimeZone();
    const fiscalYearStartMonth = getMiscSrv().getUserFiscalYearStartMonth();

    Object.entries(getState().panes).forEach(([exploreId, exploreItemState]) => {
      const range = getTimeRange(timeZone, exploreItemState!.range.raw, fiscalYearStartMonth);
      const absoluteRange: AbsoluteTimeRange = { from: range.from.valueOf(), to: range.to.valueOf() };
      dispatch(updateTime({ exploreId, absoluteRange }));
    });
  };
}

/**
 * Reducer for an Explore area, to be used by the global Explore reducer.
 */
// Redux Toolkit uses ImmerJs as part of their solution to ensure that state objects are not mutated.
// ImmerJs has an autoFreeze option that freezes objects from change which means this reducer can't be migrated to createSlice
// because the state would become frozen and during run time we would get errors because flot (Graph lib) would try to mutate
// the frozen state.
// https://github.com/reduxjs/redux-toolkit/issues/242
export const timeReducer = (state: ExploreItemState, action: AnyAction): ExploreItemState => {
  if (changeRefreshInterval.match(action)) {
    const { refreshInterval } = action.payload;
    const live = RefreshPicker.isLive(refreshInterval);
    const logsResult = state.logsResult;

    if (RefreshPicker.isLive(state.refreshInterval) && !live) {
      stopQueryState(state.querySubscription);
    }

    return {
      ...state,
      refreshInterval,
      queryResponse: {
        ...state.queryResponse,
        state: live ? LoadingState.Streaming : LoadingState.Done,
      },
      isLive: live,
      isPaused: live ? false : state.isPaused,
      logsResult,
    };
  }

  if (changeRangeAction.match(action)) {
    const { range, absoluteRange } = action.payload;
    return {
      ...state,
      range,
      absoluteRange,
    };
  }

  return state;
};
