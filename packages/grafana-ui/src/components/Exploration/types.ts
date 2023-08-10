// State of a single pane, no actions provided here
import { Observable, SubscriptionLike, Unsubscribable } from 'rxjs';

import {
  AbsoluteTimeRange,
  CorrelationData,
  DataFrame,
  DataQuery,
  DataQueryResponse,
  DataSourceApi,
  EventBusExtended,
  ExplorePanelsState,
  HistoryItem,
  LoadingState,
  LogsModel,
  PanelData,
  RawTimeRange,
  RichHistoryQuery,
  RichHistorySearchFilters,
  SplitOpenOptions,
  SupplementaryQueryType,
  TimeRange,
} from '@grafana/data';

interface SupplementaryQuery {
  enabled: boolean;
  dataProvider?: Observable<DataQueryResponse>;
  dataSubscription?: SubscriptionLike;
  data?: DataQueryResponse;
}

type SupplementaryQueries = {
  [key in SupplementaryQueryType]: SupplementaryQuery;
};

interface DataSourceRef {
  /**
   * The plugin type-id
   */
  type?: string;
  /**
   * Specific datasource instance
   */
  uid?: string;
}

interface ExplorePanelData extends PanelData {
  graphFrames: DataFrame[];
  tableFrames: DataFrame[];
  logsFrames: DataFrame[];
  traceFrames: DataFrame[];
  customFrames: DataFrame[];
  nodeGraphFrames: DataFrame[];
  rawPrometheusFrames: DataFrame[];
  flameGraphFrames: DataFrame[];
  graphResult: DataFrame[] | null;
  tableResult: DataFrame[] | null;
  logsResult: LogsModel | null;
  rawPrometheusResult: DataFrame | null;
}

export interface ExplorationPane {
  available: boolean;
  actions: Exploration;

  /*** DERIVED ***/
  exploreId: string;
  loading: boolean;
  loadingState: LoadingState;
  syncedTimes: boolean;

  /*** FROM EXPLORE ITEM *****/
  /**
   * Width used for calculating the graph interval (can't have more datapoints than pixels)
   */
  containerWidth: number;
  /**
   * Datasource instance that has been selected. Datasource-specific logic can be run on this object.
   */
  datasourceInstance?: DataSourceApi | null;
  /**
   * Emitter to send events to the rest of Grafana.
   */
  eventBridge: EventBusExtended;
  /**
   * List of timeseries to be shown in the Explore graph result viewer.
   */
  graphResult: DataFrame[] | null;
  /**
   * History of recent queries. Datasource-specific and initialized via localStorage.
   */
  history: HistoryItem[];
  /**
   * Queries for this Explore, e.g., set via URL. Each query will be
   * converted to a query row.
   */
  queries: DataQuery[];
  /**
   * True if this Explore area has been initialized.
   * Used to distinguish URL state injection versus split view state injection.
   */
  initialized: boolean;
  /**
   * Log query result to be displayed in the logs result viewer.
   */
  logsResult: LogsModel | null;

  /**
   * Time range for this Explore. Managed by the time picker and used by all query runs.
   */
  range: TimeRange;

  absoluteRange: AbsoluteTimeRange;
  /**
   * True if scanning for more results is active.
   */
  scanning: boolean;
  /**
   * Current scanning range to be shown to the user while scanning is active.
   */
  scanRange?: RawTimeRange;

  /**
   * Table model that combines all query table results into a single table.
   */
  tableResult: DataFrame[] | null;

  /**
   * Simple UI that emulates native prometheus UI
   */
  rawPrometheusResult: DataFrame | null;

  /**
   * React keys for rendering of QueryRows
   */
  queryKeys: string[];

  /**
   * How often query should be refreshed
   */
  refreshInterval?: string;

  /**
   * If true, the view is in live tailing mode.
   */
  isLive: boolean;

  /**
   * If true, the live tailing view is paused.
   */
  isPaused: boolean;

  /**
   * Index of the last item in the list of logs
   * when the live tailing views gets cleared.
   */
  clearedAtIndex: number | null;

  querySubscription?: Unsubscribable;

  queryResponse: ExplorePanelData;

  showLogs?: boolean;
  showMetrics?: boolean;
  showTable?: boolean;
  /**
   * If true, the default "raw" prometheus instant query UI will be displayed in addition to table view
   */
  showRawPrometheus?: boolean;
  showTrace?: boolean;
  showNodeGraph?: boolean;
  showFlameGraph?: boolean;
  showCustom?: boolean;

  /**
   * History of all queries
   */
  richHistory: RichHistoryQuery[];
  richHistorySearchFilters?: RichHistorySearchFilters;
  richHistoryTotal?: number;

  /**
   * We are using caching to store query responses of queries run from logs navigation.
   * In logs navigation, we do pagination and we don't want our users to unnecessarily run the same queries that they've run just moments before.
   * We are currently caching last 5 query responses.
   */
  cache: Array<{ key: string; value: ExplorePanelData }>;

  /**
   * Supplementary queries are additional queries used in Explore, e.g. for logs volume
   */
  supplementaryQueries: SupplementaryQueries;

  panelsState: ExplorePanelsState;

  correlations?: CorrelationData[];
  /********/
}

// list of panes and available actions
export interface Exploration {
  available: boolean;
  panes: ExplorationPane[];

  setOnChange(callback: (value: Exploration) => void): void;

  init: () => void;
  destroy: () => void;

  runQueries(paneId: string): void;
  changeQueries(paneId: string, queries: DataQuery[]): void;
  changeDatasource(exploreId: string, datasource: string | DataSourceRef, options?: { importQueries: boolean }): void;

  updateTimeRange(options: { exploreId: string; rawRange?: RawTimeRange; absoluteRange?: AbsoluteTimeRange }): void;

  addResultsToCache(paneId: string): void;

  clearCache(paneId: string): void;

  loadSupplementaryQueryData(paneId: string, type: SupplementaryQueryType): void;
  setSupplementaryQueryEnabled(exploreId: string, enabled: boolean, type: SupplementaryQueryType): void;

  onClickFilterLabel(paneId: string, key: string, value: string): void;
  onClickFilterOutLabel(paneId: string, key: string, value: string): void;
  onStartScanning(paneId: string): void;
  onStopScanning(paneId: string): void;
  isFilterLabelActive(paneId: string, key: string, value: string): Promise<boolean>;
  onSplitOpen(options?: SplitOpenOptions): void;

  createNewPane: () => void;
}
