import { DataQuery } from '@grafana/schema';

function getRefId(num: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  if (num < letters.length) {
    return letters[num];
  } else {
    return getRefId(Math.floor(num / letters.length) - 1) + letters[num % letters.length];
  }
}

export const getNextRefIdChar = (queries: DataQuery[]): string => {
  for (let num = 0; ; num++) {
    const refId = getRefId(num);
    if (!queries.some((query) => query.refId === refId)) {
      return refId;
    }
  }
};

/**
 * Makes sure all the queries have unique (and valid) refIds
 */
export function withUniqueRefIds(queries: DataQuery[]): DataQuery[] {
  const refIds = new Set<string>(queries.map((query) => query.refId).filter(Boolean));

  if (refIds.size === queries.length) {
    return queries;
  }

  refIds.clear();

  return queries.map((query) => {
    if (query.refId && !refIds.has(query.refId)) {
      refIds.add(query.refId);
      return query;
    }

    const refId = getNextRefIdChar(queries);
    refIds.add(refId);

    const newQuery = {
      ...query,
      refId,
    };

    return newQuery;
  });
}
