import { debounce } from 'lodash';
import React, { ChangeEvent } from 'react';

import { TextArea } from '@grafana/ui';

import { ask } from '../ai';

interface Props {
  onChange(arg1: string): void;
}

export const LokiQueryAIField = ({ onChange }: Props) => {
  const handleChange = debounce((e: ChangeEvent<HTMLTextAreaElement>) => {
    ask(e.target.value)
      .then((response) => {
        onChange(response);
      })
      .catch((e) => {
        console.error(e);
      });
  }, 600);

  return <TextArea placeholder="Describe your query or request" onChange={handleChange} />;
};
