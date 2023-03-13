import { css } from '@emotion/css';
import React, { useCallback } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { LokiQueryEditorProps } from '../../components/types';

import { LokiQueryAIField } from './LokiQueryAIField';
import { QueryPreview } from './QueryPreview';

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

  const handleChange = useCallback(
    (expr: string) => {
      onChange({ ...query, expr });
    },
    [onChange, query]
  );

  return (
    <div className={styles.wrapper}>
      <LokiQueryAIField onChange={handleChange} />
      <QueryPreview query={query.expr} />
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
