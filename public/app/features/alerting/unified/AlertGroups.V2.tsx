import { css } from '@emotion/css';
import { format, formatDistance } from 'date-fns';
import { isEqual } from 'lodash';
import pluralize from 'pluralize';
import React from 'react';
import { useToggle } from 'react-use';

import { GrafanaTheme2 } from '@grafana/data';
import { Alert, Collapse, Icon, LoadingPlaceholder, Stack, Text, useStyles2 } from '@grafana/ui';
import { useQueryParams } from 'app/core/hooks/useQueryParams';

import { getMessageFromError } from '../../../core/utils/errors';
import {
  AlertmanagerAlert,
  AlertmanagerChoice,
  AlertmanagerGroup,
  AlertState,
} from '../../../plugins/datasource/alertmanager/types';

import { alertmanagerApi } from './api/alertmanagerApi';
import { AlertLabels } from './components/AlertLabels';
import { AlertmanagerPageWrapper } from './components/AlertingPageWrapper';
import { CollapseToggle } from './components/CollapseToggle';
import { AlertGroupAlertsTable } from './components/alert-groups/AlertGroupAlertsTable';
import { AlertGroupFilter } from './components/alert-groups/AlertGroupFilter';
import { AlertStateTag } from './components/rules/AlertStateTag';
import { AmAlertStateTag } from './components/silences/AmAlertStateTag';
import { useAlertmanager } from './state/AlertmanagerContext';
import { GRAFANA_RULES_SOURCE_NAME } from './utils/datasource';
import { getFiltersFromUrlParams } from './utils/misc';

const AlertGroups = () => {
  const { useGetAlertmanagerChoiceStatusQuery } = alertmanagerApi;

  const { selectedAlertmanager } = useAlertmanager();

  const [queryParams] = useQueryParams();
  const { groupBy = [] } = getFiltersFromUrlParams(queryParams);
  const styles = useStyles2(getStyles);

  const { currentData: amConfigStatus } = useGetAlertmanagerChoiceStatusQuery();

  const {
    data: alertGroups = [],
    isLoading,
    isError,
    error,
  } = alertmanagerApi.endpoints.getAlertmanagerAlertGroups.useQuery(
    {
      amSourceName: selectedAlertmanager || '',
    },
    { skip: !selectedAlertmanager, pollingInterval: 60 * 1000 }
  );

  const combinedAlertGroups = useCombinedAlertGroups(alertGroups);

  const grafanaAmDeliveryDisabled =
    selectedAlertmanager === GRAFANA_RULES_SOURCE_NAME &&
    amConfigStatus?.alertmanagersChoice === AlertmanagerChoice.External;

  return (
    <>
      <AlertGroupFilter groups={alertGroups} />
      {isLoading && <LoadingPlaceholder text="Loading notifications" />}
      {isError && (
        <Alert title={'Error loading notifications'} severity={'error'}>
          {getMessageFromError(error) || 'Unknown error'}
        </Alert>
      )}

      {grafanaAmDeliveryDisabled && (
        <Alert title="Grafana alerts are not delivered to Grafana Alertmanager">
          Grafana is configured to send alerts to external alertmanagers only. No alerts are expected to be available
          here for the selected Alertmanager.
        </Alert>
      )}

      {combinedAlertGroups.map((group) => {
        return (
          <React.Fragment key={`${JSON.stringify(group.labels)}`}>
            <CombinedGroup group={group} />
          </React.Fragment>
        );
      })}
      {!alertGroups.length && <p>No results.</p>}
    </>
  );
};

function CombinedGroup({ group }: { group: CombinedAlertGroup }) {
  const styles = useStyles2(getCombinedGroupStyles);
  const [collapsed, toggleCollapsed] = useToggle(false);

  return (
    <Stack direction="column" gap={2}>
      <Collapse
        label={
          <Stack direction="column" grow={1}>
            <Stack direction="row" justifyContent="space-between">
              <AlertLabels labels={group.labels} size="sm" />
              <CombinedGroupStatus group={group} />
            </Stack>
            <Stack direction="row" gap={2}>
              {group.receivers.map((receiver) => (
                <div key={receiver.name} className={styles.contactPoint}>
                  <Icon name="message" size="md" className={styles.contactPointIcon} />
                  {receiver.name}
                </div>
              ))}
            </Stack>
          </Stack>
        }
        collapsible={true}
        isOpen={collapsed}
        onToggle={toggleCollapsed}
      >
        <GroupAlerts alerts={group.alerts} />
      </Collapse>
    </Stack>
  );
}

