import React, { PureComponent } from 'react';

import {
  AbsoluteTimeRange,
  Field,
  hasLogsContextSupport,
  hasLogsContextUiSupport,
  LogRowModel,
  DataFrame,
  SupplementaryQueryType,
  DataQueryResponse,
  LogRowContextOptions,
  DataSourceWithLogsContextSupport,
  DataSourceApi,
  getTimeZone,
  EventBusSrv,
} from '@grafana/data';
import { DataQuery } from '@grafana/schema';
import { Alert, Collapse, ExplorationPane, ExplorationPaneContext } from '@grafana/ui';

import { Logs } from './Logs';
import { LogsCrossFadeTransition } from './utils/LogsCrossFadeTransition';

interface LogsContainerProps {
  width: number;
}

class LogsContainer extends PureComponent<LogsContainerProps> {
  declare context: React.ContextType<typeof ExplorationPaneContext>;
  static contextType = ExplorationPaneContext;

  onChangeTime = (absoluteRange: AbsoluteTimeRange) => {
    const { exploreId, actions } = this.getContext();
    actions.updateTimeRange({ exploreId, absoluteRange });
  };

  private getQuery(
    logsQueries: DataQuery[] | undefined,
    row: LogRowModel,
    datasourceInstance: DataSourceApi<DataQuery> & DataSourceWithLogsContextSupport<DataQuery>
  ) {
    // we need to find the query, and we need to be very sure that it's a query
    // from this datasource
    return (logsQueries ?? []).find(
      (q) => q.refId === row.dataFrame.refId && q.datasource != null && q.datasource.type === datasourceInstance.type
    );
  }

  getLogRowContext = async (
    row: LogRowModel,
    origRow: LogRowModel,
    options: LogRowContextOptions
  ): Promise<DataQueryResponse | []> => {
    const { datasourceInstance, logsQueries } = this.getContext();

    if (hasLogsContextSupport(datasourceInstance)) {
      const query = this.getQuery(logsQueries, origRow, datasourceInstance);
      return datasourceInstance.getLogRowContext(row, options, query);
    }

    return [];
  };

  getLogRowContextQuery = async (row: LogRowModel, options?: LogRowContextOptions): Promise<DataQuery | null> => {
    const { datasourceInstance, logsQueries } = this.getContext();

    if (hasLogsContextSupport(datasourceInstance) && datasourceInstance.getLogRowContextQuery) {
      const query = this.getQuery(logsQueries, row, datasourceInstance);
      return datasourceInstance.getLogRowContextQuery(row, options, query);
    }

    return null;
  };

  getLogRowContextUi = (row: LogRowModel, runContextQuery?: () => void): React.ReactNode => {
    const { datasourceInstance, logsQueries } = this.getContext();

    if (hasLogsContextUiSupport(datasourceInstance) && datasourceInstance.getLogRowContextUi) {
      const query = this.getQuery(logsQueries, row, datasourceInstance);
      return datasourceInstance.getLogRowContextUi(row, runContextQuery, query);
    }

    return <></>;
  };

  showContextToggle = (row?: LogRowModel): boolean => {
    const { datasourceInstance } = this.getContext();

    if (hasLogsContextSupport(datasourceInstance)) {
      return datasourceInstance.showContextToggle(row);
    }

    return false;
  };

  getFieldLinks = (field: Field, rowIndex: number, dataFrame: DataFrame) => {
    // const { range, actions } = this.getContext();
    return field.getLinks
      ? field.getLinks({
          valueRowIndex: rowIndex,
        })
      : [];
    // @ts-ignore
    // return getFieldLinksForExplore({ field, rowIndex, onSplitOpenFn: actions.onSplitOpen.bind(actions), range, dataFrame });
  };

