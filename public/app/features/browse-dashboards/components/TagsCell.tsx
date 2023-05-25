import { css } from '@emotion/css';
import React from 'react';
import Skeleton from 'react-loading-skeleton';
import { CellProps } from 'react-table';

import { GrafanaTheme2 } from '@grafana/data';
import { TagList, useStyles2 } from '@grafana/ui';

import { DashboardsTreeItem } from '../types';

export function TagsCell({ row: { original: data } }: CellProps<DashboardsTreeItem, unknown>) {
  const styles = useStyles2(getStyles);
  const item = data.item;
  if (item.kind === 'ui') {
    return <Skeleton containerClassName={styles.skeletonContainer} count={3} inline width={40} height={21} />;
  } else if (!item.tags) {
    return null;
  }

  return <TagList className={styles.tagList} tags={item.tags} />;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    // TagList is annoying and has weird default alignment
    tagList: css({
      justifyContent: 'flex-start',
    }),
    skeletonContainer: css({
      display: 'flex',
      gap: theme.spacing(0.75),
    }),
  };
}
