import React from 'react';

import { Exploration, ExplorationPane } from './types';

export const ExplorationContext = React.createContext<Partial<Exploration>>({
  available: false,
});
export const ExplorationContextProvider = ExplorationContext.Provider;
export const useExplorationContext = () => React.useContext(ExplorationContext);

export const ExplorationPaneContext = React.createContext<Partial<ExplorationPane>>({
  available: false,
});
export const ExplorationPaneContextProvider = ExplorationPaneContext.Provider;
export const useExplorationPaneContext = () => React.useContext(ExplorationPaneContext);
