import { BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react';
import { lastValueFrom } from 'rxjs';

import { isTruthy } from '@grafana/data';
import { BackendSrvRequest, getBackendSrv } from '@grafana/runtime';
import { DeleteDashboardResponse } from 'app/features/manage-dashboards/types';
import { GENERAL_FOLDER_UID } from 'app/features/search/constants';
import { getFolderChildren } from 'app/features/search/service/folders';
import { DashboardViewItem } from 'app/features/search/types';
import { DashboardDTO, DescendantCount, DescendantCountDTO, FolderDTO } from 'app/types';

import { DashboardTreeSelection } from '../types';

interface RequestOptions extends BackendSrvRequest {
  manageError?: (err: unknown) => { error: unknown };
  showErrorAlert?: boolean;
}

function createBackendSrvBaseQuery({ baseURL }: { baseURL: string }): BaseQueryFn<RequestOptions> {
  async function backendSrvBaseQuery(requestOptions: RequestOptions) {
    try {
      const { data: responseData, ...meta } = await lastValueFrom(
        getBackendSrv().fetch({
          ...requestOptions,
          url: baseURL + requestOptions.url,
          showErrorAlert: requestOptions.showErrorAlert,
        })
      );
      return { data: responseData, meta };
    } catch (error) {
      return requestOptions.manageError ? requestOptions.manageError(error) : { error };
    }
  }

  return backendSrvBaseQuery;
}

export const browseDashboardsAPI = createApi({
  reducerPath: 'browseDashboardsAPI',
  tagTypes: ['folderChildren'],
  baseQuery: createBackendSrvBaseQuery({ baseURL: '/api' }),
  endpoints: (builder) => ({
    deleteDashboard: builder.mutation<
      DeleteDashboardResponse,
      {
        uid: string;
        parentUID?: string;
      }
    >({
      invalidatesTags: (_result, _error, args) => [{ type: 'folderChildren', id: `${args.parentUID}` }],
      query: ({ uid }) => ({
        url: `/dashboards/uid/${uid}`,
        method: 'DELETE',
      }),
    }),
    deleteFolder: builder.mutation<
      void,
      {
        uid: string;
        parentUID?: string;
      }
    >({
      invalidatesTags: (_result, _error, args) => [{ type: 'folderChildren', id: `${args.parentUID}` }],
      query: ({ uid }) => ({
        url: `/folders/${uid}`,
        method: 'DELETE',
        params: {
          // TODO: Once backend returns alert rule counts, set this back to true
          // when this is merged https://github.com/grafana/grafana/pull/67259
          forceDeleteRules: false,
        },
      }),
    }),
    getFolder: builder.query<FolderDTO, string>({
      query: (folderUID) => ({ url: `/folders/${folderUID}`, params: { accesscontrol: true } }),
    }),
    getFolderChildren: builder.query<DashboardViewItem[], string | undefined>({
      providesTags: (_result, _error, arg) => [{ type: 'folderChildren', id: `${arg}` }],
      queryFn: async (folderUID) => {
        // Need to handle the case where the parentUID is the root
        const uid = folderUID === GENERAL_FOLDER_UID ? undefined : folderUID;
        const children = await getFolderChildren(uid, undefined, true);
        return {
          data: children,
        };
      },
    }),
    getAffectedItems: builder.query<DescendantCount, DashboardTreeSelection>({
      queryFn: async (selectedItems) => {
        const folderUIDs = Object.keys(selectedItems.folder).filter((uid) => selectedItems.folder[uid]);

        const promises = folderUIDs.map((folderUID) => {
          return getBackendSrv().get<DescendantCountDTO>(`/api/folders/${folderUID}/counts`);
        });

        const results = await Promise.all(promises);

        const totalCounts = {
          folder: Object.values(selectedItems.folder).filter(isTruthy).length,
          dashboard: Object.values(selectedItems.dashboard).filter(isTruthy).length,
          libraryPanel: 0,
          alertRule: 0,
        };

        for (const folderCounts of results) {
          totalCounts.folder += folderCounts.folder;
          totalCounts.dashboard += folderCounts.dashboard;
          totalCounts.alertRule += folderCounts.alertrule ?? 0;

          // TODO enable these once the backend correctly returns them
          // totalCounts.libraryPanel += folderCounts.libraryPanel;
        }

        return { data: totalCounts };
      },
    }),
    // TODO we can define this return type properly
    moveDashboard: builder.mutation<
      unknown,
      {
        uid: string;
        parentUID?: string;
        destinationUID: string;
      }
    >({
      invalidatesTags: (_result, _error, args) => [
        { type: 'folderChildren', id: `${args.destinationUID}` },
        { type: 'folderChildren', id: `${args.parentUID}` },
      ],
      queryFn: async ({ uid, destinationUID }, _api, _extraOptions, baseQuery) => {
        const fullDash: DashboardDTO = await getBackendSrv().get(`/api/dashboards/uid/${uid}`);

        const options = {
          dashboard: fullDash.dashboard,
          folderUid: destinationUID,
          overwrite: false,
        };

        return baseQuery({
          url: '/dashboards/db',
          method: 'POST',
          data: {
            message: '',
            ...options,
          },
        });
      },
    }),
    // TODO this doesn't return void, find where the correct type is
    moveFolder: builder.mutation<
      void,
      {
        uid: string;
        destinationUID: string;
        parentUID?: string;
      }
    >({
      invalidatesTags: (_result, _error, args) => [
        { type: 'folderChildren', id: `${args.destinationUID}` },
        { type: 'folderChildren', id: `${args.parentUID}` },
      ],
      query: ({ uid, destinationUID }) => ({
        url: `/folders/${uid}/move`,
        method: 'POST',
        data: { parentUid: destinationUID },
      }),
    }),
  }),
});

export const {
  endpoints,
  useDeleteDashboardMutation,
  useDeleteFolderMutation,
  useGetAffectedItemsQuery,
  useGetFolderQuery,
  useGetFolderChildrenQuery,
  useLazyGetFolderChildrenQuery,
  useMoveDashboardMutation,
  useMoveFolderMutation,
} = browseDashboardsAPI;
export { skipToken } from '@reduxjs/toolkit/query/react';
