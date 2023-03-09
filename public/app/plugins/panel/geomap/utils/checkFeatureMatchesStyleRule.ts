import { FeatureLike } from 'ol/Feature';

import { ComparisonOperation } from '@grafana/schema';

import { FeatureRuleConfig } from '../types';

/**
 * Check whether feature has property value that matches rule
 * @param rule - style rule with an operation, property, and value
 * @param feature - feature with properties and values
 * @returns boolean
 */
export const checkFeatureMatchesStyleRule = (rule: FeatureRuleConfig, feature: FeatureLike) => {
  const val = feature.get(rule.property);
  return compareValues(val, rule.operation, rule.value);
};

export const compareValues = (
  left: string | number | boolean | null | undefined,
  op: ComparisonOperation,
  right: string | number | boolean | null | undefined
) => {
  // Normalize null|undefined values
  if (left == null || right == null) {
    if (left == null) {
      left = 'null';
    }
    if (right == null) {
      right = 'null';
    }
    if (op === ComparisonOperation.GTE || op === ComparisonOperation.LTE) {
      op = ComparisonOperation.EQ; // check for equality
    }
  }

  switch (op) {
    case ComparisonOperation.EQ:
      return `${left}` === `${right}`;
    case ComparisonOperation.NEQ:
      return `${left}` !== `${right}`;
    case ComparisonOperation.GT:
      return left > right;
    case ComparisonOperation.GTE:
      return left >= right;
    case ComparisonOperation.LT:
      return left < right;
    case ComparisonOperation.LTE:
      return left <= right;
    default:
      return false;
  }
};
