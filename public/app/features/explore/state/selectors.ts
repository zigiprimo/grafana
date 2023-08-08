import { createSelector } from '@reduxjs/toolkit';

import { ExploreItemState, ExploreState } from '../types';

export const selectPanes = (state: ExploreState) => state.panes;

export const selectPanesEntries = createSelector<
  [(state: ExploreState) => Record<string, ExploreItemState | undefined>],
  Array<[string, ExploreItemState]>
>(selectPanes, Object.entries);

export const isSplit = createSelector(selectPanesEntries, (panes) => panes.length > 1);

export const getExploreItemSelector = (exploreId: string) => createSelector(selectPanes, (panes) => panes[exploreId]);
