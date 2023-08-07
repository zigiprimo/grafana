import { DataQuery } from './query';

export enum SortOrder {
  Descending = 'Descending',
  Ascending = 'Ascending',
  /**
   * @deprecated supported only by local storage. It will be removed in the future
   */
  DatasourceAZ = 'Datasource A-Z',
  /**
   * @deprecated supported only by local storage. It will be removed in the future
   */
  DatasourceZA = 'Datasource Z-A',
}

export interface RichHistorySettings {
  retentionPeriod: number;
  starredTabAsFirstTab: boolean;
  activeDatasourceOnly: boolean;
  lastUsedDatasourceFilters?: string[];
}

export type RichHistorySearchFilters = {
  search: string;
  sortOrder: SortOrder;
  /** Names of data sources (not uids) - used by local and remote storage **/
  datasourceFilters: string[];
  from: number;
  to: number;
  starred: boolean;
  page?: number;
};

export type RichHistoryQuery<T extends DataQuery = DataQuery> = {
  id: string;
  createdAt: number;
  datasourceUid: string;
  datasourceName: string;
  starred: boolean;
  comment: string;
  queries: T[];
};

export type RichHistoryResults = { richHistory: RichHistoryQuery[]; total?: number };

export interface RichHistorySupportedFeatures {
  availableFilters: SortOrder[];
  lastUsedDataSourcesAvailable: boolean;
  clearHistory: boolean;
  onlyActiveDataSource: boolean;
  changeRetention: boolean;
  queryHistoryAvailable: boolean;
}
