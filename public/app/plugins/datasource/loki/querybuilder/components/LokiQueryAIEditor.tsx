import { css } from '@emotion/css';
import React, { useCallback, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { placeHolderScopedVars } from '../../components/monaco-query-field/monaco-completion-provider/validation';
import { LokiQueryEditorProps } from '../../components/types';
import { identifyQuery } from '../ai';

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
  const [response, setResponse] = useState('');
  const styles = useStyles2(getStyles);

  const handleChange = useCallback(
    (expr: string) => {
      setResponse(expr);
      const queryExpr = identifyQuery(expr, datasource.interpolateString(expr, placeHolderScopedVars));

      onChange({ ...query, expr: queryExpr });
      onRunQuery();
    },
    [datasource, onChange, onRunQuery, query]
  );

  return (
    <div className={styles.wrapper}>
      <LokiQueryAIField onChange={handleChange} />
      {response && (
        <>
          AI Response:
          <QueryPreview query={response} />
        </>
      )}
      {response !== query.expr && (
        <>
          Identified query:
          <QueryPreview query={query.expr} />
        </>
      )}
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
