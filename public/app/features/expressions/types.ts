import { ReducerID, SelectableValue } from '@grafana/data';
import type { DataQuery } from '@grafana/schema';

import { EvalFunction } from '../alerting/state/alertDef';

/**
 * MATCHES a constant in DataSourceWithBackend
 */
export const ExpressionDatasourceUID = '__expr__';

export enum ExpressionQueryType {
  math = 'math',
  reduce = 'reduce',
  resample = 'resample',
  classic = 'classic_conditions',
  threshold = 'threshold',
}

export const gelTypes: Array<SelectableValue<ExpressionQueryType>> = [
  {
    value: ExpressionQueryType.math,
    label: 'Math',
    description: 'Free-form math formulas on time series or number data.',
  },
  {
    value: ExpressionQueryType.reduce,
    label: 'Reduce',
    description:
      'Takes one or more time series returned from a query or an expression and turns each series into a single number.',
  },
  {
    value: ExpressionQueryType.resample,
    label: 'Resample',
    description: 'Changes the time stamps in each time series to have a consistent time interval.',
  },
  {
    value: ExpressionQueryType.classic,
    label: 'Classic condition',
    description:
      'Takes one or more time series returned from a query or an expression and checks if any of the series match the condition.',
  },
  {
    value: ExpressionQueryType.threshold,
    label: 'Threshold',
    description:
      'Takes one or more time series returned from a query or an expression and checks if any of the series match the threshold condition.',
  },
];

export type SupportedReducerFns =
  | ReducerID.min
  | ReducerID.max
  | ReducerID.mean
  | ReducerID.sum
  | ReducerID.count
  | ReducerID.last;

export const reducerTypes: Array<SelectableValue<string>> = [
  { value: ReducerID.min, label: 'Min', description: 'Get the minimum value' },
  { value: ReducerID.max, label: 'Max', description: 'Get the maximum value' },
  { value: ReducerID.mean, label: 'Mean', description: 'Get the average value' },
  { value: ReducerID.sum, label: 'Sum', description: 'Get the sum of all values' },
  { value: ReducerID.count, label: 'Count', description: 'Get the number of values' },
  { value: ReducerID.last, label: 'Last', description: 'Get the last value' },
];

export enum ReducerMode {
  Strict = '', // backend API wants an empty string to support "strict" mode
  ReplaceNonNumbers = 'replaceNN',
  DropNonNumbers = 'dropNN',
}

export const reducerModes: Array<SelectableValue<ReducerMode>> = [
  {
    value: ReducerMode.Strict,
    label: 'Strict',
    description: 'Result can be NaN if series contains non-numeric data',
  },
  {
    value: ReducerMode.DropNonNumbers,
    label: 'Drop Non-numeric Values',
    description: 'Drop NaN, +/-Inf and null from input series before reducing',
  },
  {
    value: ReducerMode.ReplaceNonNumbers,
    label: 'Replace Non-numeric Values',
    description: 'Replace NaN, +/-Inf and null with a constant value before reducing',
  },
];

export type SupportedDownsamplingTypes =
  | ReducerID.last
  | ReducerID.min
  | ReducerID.max
  | ReducerID.mean
  | ReducerID.sum;

export const downsamplingTypes: Array<SelectableValue<string>> = [
  { value: ReducerID.last, label: 'Last', description: 'Fill with the last value' },
  { value: ReducerID.min, label: 'Min', description: 'Fill with the minimum value' },
  { value: ReducerID.max, label: 'Max', description: 'Fill with the maximum value' },
  { value: ReducerID.mean, label: 'Mean', description: 'Fill with the average value' },
  { value: ReducerID.sum, label: 'Sum', description: 'Fill with the sum of all values' },
];

export type SupportedUpsamplingTypes = 'pad' | 'backfilling' | 'fillna';

export const upsamplingTypes: Array<SelectableValue<SupportedUpsamplingTypes>> = [
  { value: 'pad', label: 'pad', description: 'fill with the last known value' },
  { value: 'backfilling', label: 'backfilling', description: 'fill with the next known value' },
  { value: 'fillna', label: 'fillna', description: 'Fill with NaNs' },
];

export const thresholdFunctions: Array<SelectableValue<EvalFunction>> = [
  { value: EvalFunction.IsAbove, label: 'Is above' },
  { value: EvalFunction.IsBelow, label: 'Is below' },
  { value: EvalFunction.IsWithinRange, label: 'Is within range' },
  { value: EvalFunction.IsOutsideRange, label: 'Is outside range' },
];

/**
 * For now this is a single object to cover all the types.... would likely
 * want to split this up by type as the complexity increases
 */
export type ExpressionQuery =
  | ThresholdExpression
  | ReduceExpression
  | ResampleExpression
  | MathExpression
  | ClassicConditionsExpression;

export interface GenericExpression extends DataQuery {
  type: ExpressionQueryType | string;
}

export interface ReduceExpression extends GenericExpression {
  type: ExpressionQueryType.reduce;
  expression: string; // this is the refId we want to reduce on
  reducer: SupportedReducerFns;
  settings?: {
    mode?: ReducerMode;
    replaceWithValue?: number;
  };
}

export interface ResampleExpression extends GenericExpression {
  type: ExpressionQueryType.resample;
  expression: string; // this is the refId we want to reduce on
  downsampler: SupportedDownsamplingTypes;
  upsampler: SupportedUpsamplingTypes;
  window: string;
}

export interface MathExpression extends GenericExpression {
  type: ExpressionQueryType.math;
  expression: string;
}

export interface ThresholdExpression extends GenericExpression {
  type: ExpressionQueryType.threshold;
  expression: string;
  conditions: ThresholdCondition[];
}

export interface ClassicConditionsExpression extends GenericExpression {
  type: ExpressionQueryType.classic;
  conditions: ClassicCondition[];
}

export interface ClassicCondition {
  evaluator: {
    params: number[];
    type: EvalFunction;
  };
  operator?: {
    type: 'and' | 'or';
  };
  query: {
    params: string[];
  };
  reducer: {
    params: [];
    type: ReducerType;
  };
  type: 'query';
}

export interface ThresholdCondition {
  evaluator: {
    params: number[];
    type: Exclude<EvalFunction, 'HasNoValue'>;
  };
}

export type ReducerType =
  | 'avg'
  | 'min'
  | 'max'
  | 'sum'
  | 'count'
  | 'last'
  | 'median'
  | 'diff'
  | 'diff_abs'
  | 'percent_diff'
  | 'percent_diff_abs'
  | 'count_non_null';
