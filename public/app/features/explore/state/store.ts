import { configureStore } from '@reduxjs/toolkit';
import { Action, Store } from 'redux';

import { ExploreState } from '../types';

import { exploreReducer, initialExploreState } from './main';

let store: Store<ExploreState>;

export function configureExploreStore() {
  const store = configureStore({
    reducer: exploreReducer,
    preloadedState: initialExploreState,
  });

  return store;
}

export function getExploreState(): ExploreState {
  if (!store || !store.dispatch) {
    throw new Error('Explore store not configured yet');
  }

  return store.getState();
}

export function exploreDispatch(action: Action) {
  if (!store || !store.dispatch) {
    throw new Error('Explore store not configured yet');
  }

  return store.dispatch(action);
}
