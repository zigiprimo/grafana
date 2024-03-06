import { css } from '@emotion/css';
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { isEqual } from 'lodash';
import pluralize from 'pluralize';
import React from 'react';
import { useToggle } from 'react-use';

import { GrafanaTheme2 } from '@grafana/data';
import {
  Alert,
  Button,
  Collapse,
  Dropdown,
  getTagColor,
  Icon,
  LoadingPlaceholder,
  Menu,
  Stack,
  Tab,
  TabsBar,
  Text,
  useStyles2,
} from '@grafana/ui';
import { useQueryParams } from 'app/core/hooks/useQueryParams';

import { getMessageFromError } from '../../../core/utils/errors';
import {
  AlertmanagerAlert,
  AlertmanagerChoice,
  AlertmanagerGroup,
  AlertState,
} from '../../../plugins/datasource/alertmanager/types';

import { AlertGroupAnalysis } from './AlertGroupsAnalysis';
import { alertmanagerApi } from './api/alertmanagerApi';
import { AlertLabels } from './components/AlertLabels';
import { AlertStateDot } from './components/AlertStateDot';
import { AlertmanagerPageWrapper } from './components/AlertingPageWrapper';
import { AnnotationDetailsField } from './components/AnnotationDetailsField';
import { CollapseToggle } from './components/CollapseToggle';
import { AlertGroupFilter } from './components/alert-groups/AlertGroupFilter';
import { useAlertmanager } from './state/AlertmanagerContext';
import { Annotation } from './utils/constants';
import { GRAFANA_RULES_SOURCE_NAME } from './utils/datasource';
import { getFiltersFromUrlParams, makeLabelBasedSilenceLink, makeSilenceDetailsLink } from './utils/misc';

const AlertGroups = () => {
  const { useGetAlertmanagerChoiceStatusQuery } = alertmanagerApi;

  const { selectedAlertmanager } = useAlertmanager();

  const [queryParams] = useQueryParams();
  const { groupBy = [] } = getFiltersFromUrlParams(queryParams);
  // const styles = useStyles2(getStyles);

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

  if (!selectedAlertmanager) {
    return <Alert title="No Alertmanager selected" severity="warning" />;
  }

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
            <CombinedGroup group={group} alertmanagerName={selectedAlertmanager} />
          </React.Fragment>
        );
      })}
      {!alertGroups.length && <p>No results.</p>}
    </>
  );
};

function CombinedGroup({ group, alertmanagerName }: { group: CombinedAlertGroup; alertmanagerName: string }) {
  const styles = useStyles2(getCombinedGroupStyles);
  const [collapsed, toggleCollapsed] = useToggle(false);

  return (
    <Stack direction="column" gap={2}>
      <Collapse
        label={
          <Stack direction="column" grow={1}>
            <Stack direction="row" justifyContent="space-between">
              <AlertLabels labels={group.labels} size="sm" color={getTagColor(9).color} />
              <CombinedGroupStatus group={group} />
            </Stack>
            <Stack direction="row" gap={2}>
              {group.receivers.map((receiver) => (
                <div key={receiver.name} className={styles.contactPoint}>
                  <Icon name="message" size="sm" className={styles.contactPointIcon} />
                  <Text variant="bodySmall">{receiver.name}</Text>
                </div>
              ))}
            </Stack>
          </Stack>
        }
        collapsible={true}
        isOpen={collapsed}
        onToggle={toggleCollapsed}
      >
        <GroupAlerts alerts={group.alerts} groupLabels={group.labels} alertmanagerName={alertmanagerName} />
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
      <Text variant="bodySmall">{pluralize('alert', total, true)}:</Text>
      {!!firingCount && (
        <Text variant="bodySmall" color="error">
          {firingCount} firing
        </Text>
      )}
      {!!suppressedCount && (
        <Text variant="bodySmall" color="info">
          {suppressedCount} suppressed
        </Text>
      )}
      {!!unprocessedCount && (
        <Text variant="bodySmall" color="secondary">
          {unprocessedCount} unprocessed
        </Text>
      )}
    </Stack>
  );
}

const getCombinedGroupStatusStyles = (theme: GrafanaTheme2) => ({});

interface GroupAlertsProps {
  alerts: AlertmanagerAlert[];
  groupLabels?: Record<string, string>;
  alertmanagerName: string;
}

function GroupAlerts({ alerts, groupLabels = {}, alertmanagerName }: GroupAlertsProps) {
  const styles = useStyles2(getGroupAlertsStyles);

  return (
    <div className={styles.container}>
      <div></div>
      <div>State</div>
      <div>Instance</div>
      <div></div>
      {alerts.map((alert) => (
        <GroupAlertsAlert
          key={alert.fingerprint}
          alert={alert}
          commonLabels={groupLabels}
          alertmanagerName={alertmanagerName}
        />
      ))}
    </div>
  );
}

interface GroupAlertsAlertProps {
  alert: AlertmanagerAlert;
  commonLabels?: Record<string, string>;
  alertmanagerName: string;
}

