import { css } from '@emotion/css';
import React from 'react';

import { NavModelItem } from '@grafana/data';
import { Stack, Text, useStyles2 } from '@grafana/ui';

import { PageInfo } from '../PageInfo/PageInfo';

import { EditableTitle } from './EditableTitle';
import { PageInfoItem } from './types';

export interface Props {
  navItem: NavModelItem;
  renderTitle?: (title: string) => React.ReactNode;
  actions?: React.ReactNode;
  info?: PageInfoItem[];
  subTitle?: React.ReactNode;
  onEditTitle?: (newValue: string) => Promise<void>;
}

export function PageHeader({ navItem, renderTitle, actions, info, subTitle, onEditTitle }: Props) {
  const styles = useStyles2(getStyles);
  const sub = subTitle ?? navItem.subTitle;

  const titleElement = onEditTitle ? (
    <EditableTitle value={navItem.text} onEdit={onEditTitle} />
  ) : (
    <Stack direction="row" alignItems="center">
      {navItem.img && <img className={styles.img} src={navItem.img} alt={`logo for ${navItem.text}`} />}
      {renderTitle ? renderTitle(navItem.text) : <Text element="h1">{navItem.text}</Text>}
    </Stack>
  );

  return (
    <Stack direction="row" alignItems="flex-start" gap={3}>
      <Stack direction="row" gap={2} flex={1} wrap="wrap" alignItems="flex-start">
        <Stack direction="column" grow={1} shrink={0} basis="auto">
          {titleElement}
          {sub && <Text color="secondary">{sub}</Text>}
        </Stack>
        {info && <PageInfo info={info} />}
      </Stack>
      <Stack direction="row" gap={1}>
        {actions}
      </Stack>
    </Stack>
  );
}

const getStyles = () => {
  return {
    img: css({
      width: '32px',
      height: '32px',
    }),
  };
};
