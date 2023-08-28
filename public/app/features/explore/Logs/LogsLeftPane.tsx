import React from 'react';

import {
  CoreApp,
  createDataFrame,
  Field,
  FieldType,
  getDefaultTimeRange,
  getDisplayProcessor,
  GrafanaTheme2,
  Labels,
  LogRowModel,
  LogsMetaItem,
} from '@grafana/data';
import { BarGauge, Collapse, useStyles2, useTheme2 } from '@grafana/ui';
import { LogDetailsRow } from 'app/features/logs/components/LogDetailsRow';
import { LogMessage } from 'app/features/logs/components/LogRowMessage';
import { getLogRowStyles } from 'app/features/logs/components/getLogRowStyles';
import { calculateLogsLabelStats } from 'app/features/logs/utils';
import { css, cx } from '@emotion/css';
import { LogLabels } from 'app/features/logs/components/LogLabels';
import { COMMON_LABELS, dataFrameToLogsModel } from 'app/features/logs/logsModel';
import { style } from 'd3';
import { BarGaugeDisplayMode, BarGaugeValueMode, LoadingState, ThresholdsMode, VizOrientation } from '@grafana/schema';
import { PanelRenderer } from '@grafana/runtime';
import { PieChart } from 'app/plugins/panel/piechart/PieChart';

interface Props {
  logRow?: LogRowModel;
  logRows?: LogRowModel[];
  onClickFilterLabel?: (key: string, value: string) => void;
  onClickFilterOutLabel?: (key: string, value: string) => void;
  onClickShowField?: (key: string) => void;
  onClickHideField?: (key: string) => void;
  displayedFields?: string[];
  isFilterLabelActive?: (key: string, value: string) => Promise<boolean>;
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    labelTabel: css`
      & td {
        min-width: 0 !important;
      }
    `,
  };
};

export const LogsLeftPane: React.FunctionComponent<Props> = (props) => {
  const theme = useTheme2();
  const localStyles = useStyles2(getStyles);
  const styles = getLogRowStyles(theme);
  const { logRow } = props;
  const labels = logRow?.labels ? logRow.labels : {};

  const logsModel = props.logRow?.dataFrame ? dataFrameToLogsModel([props.logRow?.dataFrame]) : null;
  const commonLabels = logsModel ? logsModel.meta?.find((m) => m.label === COMMON_LABELS) : null;

  const commonLabelKeys = Object.keys(commonLabels ? commonLabels.value : {});
  return (
    <Collapse label="Log Details" isOpen={true}>
      {logRow && props.logRows && (
        <div>
          <table className={localStyles.labelTabel}>
            <tr>
              <td colSpan={3} className={styles.logsRowMessage}>
                <div className={styles.positionRelative} style={{ minHeight: 65 }}>
                  <button className={`${styles.logLine} ${styles.positionRelative}`}>
                    <LogMessage hasAnsi={false} entry={logRow.entry} styles={styles} highlights={[]} />
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={3}>
                <hr />
              </td>
            </tr>
            <tr>
              <td colSpan={3}>Common Labels:</td>
            </tr>
            {Object.entries(commonLabels?.value || []).map(([key, value], i) => {
              return (
                <tr key={i}>
                  <td></td>
                  <td>{key}</td>
                  <td>{value}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={3}>
                <hr />
              </td>
            </tr>
            <tr>
              <td colSpan={3}>Uncommon Labels:</td>
            </tr>
            {Object.keys(labels)
              .sort()
              .filter((key) => !commonLabelKeys.includes(key) && key !== '_entry')
              .map((key, i) => {
                const value = labels[key];

                const stats = calculateLogsLabelStats(props.logRows!, key);

                // field.display = getDisplayProcessor({ field, theme });

                // return stats.map((stat, i) => {
                //   const value = {
                //     text: stat.count.toString(),
                //     // title: stat.value,
                //     numeric: stat.count,
                //     percent: stat.proportion,
                //   };

                const frame = createDataFrame({
                  // fields: [
                  //   { name: 'foo', type: FieldType.number, values: [500] },
                  //   { name: 'bar', type: FieldType.number, values: [800] },
                  // ],
                  fields: stats.map((stat) => {
                    return { name: `{${key}="${stat.value}"}`, type: FieldType.number, values: [stat.count] };
                  }),
                });

                return (
                  <>
                    <LogDetailsRow
                      key={`${key}=${value}-${i}`}
                      parsedKeys={[key]}
                      parsedValues={[value]}
                      isLabel={true}
                      onClickShowField={props.onClickShowField}
                      onClickHideField={props.onClickHideField}
                      onClickFilterOutLabel={props.onClickFilterOutLabel}
                      onClickFilterLabel={props.onClickFilterLabel}
                      getStats={() => calculateLogsLabelStats(props.logRows!, key)}
                      row={logRow}
                      app={CoreApp.Explore}
                      wrapLogMessage={true}
                      displayedFields={props.displayedFields}
                      disableActions={false}
                      isFilterLabelActive={props.isFilterLabelActive}
                    />
                    {stats.length > 1 && stats.length < 8 && (
                      <tr key={`${key}=}`}>
                        <td colSpan={4}>
                          {/* <BarGauge
                          theme={theme}
                          value={value}
                          field={field.config}
                          // display={field.display}
                          orientation={VizOrientation.Horizontal}
                          displayMode={BarGaugeDisplayMode.Basic}
                          showUnfilled={true}
                          valueDisplayMode={BarGaugeValueMode.Color}
                          width={200}
                        /> */}
                          <PanelRenderer
                            pluginId="piechart"
                            height={400}
                            width={400}
                            title="Pie Chart"
                            data={{
                              series: [frame],
                              timeRange: getDefaultTimeRange(),
                              state: LoadingState.Done,
                            }}
                            options={{
                              reduceOptions: {
                                values: false,
                                calcs: ['lastNotNull'],
                                fields: '',
                              },
                              pieType: 'pie',
                              tooltip: {
                                mode: 'single',
                                sort: 'none',
                              },
                              legend: {
                                showLegend: true,
                                displayMode: 'table',
                                placement: 'right',
                                values: ['percent'],
                              },
                              displayLabels: ['percent', 'value'],
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
          </table>
        </div>
      )}
    </Collapse>
  );
};
