import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { NavLandingPage } from 'app/core/components/AppChrome/NavLandingPage';
import { DataSourcesRoutesContext } from 'app/features/datasources/state';
import { StoreState, useSelector } from 'app/types';

import { ROUTES } from './constants';
import {
  ConnectDataPage,
  DataSourceDashboardsPage,
  DataSourceDetailsPage,
  DataSourcesListPage,
  EditDataSourcePage,
  NewDataSourcePage,
} from './pages';

export default function Connections() {
  const navIndex = useSelector((state: StoreState) => state.navIndex);
  const isConnectDataPageOverriden = Boolean(navIndex['standalone-plugin-page-/connections/connect-data']);

  const YourConnectionsPage =
    navIndex['connections-your-connections'].children && navIndex['connections-your-connections'].children?.length > 1
      ? () => <NavLandingPage navId="connections-your-connections" />
      : () => <Navigate to={ROUTES.DataSources} replace />;

  return (
    <DataSourcesRoutesContext.Provider
      value={{
        New: ROUTES.DataSourcesNew,
        List: ROUTES.DataSources,
        Edit: ROUTES.DataSourcesEdit,
        Dashboards: ROUTES.DataSourcesDashboards,
      }}
    >
      <Routes>
        {/* Redirect to "Connect data" by default */}
        <Route caseSensitive path={ROUTES.Base} element={() => <Navigate to={ROUTES.ConnectData} replace />} />
        <Route caseSensitive path={ROUTES.YourConnections} element={YourConnectionsPage} />
        <Route caseSensitive path={ROUTES.DataSources} element={DataSourcesListPage} />
        <Route caseSensitive path={ROUTES.DataSourcesDetails} element={DataSourceDetailsPage} />
        <Route caseSensitive path={ROUTES.DataSourcesNew} element={NewDataSourcePage} />
        <Route caseSensitive path={ROUTES.DataSourcesEdit} element={EditDataSourcePage} />
        <Route caseSensitive path={ROUTES.DataSourcesDashboards} element={DataSourceDashboardsPage} />

        {/* "Connect data" page - we don't register a route in case a plugin already registers a standalone page for it */}
        {!isConnectDataPageOverriden && <Route caseSensitive path={ROUTES.ConnectData} element={ConnectDataPage} />}

        {/* Not found */}
        <Route element={() => <Navigate to="/notfound" replace />} />
      </Routes>
    </DataSourcesRoutesContext.Provider>
  );
}
