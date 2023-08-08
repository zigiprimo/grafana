import { useEffect, useRef } from 'react';

import { Branding } from 'app/core/components/Branding/Branding';
import { safeParseJson } from 'app/features/explore/utils';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';

import { ExploreQueryParams } from '../types';

import { isFulfilled, hasKey } from './utils';

export function useExplorePageTitle(params: ExploreQueryParams) {
  const dsService = useRef(getDatasourceSrv());

  useEffect(() => {
    if (!params.panes || typeof params.panes !== 'string') {
      return;
    }

    Promise.allSettled(
      Object.values(safeParseJson(params.panes)).map((pane) => {
        if (
          !pane ||
          typeof pane !== 'object' ||
          !hasKey('datasource', pane) ||
          !pane.datasource ||
          typeof pane.datasource !== 'string'
        ) {
          return Promise.reject();
        }

        return dsService.current.get(pane.datasource);
      })
    )
      .then((results) => results.filter(isFulfilled).map((result) => result.value))
      .then((datasources) => {
        const names = datasources.map((ds) => ds.name);

        if (names.length === 0) {
          global.document.title = `${Branding.AppTitle}`;
          return;
        }

        global.document.title = `${names.join(' | ')} - ${Branding.AppTitle}`;
      });
  }, [params.panes]);
}