  private getContext() {
    // @ts-ignore
    const context: ExplorationPane = this.context;
    return {
      ...context,
      logRows: context.logsResult?.rows,
      logsMeta: context.logsResult?.meta,
      logsSeries: context.logsResult?.series,
      logsQueries: context.logsResult?.queries,
      visibleRange: context.logsResult?.visibleRange,
      logsFrames: context.queryResponse?.logsFrames,
      logsVolume: context.supplementaryQueries?.[SupplementaryQueryType.LogsVolume],
      timeZone: getTimeZone(),
    };
  }

  render() {
    const {
      exploreId,
      loading,
      logRows,
      logsMeta,
      logsSeries,
      logsQueries,
      absoluteRange,
      timeZone,
      visibleRange,
      scanning,
      range,
      logsVolume,
      isLive,
      loadingState,
      available,
    } = this.getContext();

    if (!available) {
      return (
        <Alert title="Exploration mode not available">
          This plugin requires to be rendered inside an app/feature that supports exploration.
        </Alert>
      );
    }

    const actions = this.getContext().actions;

    const { width } = this.props;

    const scrollElement = undefined;

    if (!logRows) {
      return null;
    }

    return (
      <>
        <LogsCrossFadeTransition visible={isLive}>
          <Collapse label="Logs" loading={false} isOpen>
            {/*<LiveTailControls exploreId={exploreId}>*/}
            {/*  {(controls) => (*/}
            {/*    <LiveLogsWithTheme*/}
            {/*      logRows={logRows}*/}
            {/*      timeZone={timeZone}*/}
            {/*      stopLive={controls.stop}*/}
            {/*      isPaused={this.getContext().isPaused}*/}
            {/*      onPause={controls.pause}*/}
            {/*      onResume={controls.resume}*/}
            {/*      onClear={controls.clear}*/}
            {/*      clearedAtIndex={this.getContext().clearedAtIndex}*/}
            {/*    />*/}
            {/*  )}*/}
            {/*</LiveTailControls>*/}
          </Collapse>
        </LogsCrossFadeTransition>
        <LogsCrossFadeTransition visible={!isLive}>
          <Logs
            exploreId={exploreId}
            datasourceType={this.getContext().datasourceInstance?.type}
            logRows={logRows}
            logsMeta={logsMeta}
            logsSeries={logsSeries}
            logsVolumeEnabled={logsVolume.enabled}
            onSetLogsVolumeEnabled={(enabled) =>
              actions.setSupplementaryQueryEnabled(exploreId, enabled, SupplementaryQueryType.LogsVolume)
            }
            logsVolumeData={logsVolume.data}
            logsQueries={logsQueries}
            width={width}
            splitOpen={actions.onSplitOpen.bind(actions)}
            loading={loading}
            loadingState={loadingState}
            loadLogsVolumeData={() => actions.loadSupplementaryQueryData(exploreId, SupplementaryQueryType.LogsVolume)}
            onChangeTime={this.onChangeTime}
            onClickFilterLabel={actions.onClickFilterLabel.bind(actions, exploreId)}
            onClickFilterOutLabel={actions.onClickFilterOutLabel.bind(actions, exploreId)}
            onStartScanning={actions.onStartScanning.bind(actions, exploreId)}
            onStopScanning={actions.onStopScanning.bind(actions, exploreId)}
            absoluteRange={absoluteRange}
            visibleRange={visibleRange}
            timeZone={timeZone}
            scanning={scanning}
            scanRange={range.raw}
            showContextToggle={this.showContextToggle}
            getRowContext={this.getLogRowContext}
            getRowContextQuery={this.getLogRowContextQuery}
            getLogRowContextUi={this.getLogRowContextUi}
            getFieldLinks={this.getFieldLinks}
            addResultsToCache={() => actions.addResultsToCache(exploreId)}
            clearCache={() => actions.clearCache(exploreId)}
            eventBus={new EventBusSrv()}
            panelState={this.getContext().panelsState}
            logsFrames={this.getContext().logsFrames}
            scrollElement={scrollElement}
            isFilterLabelActive={actions.isFilterLabelActive.bind(actions, exploreId)}
            range={range}
          />
        </LogsCrossFadeTransition>
      </>
    );
  }
}

export default LogsContainer;
