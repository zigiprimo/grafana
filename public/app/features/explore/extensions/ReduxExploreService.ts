import deepEqual from 'fast-deep-equal';
import { Store, Unsubscribe } from 'redux';

import {
  AbsoluteTimeRange,
  hasToggleableQueryFiltersSupport,
  QueryFixAction,
  RawTimeRange,
  SplitOpenOptions,
  SupplementaryQueryType,
} from '@grafana/data';
import { config, getDataSourceSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema/dist/esm/veneer/common.types';
import { Exploration, ExplorationPane } from '@grafana/ui';

import { exploreReducer, initialExploreState, splitOpen } from '../state/main';
import {
  addResultsToCache,
  clearCache,
  loadSupplementaryQueryData,
  modifyQueries,
  scanStart,
  scanStopAction,
  selectIsWaitingForData,
  setSupplementaryQueryEnabled,
} from '../state/query';
import { configureExploreStore } from '../state/store';
import { updateTimeRange } from '../state/time';
import { ExploreState } from '../types';

export class ReduxExploreService implements Exploration {
  private readonly store: Store<ExploreState>;
  private onChange: (value: Exploration) => void = () => {};
  private unsub?: Unsubscribe;

  available = true;

  panes: ExplorationPane[] = [];

  constructor() {
    this.store = configureExploreStore(exploreReducer, initialExploreState);
  }

  createNewPane() {
    // @ts-ignore
    this.store.dispatch(splitOpen());
  }

  updateTimeRange(options: { exploreId: string; rawRange?: RawTimeRange; absoluteRange?: AbsoluteTimeRange }) {
    // @ts-ignore
    this.store.dispatch(updateTimeRange(options));
  }

  init() {
    this.unsub = this.store.subscribe(() => {
      const exploreState: ExploreState = this.store.getState();
      const panes = Object.keys(exploreState.panes).map((paneId) => {
        const paneState = exploreState.panes[paneId]!;
        const pane: ExplorationPane = {
          available: true,
          actions: this,
          exploreId: paneId,
          loading: selectIsWaitingForData(paneId)(exploreState),
          loadingState: paneState.queryResponse.state,
          syncedTimes: exploreState.syncedTimes,
          ...paneState,
        };
        return pane;
      });
      if (!deepEqual(panes, this.panes)) {
        this.panes = [...panes];
        this.onChange(this);
      }
    });
  }

  destroy() {
    this.unsub?.();
  }

  getStore(): Store<ExploreState> {
    return this.store;
  }

  addResultsToCache(paneId: string): void {
    // @ts-ignore
    this.store.dispatch(addResultsToCache(paneId));
  }

  clearCache(paneId: string): void {
    // @ts-ignore
    this.store.dispatch(clearCache(paneId));
  }

  loadSupplementaryQueryData(paneId: string, type: SupplementaryQueryType): void {
    // @ts-ignore
    this.store.dispatch(loadSupplementaryQueryData(paneId, type));
  }

  setSupplementaryQueryEnabled(paneId: string, enabled: boolean, type: SupplementaryQueryType): void {
    // @ts-ignore
    this.store.dispatch(setSupplementaryQueryEnabled(paneId, enabled, type));
  }

  onClickFilterLabel(paneId: string, key: string, value: string): void {
    this.onModifyQueries(paneId, { type: 'ADD_FILTER', options: { key, value } });
  }

  onClickFilterOutLabel(paneId: string, key: string, value: string): void {
    this.onModifyQueries(paneId, { type: 'ADD_FILTER_OUT', options: { key, value } });
  }

  onStartScanning(paneId: string): void {
    // @ts-ignore
    this.store.dispatch(scanStart(paneId));
  }
  onStopScanning(paneId: string): void {
    // @ts-ignore
    this.store.dispatch(scanStopAction(paneId));
  }

  async isFilterLabelActive(paneId: string, key: string, value: string) {
    if (!config.featureToggles.toggleLabelsInLogsUI) {
      return false;
    }
    if (this.store.getState().panes[paneId]?.queries?.length === 0) {
      return false;
    }
    for (const query of this.store.getState().panes[paneId]!.queries) {
      const ds = await getDataSourceSrv().get(query.datasource);
      if (!hasToggleableQueryFiltersSupport(ds)) {
        return false;
      }
      if (!ds.queryHasFilter(query, { key, value })) {
        return false;
      }
    }
    return true;
  }

  onSplitOpen(options?: SplitOpenOptions) {
    // @ts-ignore
    this.store.dispatch(splitOpen(options));
  }

  private onModifyQueries(paneId: string, action: QueryFixAction) {
    const modifier = async (query: DataQuery, modification: QueryFixAction) => {
      const { datasource } = query;
      if (datasource == null) {
        return query;
      }
      const ds = await getDataSourceSrv().get(datasource);
      if (hasToggleableQueryFiltersSupport(ds) && config.featureToggles.toggleLabelsInLogsUI) {
        return ds.toggleQueryFilter(query, {
          type: modification.type === 'ADD_FILTER' ? 'FILTER_FOR' : 'FILTER_OUT',
          options: modification.options ?? {},
        });
      }
      if (ds.modifyQuery) {
        return ds.modifyQuery(query, modification);
      } else {
        return query;
      }
    };
    // @ts-ignore
    this.store.dispatch(modifyQueries(paneId, action, modifier));
  }

  setOnChange(callback: (value: Exploration) => void): void {
    this.onChange = callback;
  }
}
