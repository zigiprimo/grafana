import { css } from '@emotion/css';
import React, { useMemo } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { CellProps, Column, InteractiveTable, useStyles2 } from '@grafana/ui';
import { Skeleton } from 'app/features/logs/components/SkeletonLoader';

interface TableData {
  time: string;
  aSeries: string;
}

const LoaderCell = (_: CellProps<TableData, void>, styles: { cell: string }) => {
  return (
    <div className={styles.cell}>
      <Skeleton />
    </div>
  );
};

export const TableLoader = () => {
  const styles = useStyles2(getStyles);
  const columns = useMemo<Array<Column<TableData>>>(
    () => [
      {
        id: 'time',
        header: 'Time',
        cell: (props) => LoaderCell(props, styles),
      },
      { id: 'aSeries', header: 'A-Series', cell: (props) => LoaderCell(props, styles) },
    ],
    [styles]
  );

  const data = useMemo<TableData[]>(() => {
    const rows = Array.from({ length: 20 }, () => null);
    return rows.map((_, idx) => ({ time: String(idx), aSeries: '' }));
  }, []);
  return <InteractiveTable columns={columns} data={data} getRowId={({ time }) => time} />;
};

function getStyles(theme: GrafanaTheme2) {
  return {
    cell: css`
      width: 100%;
      height: 22px;
      background-color: ${theme.colors.background.secondary};
    `,
  };
}
