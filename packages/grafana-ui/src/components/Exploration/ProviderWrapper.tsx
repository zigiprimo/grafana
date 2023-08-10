import React, { PropsWithChildren, useState } from 'react';

import { ExplorationContextProvider } from './context';
import { Exploration } from './types';

type ProviderProps = {
  exploration: Exploration;
};

export function ProviderWrapper(props: PropsWithChildren<ProviderProps>) {
  const [exploration, setExploration] = useState(props.exploration);
  exploration.setOnChange(setExploration);
  return <ExplorationContextProvider value={exploration}>{props.children}</ExplorationContextProvider>;
}
