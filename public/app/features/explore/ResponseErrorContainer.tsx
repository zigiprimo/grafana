import React from 'react';

import { LoadingState } from '@grafana/data';

import { ErrorContainer } from './ErrorContainer';
import { useExploreSelector } from './state/store';

interface Props {
  exploreId: string;
}
export function ResponseErrorContainer(props: Props) {
  const queryResponse = useExploreSelector((state) => state.panes[props.exploreId]!.queryResponse);
  const queryError = queryResponse?.state === LoadingState.Error ? queryResponse?.error : undefined;

  // Errors with ref ids are shown below the corresponding query
  if (queryError?.refId) {
    return null;
  }

  return <ErrorContainer queryError={queryError} />;
}
