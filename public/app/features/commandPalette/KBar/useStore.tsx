import { deepEqual } from 'fast-equals';
import * as React from 'react';
import invariant from 'tiny-invariant';

import { ActionInterface } from './action/ActionInterface';
import { history } from './action/HistoryImpl';
import type { Action, IKBarContext, KBarOptions, KBarProviderProps, KBarState } from './types';
// eslint-disable-next-line no-duplicate-imports
import { VisualState } from './types';

type useStoreProps = KBarProviderProps;

const MAX_RENDER = 1000;
let renderCount = 0;

export function useStore(props: useStoreProps) {
  const optionsRef = React.useRef({
    animations: {
      enterMs: 200,
      exitMs: 100,
    },
    ...props.options,
  } as KBarOptions);

  const actionsInterface = React.useMemo(
    () =>
      new ActionInterface(props.actions || [], {
        historyManager: optionsRef.current.enableHistory ? history : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // TODO: at this point useReducer might be a better approach to managing state.
  const [state, setState] = React.useState<KBarState>({
    searchQuery: '',
    currentRootActionId: null,
    visualState: VisualState.hidden,
    actions: { ...actionsInterface.actions },
    activeIndex: 0,
  });

  const currState = React.useRef<KBarState>(state);

  if (!deepEqual(currState.current, state)) {
    currState.current = state;
  }

  console.log('=> useStore state', { ...state });

  if (renderCount > MAX_RENDER) {
    debugger;
  }

  renderCount += 1;

  // const getState = React.useCallback(() => currState.current, []);
  // const publisher = React.useMemo(() => new Publisher(getState), [getState]);

  // React.useEffect(() => {
  //   currState.current = state;
  //   publisher.notify();
  // }, [state, publisher]);

  const registerActions = React.useCallback(
    (actions: Action[]) => {
      setState((state) => {
        return {
          ...state,
          actions: actionsInterface.add(actions),
        };
      });

      return function unregister() {
        setState((state) => {
          return {
            ...state,
            actions: actionsInterface.remove(actions),
          };
        });
      };
    },
    [actionsInterface]
  );

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return React.useMemo(() => {
    return {
      getState: () => currState.current,
      query: {
        setCurrentRootAction: (actionId) => {
          setState((state) => ({
            ...state,
            currentRootActionId: actionId,
          }));
        },
        setVisualState: (cb) => {
          setState((state) => ({
            ...state,
            visualState: typeof cb === 'function' ? cb(state.visualState) : cb,
          }));
        },
        setSearch: (searchQuery) =>
          setState((state) => ({
            ...state,
            searchQuery,
          })),
        registerActions,
        toggle: () =>
          setState((state) => ({
            ...state,
            visualState: [VisualState.animatingOut, VisualState.hidden].includes(state.visualState)
              ? VisualState.animatingIn
              : VisualState.animatingOut,
          })),
        setActiveIndex: (cb) =>
          setState((state) => ({
            ...state,
            activeIndex: typeof cb === 'number' ? cb : cb(state.activeIndex),
          })),
        inputRefSetter: (el: HTMLInputElement) => {
          inputRef.current = el;
        },
        getInput: () => {
          invariant(
            inputRef.current,
            'Input is undefined, make sure you apple `query.inputRefSetter` to your search input.'
          );
          return inputRef.current;
        },
      },
      options: optionsRef.current,
      subscribe: (collector, cb) => console.log('lol subscribing does nothing'),
    } as IKBarContext;
  }, [currState.current, registerActions]);
}
