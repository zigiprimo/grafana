import { Correlation } from '@grafana/data';

export interface AddCorrelationResponse {
  correlation: Correlation;
}

export type GetCorrelationsResponse = Correlation[];

export interface CorrelationsApiResponse {
  message: string;
}

export interface CorrelationsErrorResponse extends CorrelationsApiResponse {
  error: string;
}

export interface CreateCorrelationResponse extends CorrelationsApiResponse {
  result: Correlation;
}

export interface UpdateCorrelationResponse extends CorrelationsApiResponse {
  result: Correlation;
}

export interface RemoveCorrelationResponse {
  message: string;
}

export type GetCorrelationsParams = {
  page: number;
};

export type RemoveCorrelationParams = Pick<Correlation, 'sourceUID' | 'uid'>;
export type CreateCorrelationParams = Omit<Correlation, 'uid'>;
export type UpdateCorrelationParams = Omit<Correlation, 'targetUID'>;
