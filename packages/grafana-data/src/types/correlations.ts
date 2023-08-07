import { DataLinkTransformationConfig } from './dataLink';
import { DataSourceInstanceSettings } from './datasource';

type CorrelationConfigType = 'query';

export interface CorrelationConfig {
  field: string;
  target: object;
  type: CorrelationConfigType;
  transformations?: DataLinkTransformationConfig[];
}

export interface Correlation {
  uid: string;
  sourceUID: string;
  targetUID: string;
  label?: string;
  description?: string;
  config: CorrelationConfig;
}

export interface CorrelationData extends Omit<Correlation, 'sourceUID' | 'targetUID'> {
  source: DataSourceInstanceSettings;
  target: DataSourceInstanceSettings;
}

export interface CorrelationsData {
  correlations: CorrelationData[];
  page: number;
  limit: number;
  totalCount: number;
}
