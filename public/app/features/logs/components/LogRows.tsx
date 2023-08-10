import { cx } from '@emotion/css';
import memoizeOne from 'memoize-one';
import React, { PureComponent } from 'react';

import {
  CoreApp,
  DataFrame,
  Field,
  LinkModel,
  LogRowModel,
  LogsDedupStrategy,
  LogsSortOrder,
  TimeZone,
} from '@grafana/data';
import { Icon, Themeable2, withTheme2 } from '@grafana/ui';

import { sortLogRows } from '../utils';

//Components
import { LogRow } from './LogRow';
import { Skeleton } from './SkeletonLoader';
import { getLogLevelStyles, getLogRowStyles } from './getLogRowStyles';

export const PREVIEW_LIMIT = 100;

export interface Props extends Themeable2 {
  app?: CoreApp;
  deduplicatedRows?: LogRowModel[];
  dedupStrategy: LogsDedupStrategy;
  displayedFields?: string[];
  enableLogDetails: boolean;
  forceEscape?: boolean;
  getFieldLinks?: (field: Field, rowIndex: number, dataFrame: DataFrame) => Array<LinkModel<Field>>;
  loading?: boolean;
  logRows?: LogRowModel[];
  logsSortOrder?: LogsSortOrder | null;
  onClickFilterLabel?: (key: string, value: string) => void;
  onClickFilterOutLabel?: (key: string, value: string) => void;
  onClickHideField?: (key: string) => void;
  onClickShowField?: (key: string) => void;
  onLogRowHover?: (row?: LogRowModel) => void;
  onOpenContext?: (row: LogRowModel, onClose: () => void) => void;
  onPermalinkClick?: (row: LogRowModel) => Promise<void>;
  onPinLine?: (row: LogRowModel) => void;
  onUnpinLine?: (row: LogRowModel) => void;
  permalinkedRowId?: string;
  pinnedRowId?: string;
  prettifyLogMessage: boolean;
  previewLimit?: number;
  scrollIntoView?: (element: HTMLElement) => void;
  showContextToggle?: (row?: LogRowModel) => boolean;
  showLabels: boolean;
  showTime: boolean;
  timeZone: TimeZone;
  wrapLogMessage: boolean;
}

interface State {
  renderAll: boolean;
}

class UnThemedLogRows extends PureComponent<Props, State> {
  renderAllTimer: number | null = null;

  static defaultProps = {
    previewLimit: PREVIEW_LIMIT,
  };

  state: State = {
    renderAll: false,
  };

  /**
   * Toggle the `contextIsOpen` state when a context of one LogRow is opened in order to not show the menu of the other log rows.
   */
  openContext = (row: LogRowModel, onClose: () => void): void => {
    if (this.props.onOpenContext) {
      this.props.onOpenContext(row, onClose);
    }
  };

  componentDidMount() {
    // Staged rendering
    const { logRows, previewLimit } = this.props;
    const rowCount = logRows ? logRows.length : 0;
    // Render all right away if not too far over the limit
    const renderAll = rowCount <= previewLimit! * 2;
    if (renderAll) {
      this.setState({ renderAll });
    } else {
      this.renderAllTimer = window.setTimeout(() => this.setState({ renderAll: true }), 2000);
    }
  }

  componentWillUnmount() {
    if (this.renderAllTimer) {
      clearTimeout(this.renderAllTimer);
    }
  }

  makeGetRows = memoizeOne((orderedRows: LogRowModel[]) => {
    return () => orderedRows;
  });

  sortLogs = memoizeOne((logRows: LogRowModel[], logsSortOrder: LogsSortOrder): LogRowModel[] =>
    sortLogRows(logRows, logsSortOrder)
  );

  render() {
    const { deduplicatedRows, logRows, dedupStrategy, theme, logsSortOrder, previewLimit, loading, ...rest } =
      this.props;

    const { renderAll } = this.state;
    const styles = getLogRowStyles(theme);
    const dedupedRows = deduplicatedRows ? deduplicatedRows : logRows;
    const hasData = logRows && logRows.length > 0;
    const dedupCount = dedupedRows
      ? dedupedRows.reduce((sum, row) => (row.duplicates ? sum + row.duplicates : sum), 0)
      : 0;
    const showDuplicates = dedupStrategy !== LogsDedupStrategy.none && dedupCount > 0;
    // Staged rendering
    const processedRows = dedupedRows ? dedupedRows : [];
    const orderedRows = logsSortOrder ? this.sortLogs(processedRows, logsSortOrder) : processedRows;
    const firstRows = orderedRows.slice(0, previewLimit!);
    const lastRows = orderedRows.slice(previewLimit!, orderedRows.length);

    // React profiler becomes unusable if we pass all rows to all rows and their labels, using getter instead
    const getRows = this.makeGetRows(orderedRows);

    if (loading) {
      const levelStyles = getLogLevelStyles(theme);
      const loadingRows = Array.from({ length: 20 }, () => null);

      return (
        <table className={styles.logsRowsTable}>
          <tbody>
            {loadingRows.map((_, idx) => {
              return (
                <tr key={idx} className={cx(styles.logsRow, styles.loadingOverrides.logsRow)}>
                  {/* log health */}
                  <td className={cx(levelStyles.logsRowLevelColor, styles.logsRowLevel)}></td>
                  {/* arrow */}
                  <td className={styles.logsRowToggleDetails}>
                    <Icon className={styles.topVerticalAlign} name="angle-right" />
                  </td>
                  {/* date */}
                  <td className={cx(styles.logsRowLocalTime)}>
                    <div className={styles.loadingOverrides.logsCell}>
                      <Skeleton />
                    </div>
                  </td>
                  {/* log line */}
                  <td className={styles.logsRowMessage}>
                    <div className={styles.loadingOverrides.logsCell}>
                      <Skeleton />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    return (
      <table className={styles.logsRowsTable}>
        <tbody>
          {hasData &&
            firstRows.map((row) => (
              <LogRow
                key={row.uid}
                getRows={getRows}
                row={row}
                showDuplicates={showDuplicates}
                logsSortOrder={logsSortOrder}
                onOpenContext={this.openContext}
                styles={styles}
                onPermalinkClick={this.props.onPermalinkClick}
                scrollIntoView={this.props.scrollIntoView}
                permalinkedRowId={this.props.permalinkedRowId}
                onPinLine={this.props.onPinLine}
                onUnpinLine={this.props.onUnpinLine}
                pinned={this.props.pinnedRowId === row.uid}
                {...rest}
              />
            ))}
          {hasData &&
            renderAll &&
            lastRows.map((row) => (
              <LogRow
                key={row.uid}
                getRows={getRows}
                row={row}
                showDuplicates={showDuplicates}
                logsSortOrder={logsSortOrder}
                onOpenContext={this.openContext}
                styles={styles}
                onPermalinkClick={this.props.onPermalinkClick}
                scrollIntoView={this.props.scrollIntoView}
                permalinkedRowId={this.props.permalinkedRowId}
                onPinLine={this.props.onPinLine}
                onUnpinLine={this.props.onUnpinLine}
                pinned={this.props.pinnedRowId === row.uid}
                {...rest}
              />
            ))}
          {hasData && !renderAll && (
            <tr>
              <td colSpan={5}>Rendering {orderedRows.length - previewLimit!} rows...</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }
}

export const LogRows = withTheme2(UnThemedLogRows);
LogRows.displayName = 'LogsRows';
