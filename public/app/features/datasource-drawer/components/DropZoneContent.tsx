import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Icon, useStyles2 } from '@grafana/ui';

export function DropZoneContent() {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <Icon name="upload" size="xl" />
      <div className={styles.text}>
        <h5 className={styles.title}>Upload CSV or other files</h5>
        <small className={styles.small}>Drag and drop here or browse</small>
      </div>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css`
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
    `,
    text: css`
      display: flex;
      flex-direction: column;
      margin-left: ${theme.spacing(3)};
      text-align: left;
    `,
    title: css`
      margin-bottom: ${theme.spacing(0.5)};
    `,
    small: css`
      color: ${theme.colors.text.secondary};
    `,
  };
}
