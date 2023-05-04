import { createSlice } from '@reduxjs/toolkit';

import { endpoints } from '../api/browseDashboardsAPI';
import { BrowseDashboardsState } from '../types';

import * as allReducers from './reducers';

const { extraReducerFetchChildrenFulfilled, ...baseReducers } = allReducers;

const initialState: BrowseDashboardsState = {
  rootItems: undefined,
  childrenByParentUID: {},
  openFolders: {},
  selectedItems: {
    dashboard: {},
    folder: {},
    panel: {},
    $all: false,
  },
};

const browseDashboardsSlice = createSlice({
  name: 'browseDashboards',
  initialState,
  reducers: baseReducers,

  extraReducers: (builder) => {
    // builder.addCase(fetchChildren.fulfilled, extraReducerFetchChildrenFulfilled);
    builder.addMatcher(endpoints.getFolderChildren.matchFulfilled, extraReducerFetchChildrenFulfilled);
  },
});

export const browseDashboardsReducer = browseDashboardsSlice.reducer;

export const { setFolderOpenState, setItemSelectionState, setAllSelection } = browseDashboardsSlice.actions;

export default {
  browseDashboards: browseDashboardsReducer,
};
