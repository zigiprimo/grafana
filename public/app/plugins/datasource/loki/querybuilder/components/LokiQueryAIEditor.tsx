import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { TextArea, useStyles2 } from '@grafana/ui';

import { LokiQueryEditorProps } from '../../components/types';

export function LokiQueryAIEditor({
  query,
  datasource,
  range,
  onRunQuery,
  onChange,
  data,
  app,
  history,
}: LokiQueryEditorProps) {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.wrapper}>
      <TextArea placeholder="Describe your query or request" />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css`
      max-width: 100%;
      .gf-form {
        margin-bottom: 0.5;
      }
    `,
  };
};
