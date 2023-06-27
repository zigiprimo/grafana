import React from 'react';

import { EditorField, EditorRow } from '@grafana/experimental';
import { AutoSizeInput, Select } from '@grafana/ui';
import { QueryOptionGroup } from 'app/plugins/datasource/prometheus/querybuilder/shared/QueryOptionGroup';

import { DEFAULT_LIMIT } from '../datasource';
import { TempoQuery } from '../types';

interface Props {
  onChange: (value: TempoQuery) => void;
  query: Partial<TempoQuery> & TempoQuery;
}

export const TempoQueryBuilderOptions = React.memo<Props>(({ onChange, query }) => {
  if (!query.hasOwnProperty('limit')) {
    query.limit = DEFAULT_LIMIT;
  }

  const onLimitChange = (e: React.FormEvent<HTMLInputElement>) => {
    onChange({ ...query, limit: parseInt(e.currentTarget.value, 10) });
  };

  return (
    <>
      <EditorRow>
        <QueryOptionGroup title="Options" collapsedInfo={[`Limit: ${query.limit || DEFAULT_LIMIT}`]}>
          <EditorField label="Limit" tooltip="Maximum number of traces to return.">
            <AutoSizeInput
              className="width-4"
              placeholder="auto"
              type="number"
              min={1}
              defaultValue={query.limit || DEFAULT_LIMIT}
              onCommitChange={onLimitChange}
              value={query.limit}
            />
          </EditorField>
          <EditorField label="Group by" tooltip="Select a tag to see group by metrics.">
            <Select
              // className={styles.dropdown}
              options={['span.beast', 'span.status', 'status', 'span.http.status_code'].map((t) => ({
                label: t,
                value: t,
              }))}
              value={query.groupBy}
              onChange={(v) => {
                onChange({
                  ...query,
                  groupBy: v?.value,
                });
              }}
              placeholder="Select group by"
              isClearable
              allowCustomValue={true}
            />
          </EditorField>
        </QueryOptionGroup>
      </EditorRow>
    </>
  );
});

TempoQueryBuilderOptions.displayName = 'TempoQueryBuilderOptions';
