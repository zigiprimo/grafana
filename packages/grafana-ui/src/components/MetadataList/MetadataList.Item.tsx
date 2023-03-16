import { css } from '@emotion/css';
import React, { ReactNode } from 'react';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes/ThemeContext';
import { Button } from '../Button';
import { Icon } from '../Icon/Icon';

import { Spacer, Stack } from './Stack';

export interface MetaItem {
  label?: ReactNode;
  value: ReactNode;
}

interface ListItemProps {
  title: ReactNode;
  description?: ReactNode;
  metadata?: MetaItem[];

  // this one gets added as a separate column for adding "checkbox" or icons
  prefix?: ReactNode;
}

const MetadataListItem = (props: ListItemProps) => {
  const styles = useStyles2(getStyles);
  const { title, description, metadata = [], prefix } = props;

  return (
    <Stack direction="row" className={styles.wrapper} gap={1}>
      {prefix && <div>{prefix}</div>}
      <Stack direction="column" gap={0.5}>
        <header className={styles.title}>{title}</header>
        {description && <div className={styles.description}>{description}</div>}
        <Stack direction="row" alignItems="center" className={styles.metadata}>
          {metadata.map((meta, index) => {
            const last = index === metadata.length - 1;
            return (
              <>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  {meta.label && <div className={styles.metaLabel}>{meta.label}</div>}
                  {meta.value}
                </Stack>
                {!last && <MetaSeparator />}
              </>
            );
          })}
        </Stack>
      </Stack>
      <Spacer />
      <Stack direction="row" gap={1}>
        <Button variant="secondary" fill="outline" size="sm" icon="pen">
          Edit
        </Button>
        <Button variant="secondary" fill="outline" size="sm">
          More <Icon name="angle-down" />
        </Button>
      </Stack>
    </Stack>
  );
};

const MetaSeparator = () => {
  const styles = useStyles2(getStyles);
  return <div className={styles.separator}>|</div>;
};

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css`
    background-color: ${theme.colors.background.secondary};
    padding: ${theme.spacing(2)};
    border-radius: ${theme.shape.borderRadius()};
  `,
  title: css`
    font-weight: ${theme.typography.fontWeightBold};
    color: ${theme.colors.text.primary};
  `,
  description: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
  `,
  metadata: css`
    margin-top: ${theme.spacing()};
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
  metaLabel: css`
    color: ${theme.colors.text.secondary};
  `,
  separator: css`
    color: ${theme.colors.border.strong};
    margin: 0 -${theme.spacing(1)};
  `,
});

export { MetadataListItem };