function GroupAlertsAlert({ alert, commonLabels, alertmanagerName }: GroupAlertsAlertProps) {
  const styles = useStyles2(getGroupAlertsStyles);
  const [collapsed, toggleCollapsed] = useToggle(true);

  const status = alert.status.state;

  return (
    <>
      <CollapseToggle isCollapsed={collapsed} onToggle={toggleCollapsed} />
      <Stack direction="row">
        {/*<AmAlertStateTag state={alert.status.state} />*/}
        <AlertStateDot color={alertStateToColor(status)} />
        <Text variant="bodySmall">{formatDistanceToNowStrict(alert.startsAt)}</Text>
      </Stack>
      <AlertLabels labels={alert.labels} size="sm" commonLabels={commonLabels} />
      <Dropdown
        overlay={
          <Menu>
            {alert.generatorURL && (
              <Menu.Item label="See source" url={alert.generatorURL} icon="external-link-alt" target="_blank" />
            )}
            {status === AlertState.Active && (
              <Menu.Item
                label="Silence"
                url={makeLabelBasedSilenceLink(alertmanagerName, alert.labels)}
                icon="bell-slash"
              />
            )}
            {status === AlertState.Suppressed && (
              <Menu.Item
                label="Silences details"
                url={makeSilenceDetailsLink(alertmanagerName, alert)}
                icon="bell-slash"
              />
            )}
          </Menu>
        }
      >
        <Button variant="secondary" fill="text" size="sm">
          Actions
          <Icon name="angle-down" />
        </Button>
      </Dropdown>
      {!collapsed && (
        <>
          <div></div>
          <div className={styles.expanded}>
            <ol className={styles.timeline}>
              <li>
                <div className={styles.timestamp}>{formatDistanceToNow(alert.startsAt, { addSuffix: true })}</div>
                <div className={styles.event}>Started Firing</div>
              </li>
              <li>
                <div className={styles.timestamp}>{formatDistanceToNow(alert.updatedAt, { addSuffix: true })}</div>
                <div className={styles.event}>Last update</div>
              </li>
              <li>
                <div className={styles.timestamp}>{formatDistanceToNow(alert.endsAt, { addSuffix: true })}</div>
                <div className={styles.event}>Ends</div>
              </li>
            </ol>
            <AlertAnnotations annotations={alert.annotations} />
          </div>
        </>
      )}
    </>
  );
}

const getGroupAlertsStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'grid',
    gridTemplateColumns: 'min-content max-content 1fr min-content',
    gap: theme.spacing(2),
    alignItems: 'center',
  }),
  expanded: css({
    gridColumn: '2 / -1',
  }),
  timeline: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    listStyleType: 'none',
    fontSize: theme.typography.bodySmall.fontSize,
    '& li': {
      flex: 1,
    },
  }),
  timestamp: css({
    padding: theme.spacing(0, 4, 2, 4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }),
  event: css({
    padding: theme.spacing(2, 4, 0, 4),
    display: 'flex',
    justifyContent: 'center',
    borderTop: `2px solid ${theme.colors.border.strong}`,
    position: 'relative',
    '&::before': {
      content: '""',
      width: theme.spacing(1.5),
      height: theme.spacing(1.5),
      backgroundColor: theme.colors.error.main,
      borderRadius: theme.shape.radius.circle,
      outline: `${theme.spacing(0.25)} solid ${theme.colors.border.strong}`,
      position: 'absolute',
      top: -8,
    },
  }),
});

function AlertAnnotations({ annotations }: { annotations: Record<string, string> }) {
  const styles = useStyles2(getAlertAnnotationsStyles);

  const runbookUrl = annotations[Annotation.runbookURL];
  const summary = annotations[Annotation.summary];
  const description = annotations[Annotation.description];

  return (
    <div>
      <div className={styles.annotationName}>Summary</div>
      <div className={styles.annotationValue}>{summary}</div>
      <div className={styles.annotationName}>Description</div>
      <div className={styles.annotationValue}>{description}</div>
    </div>
  );
}

const getAlertAnnotationsStyles = (theme: GrafanaTheme2) => ({
  annotationName: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  }),
  annotationValue: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.primary,
  }),
});

function alertStateToColor(state: AlertState) {
  switch (state) {
    case AlertState.Active:
      return 'error';
    case AlertState.Suppressed:
      return 'info';
    case AlertState.Unprocessed:
      return 'warning';
    default:
      return 'info';
  }
}

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

function ActiveNotifications() {
  const styles = useStyles2(getActiveNotificationsStyles);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'insights'>('overview');

  return (
    <>
      <TabsBar className={styles.tabs}>
        <Tab
          key="overview"
          label="Overview"
          onChangeTab={() => setActiveTab('overview')}
          active={activeTab === 'overview'}
        />
        <Tab
          key="insights"
          label="Insights"
          onChangeTab={() => setActiveTab('insights')}
          active={activeTab === 'insights'}
        />
      </TabsBar>
      {activeTab === 'overview' && <AlertGroups />}
      {activeTab === 'insights' && <AlertGroupAnalysis />}
    </>
  );
}

const getActiveNotificationsStyles = (theme: GrafanaTheme2) => ({
  tabs: css({
    marginBottom: theme.spacing(2),
  }),
});

const AlertGroupsPage = () => {
  return (
    <AlertmanagerPageWrapper navId="groups" accessType="instance">
      <ActiveNotifications />
    </AlertmanagerPageWrapper>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  groupingBanner: css({
    margin: theme.spacing(2, 0),
  }),
});

export default AlertGroupsPage;
