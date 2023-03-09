import { DataFrameJSON } from '@grafana/data';

import { alertingApi } from './alertingApi';

export const stateHistoryApi = alertingApi.injectEndpoints({
  endpoints: (build) => ({
    getHistory: build.query<DataFrameJSON, { ruleUID: string }>({
      query: (params) => ({ url: '/api/v1/rules/history', params }),
      providesTags: ['AlertmanagerChoice'],
    }),
  }),
});
