import {
  AnyAction,
  AsyncThunk,
  AsyncThunkOptions,
  AsyncThunkPayloadCreator,
  configureStore,
  addListener as addListenerUntyped,
  createAsyncThunk as createAsyncThunkUntyped,
  PayloadAction,
  ThunkAction,
  ThunkDispatch,
  TypedAddListener,
  createListenerMiddleware,
} from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  // eslint-disable-next-line no-restricted-imports
  useSelector as useExploreSelectorUntyped,
  TypedUseSelectorHook,
  // eslint-disable-next-line no-restricted-imports
  useDispatch as useExploreDispatchUntyped,
} from 'react-redux';
import { Action, Reducer, Store } from 'redux';

import { ExploreState } from '../types';

const listenerMiddleware = createListenerMiddleware();

let store: Store<ExploreState>;

export function configureExploreStore(reducer: Reducer<ExploreState, AnyAction>, preloadedState: ExploreState) {
  const typedStore = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: true, serializableCheck: false, immutableCheck: false }).concat(
        listenerMiddleware.middleware
      ),
    preloadedState,
  });
  // this enables "refetchOnFocus" and "refetchOnReconnect" for RTK Query
  setupListeners(store.dispatch);

  store = typedStore;
  return typedStore;
}

export function getExploreStore() {
  return store;
}

export function getExploreState(): ExploreState {
  if (!store || !store.dispatch) {
    throw new Error('Explore store not configured yet');
  }

  return store.getState();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exploreDispatch(action: any) {
  if (!store || !store.dispatch) {
    throw new Error('Explore store not configured yet');
  }

  return store.dispatch(action);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExploreThunkResult<R> = ThunkAction<R, ExploreState, undefined, PayloadAction<any>>;

export type ExploreThunkDispatch = ThunkDispatch<ExploreState, undefined, Action>;

type ExploreDispatch = ReturnType<typeof configureExploreStore>['dispatch'];
export const useExploreDispatch: () => ExploreDispatch = useExploreDispatchUntyped;
export const useExploreSelector: TypedUseSelectorHook<ExploreState> = useExploreSelectorUntyped;

type DefaultExploreThunkApiConfig = { dispatch: ExploreDispatch; state: ExploreState };
export const createExploreAsyncThunk = <
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends {} = DefaultExploreThunkApiConfig,
>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, ThunkApiConfig>,
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
): AsyncThunk<Returned, ThunkArg, ThunkApiConfig> =>
  createAsyncThunkUntyped<Returned, ThunkArg, ThunkApiConfig>(typePrefix, payloadCreator, options);

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const addExploreListener = addListenerUntyped as TypedAddListener<ExploreState, ExploreDispatch>;
