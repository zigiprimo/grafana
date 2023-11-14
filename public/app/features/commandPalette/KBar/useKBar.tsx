import * as React from 'react';

import { KBarContext } from './KBarContextProvider';
import type { KBarOptions, KBarQuery, KBarState } from './types';

interface BaseKBarReturnType {
  query: KBarQuery;
  options: KBarOptions;
}

type useKBarReturnType<S = null> = S extends null ? BaseKBarReturnType : S & BaseKBarReturnType;

export function useKBar<C = null>(collector?: (state: KBarState) => C): useKBarReturnType<C> {
  const ctx = React.useContext(KBarContext);

  const { query, getState, options } = ctx;

  const onCollect = React.useCallback(
    (collected: any) => ({
      ...collected,
      query,
      options,
    }),
    [query, options]
  );

  const collectedState = onCollect(collector?.(getState()));

  return collectedState;
}
