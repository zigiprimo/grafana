import { llms } from '@grafana/experimental';

import { CommandPaletteAction } from '../../commandPalette/types';

import { SearchQuery } from '.';

interface DashboardSearchResult {
  title: string;
  folder_title: string;
  url: string;
}

interface DocsSearchResult {
  content: string;
  title: string;
  url: string;
}

export class VectorSearcher {
  constructor() {}

  async doSearchQuery(query: SearchQuery, limit = 5): Promise<CommandPaletteAction[]> {
    const vectorEnabled = llms.vector.enabled();
    if (!vectorEnabled || !query.query) {
      return [];
    }

    // search dashboards
    const dashboardResults = await llms.vector.search<DashboardSearchResult>({
      query: query.query,
      collection: 'grafana.core.dashboards',
      topK: limit,
    });

    const dashboardResultActions = dashboardResults.map((result) => {
      return {
        id: `vector/dashboard${result.payload.url}`,
        name: result.payload.title,
        section: 'Dashboards',
        priority: 1,
        url: result.payload.url,
        subtitle: result.payload.folder_title,
      };
    });

    // search dashboards
    const docsResults = await llms.vector.search<DocsSearchResult>({
      query: query.query,
      collection: 'grafana.docs',
      topK: limit,
    });

    const docsResultActions = docsResults.map((result) => {
      return {
        id: `vector/docs${result.payload.url}`,
        name: result.payload.title,
        section: 'Docs',
        priority: 1,
        url: result.payload.url,
        subtitle: result.payload.content.substring(0, 50),
      };
    });

    return [...dashboardResultActions, ...docsResultActions];
  }
}
