import { useCallback } from 'react';

const useRudderStack = () => {
  const trackRudderStackEvent = useCallback(
    (event: string, params: object) => {
      (window as any).rudderanalytics?.track(event, {
        ...params,
      });
    },
    []
  );

  return {
    trackRudderStackEvent,
  };
};

// trackPartialApply takes a trackRudderStackEvent returned from the effect above, and returns one
// that is partially applied with the given event, and parameters.
export const trackPartialApply = (trackFn: (e: string, p: object) => void, event: string, partialParams: object) => {
  return (params: object) => {
    trackFn(event, {
      ...partialParams,
      ...params,
    });
  };
};

export default useRudderStack;
