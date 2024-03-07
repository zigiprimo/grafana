import React, { useMemo, useState } from 'react';

import { SelectableValue } from '@grafana/data';
import { SQLEditor } from '@grafana/experimental';

import { ExpressionQuery } from '../types';

import { ExecutedAxQuery } from './ExecutedAxQuery';
import { SpeechRecognitionButton } from './SpeechRecognitionButton';

interface Props {
  refIds: Array<SelectableValue<string>>;
  query: ExpressionQuery;
  onChange: (query: ExpressionQuery) => void;
}

export const AskExpr: React.FC<Props> = ({ onChange, refIds, query }) => {
  const vars = useMemo(() => refIds.map((v) => v.value!), [refIds]);
  const initialQuery = `What is the count of ${vars[0]}?`;
  const [expression, setExpression] = useState(query.expression || initialQuery);

  const onEditorChange = (exp: string) => {
    setExpression(exp);
    onChange({
      ...query,
      expression: exp,
    });
  };

  const onSpeechResult = (result: string) => onEditorChange(result);

  return (
    <div>
      <SpeechRecognitionButton onResult={onSpeechResult} />
      <SQLEditor language={{ id: 'markdown' }} query={expression} onChange={onEditorChange} />
    </div>
  );
};
