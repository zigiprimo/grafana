import { css } from '@emotion/css';
import cx from 'classnames';
import React, { CSSProperties, useCallback } from 'react';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes/ThemeContext';

export interface StackProps {
  direction?: CSSProperties['flexDirection'];
  alignItems?: CSSProperties['alignItems'];
  wrap?: boolean;
  gap?: number;
  flexGrow?: CSSProperties['flexGrow'];
  children: React.ReactNode;
  className?: string;
}

export function Stack(props: StackProps) {
  const styles = useStyles2(useCallback((theme) => getStyles(theme, props), [props]));
  return <div className={cx(styles.root, props.className)}>{props.children}</div>;
}

export function Spacer() {
  return <div style={{ flex: 1 }} />;
}

const getStyles = (theme: GrafanaTheme2, props: StackProps) => ({
  root: css({
    display: 'flex',
    flexDirection: props.direction ?? 'row',
    flexWrap: props.wrap ?? true ? 'wrap' : undefined,
    alignItems: props.alignItems,
    gap: theme.spacing(props.gap ?? 2),
    flexGrow: props.flexGrow,
  }),
});
