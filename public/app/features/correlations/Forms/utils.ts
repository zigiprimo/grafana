import { Correlation } from '@grafana/data';

type CorrelationBaseData = Pick<Correlation, 'uid' | 'sourceUID' | 'targetUID'>;

export const getInputId = (inputName: string, correlation?: CorrelationBaseData) => {
  if (!correlation) {
    return inputName;
  }

  return `${inputName}_${correlation.sourceUID}-${correlation.uid}`;
};
