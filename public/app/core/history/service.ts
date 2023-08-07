import {
  DataQuery,
  DataSourceApi,
  RichHistoryQuery,
  RichHistoryResults,
  RichHistorySearchFilters,
  RichHistorySettings,
  RichHistorySupportedFeatures,
  SortOrder,
} from '@grafana/data';
import { QueryHistorySrv } from '@grafana/runtime';

import {
  addToRichHistory as _addToRichHistory,
  createDatasourcesList as _createDatasourcesList,
  createQueryText as _createQueryText,
  createUrlFromRichHistory as _createUrlFromRichHistory,
  deleteAllFromRichHistory as _deleteAllFromRichHistory,
  deleteQueryInRichHistory as _deleteQueryInRichHistory,
  getQueryDisplayText as _getQueryDisplayText,
  getRichHistory as _getRichHistory,
  getRichHistorySettings as _getRichHistorySettings,
  mapNumbertoTimeInSlider as _mapNumbertoTimeInSlider,
  mapQueriesToHeadings as _mapQueriesToHeadings,
  updateCommentInRichHistory as _updateCommentInRichHistory,
  updateRichHistorySettings as _updateRichHistorySettings,
  updateStarredInRichHistory as _updateStarredInRichHistory,
} from '../utils/richHistory';

import { MAX_HISTORY_ITEMS } from './RichHistoryLocalStorage';
import { supportedFeatures as _supportedFeatures } from './richHistoryStorageProvider';

export class QueryHistoryService implements QueryHistorySrv {
  addToRichHistory(
    datasourceUid: string,
    datasourceName: string | null,
    queries: DataQuery[],
    starred: boolean,
    comment: string | null,
    showQuotaExceededError: boolean,
    showLimitExceededWarning: boolean
  ): Promise<{ richHistoryStorageFull?: boolean; limitExceeded?: boolean }> {
    return _addToRichHistory(
      datasourceUid,
      datasourceName,
      queries,
      starred,
      comment,
      showQuotaExceededError,
      showLimitExceededWarning
    );
  }

  createDatasourcesList(): Array<{ name: string; uid: string }> {
    return _createDatasourcesList();
  }

  createQueryText(query: DataQuery, dsApi?: DataSourceApi): string {
    return _createQueryText(query, dsApi);
  }

  createUrlFromRichHistory(query: RichHistoryQuery): string {
    return _createUrlFromRichHistory(query);
  }

  deleteAllFromRichHistory(): Promise<void> {
    return _deleteAllFromRichHistory();
  }

  deleteQueryInRichHistory(id: string): Promise<string | undefined> {
    return _deleteQueryInRichHistory(id);
  }

  getQueryDisplayText(query: DataQuery): string {
    return _getQueryDisplayText(query);
  }

  getRichHistory(filters: RichHistorySearchFilters): Promise<RichHistoryResults> {
    return _getRichHistory(filters);
  }

  getRichHistorySettings(): Promise<RichHistorySettings> {
    return _getRichHistorySettings();
  }

  mapNumbertoTimeInSlider(num: number): string {
    return _mapNumbertoTimeInSlider(num);
  }

  mapQueriesToHeadings(query: RichHistoryQuery[], sortOrder: SortOrder): Record<string, RichHistoryQuery[]> {
    return _mapQueriesToHeadings(query, sortOrder);
  }

  updateCommentInRichHistory(id: string, newComment: string | undefined): Promise<RichHistoryQuery | undefined> {
    return _updateCommentInRichHistory(id, newComment);
  }

  updateRichHistorySettings(settings: RichHistorySettings): Promise<void> {
    return _updateRichHistorySettings(settings);
  }

  updateStarredInRichHistory(id: string, starred: boolean): Promise<RichHistoryQuery | undefined> {
    return _updateStarredInRichHistory(id, starred);
  }

  supportedFeatures(): RichHistorySupportedFeatures {
    return _supportedFeatures();
  }

  getMaxHistoryItems(): number {
    return MAX_HISTORY_ITEMS;
  }
}

export const queryHistoryService = new QueryHistoryService();