const getCombinedGroupStyles = (theme: GrafanaTheme2) => ({
  contactPoint: css({
    // padding: theme.spacing(0.5, 1),
    // border: `1px solid ${theme.colors.border.weak}`,
  }),
  contactPointIcon: css({
    marginRight: theme.spacing(1),
  }),
});

function CombinedGroupStatus({ group }: { group: CombinedAlertGroup }) {
  const styles = useStyles2(getCombinedGroupStatusStyles);

  const firingCount = group.alerts.filter((alert) => alert.status.state === AlertState.Active).length;
  const suppressedCount = group.alerts.filter((alert) => alert.status.state === AlertState.Suppressed).length;
  const unprocessedCount = group.alerts.filter((alert) => alert.status.state === AlertState.Unprocessed).length;

  const total = group.alerts.length;

  return (
    <Stack direction="row" gap={0.5}>
      <Text>{pluralize('alert', total, true)}:</Text>
      {!!firingCount && <Text color="error">{firingCount} firing</Text>}
      {!!suppressedCount && <Text color="info">{suppressedCount} suppressed</Text>}
      {!!unprocessedCount && <Text color="secondary">{unprocessedCount} unprocessed</Text>}
    </Stack>
  );
}

const getCombinedGroupStatusStyles = (theme: GrafanaTheme2) => ({});

function GroupAlerts({ alerts }: { alerts: AlertmanagerAlert[] }) {
  const styles = useStyles2(getGroupAlertsStyles);

  return (
    <div className={styles.container}>
      <div></div>
      <div>State</div>
      <div>Instance</div>
      {alerts.map((alert) => (
        <GroupAlertsAlert key={alert.fingerprint} alert={alert} />
      ))}
    </div>
  );
}

function GroupAlertsAlert({ alert }: { alert: AlertmanagerAlert }) {
  const styles = useStyles2(getGroupAlertsStyles);
  const [collapsed, toggleCollapsed] = useToggle(true);

  return (
    <>
      <CollapseToggle isCollapsed={collapsed} onToggle={toggleCollapsed} />
      <div>
        <AmAlertStateTag state={alert.status.state} />
      </div>
      <AlertLabels labels={alert.labels} size="sm" />
      {!collapsed && (
        <div className={styles.expanded}>
          <Stack direction="row" gap={2}>
            <div>Started {formatDistance(alert.startsAt, new Date())}</div>
            <div>Updated {formatDistance(alert.updatedAt, new Date())}</div>
            <div>Ends {formatDistance(alert.endsAt, new Date())}</div>
          </Stack>
        </div>
      )}
    </>
  );
}

const getGroupAlertsStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'grid',
    gridTemplateColumns: 'min-content min-content auto',
    gap: theme.spacing(1),
  }),
  expanded: css({
    gridColumn: '2 / -1',
  }),
});

interface CombinedAlertGroup {
  labels: Record<string, string>;
  alerts: AlertmanagerAlert[];
  receivers: Array<{ name: string }>;
}

function useCombinedAlertGroups(alertGroups: AlertmanagerGroup[]): CombinedAlertGroup[] {
  return React.useMemo(
    () =>
      alertGroups.reduce<CombinedAlertGroup[]>((acc, alertGroup) => {
        const matchingGroup = acc.find((cg) => isEqual(cg.labels, alertGroup.labels));
        if (matchingGroup) {
          matchingGroup.receivers.push({ name: alertGroup.receiver.name });
        } else {
          acc.push({
            labels: alertGroup.labels,
            alerts: alertGroup.alerts,
            receivers: [{ name: alertGroup.receiver.name }],
          });
        }
        return acc;
      }, []),
    [alertGroups]
  );
}

const AlertGroupsPage = () => (
  <AlertmanagerPageWrapper navId="groups" accessType="instance">
    <AlertGroups />
  </AlertmanagerPageWrapper>
);

const getStyles = (theme: GrafanaTheme2) => ({
  groupingBanner: css({
    margin: theme.spacing(2, 0),
  }),
});

export default AlertGroupsPage;
