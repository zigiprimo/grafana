import React, { useCallback, useEffect } from 'react';
import { Navigate, Route, RouteChildrenProps, Routes, useLocation } from 'react-router-dom';

import { Alert, withErrorBoundary } from '@grafana/ui';
import { Silence } from 'app/plugins/datasource/alertmanager/types';
import { useDispatch } from 'app/types';

import { featureDiscoveryApi } from './api/featureDiscoveryApi';
import { AlertManagerPicker } from './components/AlertManagerPicker';
import { AlertingPageWrapper } from './components/AlertingPageWrapper';
import { GrafanaAlertmanagerDeliveryWarning } from './components/GrafanaAlertmanagerDeliveryWarning';
import { NoAlertManagerWarning } from './components/NoAlertManagerWarning';
import SilencesEditor from './components/silences/SilencesEditor';
import SilencesTable from './components/silences/SilencesTable';
import { useAlertManagerSourceName } from './hooks/useAlertManagerSourceName';
import { useAlertManagersByPermission } from './hooks/useAlertManagerSources';
import { useSilenceNavData } from './hooks/useSilenceNavData';
import { useUnifiedAlertingSelector } from './hooks/useUnifiedAlertingSelector';
import { fetchAmAlertsAction, fetchSilencesAction } from './state/actions';
import { SILENCES_POLL_INTERVAL_MS } from './utils/constants';
import { AsyncRequestState, initialAsyncRequestState } from './utils/redux';

const Silences = () => {
  const alertManagers = useAlertManagersByPermission('instance');
  const [alertManagerSourceName, setAlertManagerSourceName] = useAlertManagerSourceName(alertManagers);

  const dispatch = useDispatch();
  const silences = useUnifiedAlertingSelector((state) => state.silences);
  const alertsRequests = useUnifiedAlertingSelector((state) => state.amAlerts);
  const alertsRequest = alertManagerSourceName
    ? alertsRequests[alertManagerSourceName] || initialAsyncRequestState
    : undefined;

  const location = useLocation();
  const pageNav = useSilenceNavData();
  const isRoot = location.pathname.endsWith('/alerting/silences');

  const { currentData: amFeatures } = featureDiscoveryApi.useDiscoverAmFeaturesQuery(
    { amSourceName: alertManagerSourceName ?? '' },
    { skip: !alertManagerSourceName }
  );

  useEffect(() => {
    function fetchAll() {
      if (alertManagerSourceName) {
        dispatch(fetchSilencesAction(alertManagerSourceName));
        dispatch(fetchAmAlertsAction(alertManagerSourceName));
      }
    }
    fetchAll();
    const interval = setInterval(() => fetchAll, SILENCES_POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, [alertManagerSourceName, dispatch]);

  const { result, loading, error }: AsyncRequestState<Silence[]> =
    (alertManagerSourceName && silences[alertManagerSourceName]) || initialAsyncRequestState;

  const getSilenceById = useCallback((id: string) => result && result.find((silence) => silence.id === id), [result]);

  const mimirLazyInitError =
    error?.message?.includes('the Alertmanager is not configured') && amFeatures?.lazyConfigInit;

  if (!alertManagerSourceName) {
    return isRoot ? (
      <AlertingPageWrapper pageId="silences" pageNav={pageNav}>
        <NoAlertManagerWarning availableAlertManagers={alertManagers} />
      </AlertingPageWrapper>
    ) : (
      <Navigate to="/alerting/silences" />
    );
  }

  return (
    <AlertingPageWrapper pageId="silences" isLoading={loading} pageNav={pageNav}>
      <AlertManagerPicker
        disabled={!isRoot}
        current={alertManagerSourceName}
        onChange={setAlertManagerSourceName}
        dataSources={alertManagers}
      />
      <GrafanaAlertmanagerDeliveryWarning currentAlertmanager={alertManagerSourceName} />

      {mimirLazyInitError && (
        <Alert title="The selected Alertmanager has no configuration" severity="warning">
          Create a new contact point to create a configuration using the default values or contact your administrator to
          set up the Alertmanager.
        </Alert>
      )}
      {error && !loading && !mimirLazyInitError && (
        <Alert severity="error" title="Error loading silences">
          {error.message || 'Unknown error.'}
        </Alert>
      )}
      {alertsRequest?.error && !alertsRequest?.loading && !mimirLazyInitError && (
        <Alert severity="error" title="Error loading Alertmanager alerts">
          {alertsRequest.error?.message || 'Unknown error.'}
        </Alert>
      )}
      {result && !error && (
        <Routes>
          <Route
            path="/alerting/silences"
            element={
              <SilencesTable
                silences={result}
                alertManagerAlerts={alertsRequest?.result ?? []}
                alertManagerSourceName={alertManagerSourceName}
              />
            }
          />

          <Route
            path="/alerting/silence/new"
            element={<SilencesEditor alertManagerSourceName={alertManagerSourceName} />}
          />
          <Route
            path="/alerting/silence/:id/edit"
            element={({ match }: RouteChildrenProps<{ id: string }>) => {
              return (
                match?.params.id && (
                  <SilencesEditor
                    silence={getSilenceById(match.params.id)}
                    alertManagerSourceName={alertManagerSourceName}
                  />
                )
              );
            }}
          />
        </Routes>
      )}
    </AlertingPageWrapper>
  );
};

export default withErrorBoundary(Silences, { style: 'page' });
