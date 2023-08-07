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

export interface QueryHistorySrv {
  addToRichHistory(
    datasourceUid: string,
    datasourceName: string | null,
    queries: DataQuery[],
    starred: boolean,
    comment: string | null,
    showQuotaExceededError: boolean,
    showLimitExceededWarning: boolean
  ): Promise<{ richHistoryStorageFull?: boolean; limitExceeded?: boolean }>;
  deleteAllFromRichHistory(): Promise<void>;
  deleteQueryInRichHistory(id: string): Promise<string | undefined>;
  getRichHistory(filters: RichHistorySearchFilters): Promise<RichHistoryResults>;
  updateRichHistorySettings(settings: RichHistorySettings): Promise<void>;
  getRichHistorySettings(): Promise<RichHistorySettings>;
  deleteAllFromRichHistory(): Promise<void>;
  updateCommentInRichHistory(id: string, newComment: string | undefined): Promise<RichHistoryQuery | undefined>;
  updateStarredInRichHistory(id: string, starred: boolean): Promise<RichHistoryQuery | undefined>;
  deleteQueryInRichHistory(id: string): Promise<string | void>;
  createUrlFromRichHistory(query: RichHistoryQuery): string;
  mapNumbertoTimeInSlider(num: number): string;
  getQueryDisplayText(query: DataQuery): string;
  createQueryText(query: DataQuery, dsApi?: DataSourceApi): string;
  createDatasourcesList(): Array<{ name: string; uid: string }>;
  mapQueriesToHeadings(query: RichHistoryQuery[], sortOrder: SortOrder): Record<string, RichHistoryQuery[]>;
  supportedFeatures(): RichHistorySupportedFeatures;
}

let singletonInstance: QueryHistorySrv;

export function setQueryHistorySrv(instance: QueryHistorySrv) {
  singletonInstance = instance;
}

export function getQueryHistorySrv(): QueryHistorySrv {
  return singletonInstance;
}
