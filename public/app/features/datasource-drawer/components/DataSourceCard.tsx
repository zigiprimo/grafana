import { css, cx } from '@emotion/css';
import React from 'react';

import { DataSourceInstanceSettings, DataSourceJsonData, GrafanaTheme2 } from '@grafana/data';
import { Card, Tag, useStyles2 } from '@grafana/ui';

export interface DataSourceCardProps {
  onChange: (uid: string) => void;
  selected?: boolean;
  ds: DataSourceInstanceSettings<DataSourceJsonData>;
}

export function DataSourceCard(props: DataSourceCardProps) {
  const { selected, ds, onChange } = props;
  const styles = useStyles2(getStyles);

  return (
    <Card
      className={cx(styles.container, selected ? styles.selectedDataSource : undefined)}
      key={ds.uid}
      onClick={() => onChange(ds.uid)}
    >
      <Card.Figure className={styles.figure}>
        <img alt={`${ds.meta.name} logo`} src={ds.meta.info.logos.large}></img>
      </Card.Figure>
      <Card.Meta>{[ds.meta.name, ds.url]}</Card.Meta>
      <Card.Tags>{[ds.isDefault && <Tag key="default-tag" name={'default'} colorIndex={1} />]}</Card.Tags>
      <Card.Heading>{ds.name}</Card.Heading>
    </Card>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css`
      background: transparent;
      padding: ${theme.spacing(1.5)} ${theme.spacing(1)};
      border-bottom: 1px solid ${theme.colors.border.weak};
    `,
    '&:hover': css`
      background: ${theme.colors.emphasize(theme.colors.action.hover, 0.16)},
      cursor: 'pointer',
      zIndex: 1,
    `,
    '&:focus': css`
      background: ${theme.colors.emphasize(theme.colors.background.secondary, 0.03)};
    `,
    figure: css`
      width: '32px',
      height: '32px',
    `,
    selectedDataSource: css`
      background-color: ${theme.colors.emphasize(theme.colors.background.secondary, 0.1)};
    `,
  };
}
