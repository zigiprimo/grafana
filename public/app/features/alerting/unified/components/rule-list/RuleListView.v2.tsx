import { css } from '@emotion/css';
import { chain, flatMap } from 'lodash';
import React, { PropsWithChildren, ReactNode, useEffect, useMemo } from 'react';
import { useAsyncFn, useInterval, useToggle } from 'react-use';

import { GrafanaTheme2, IconName } from '@grafana/data';
import { Stack } from '@grafana/experimental';
import { Badge, Button, Dropdown, Icon, Link, Menu, Text, Tooltip, useStyles2 } from '@grafana/ui';
// import { AlertLabels } from '../AlertLabels';
import { dispatch } from 'app/store/store';

import { useCombinedRuleNamespaces } from '../../hooks/useCombinedRuleNamespaces';
import { useUnifiedAlertingSelector } from '../../hooks/useUnifiedAlertingSelector';
import { fetchAllPromAndRulerRulesAction } from '../../state/actions';
import { RULE_LIST_POLL_INTERVAL_MS } from '../../utils/constants';
import { getAllRulesSourceNames } from '../../utils/datasource';
import { MetaText } from '../MetaText';
import { Spacer } from '../Spacer';
import { Strong } from '../Strong';

const RuleList = () => {
  const styles = useStyles2(getStyles);

  // 1. fetch all alerting data sources
  // 2. perform feature discovery for each
  // 3. fetch all rules for each discovered DS

  const { data, isLoading, refetch } = useFetchAllNamespacesAndGroups();
  useInterval(refetch, RULE_LIST_POLL_INTERVAL_MS);

  console.log('isLoading', isLoading, 'data', data);

  return (
    <ul className={styles.rulesTree} role="tree">
      {data.map(([namespace, groups], index) => (
        <Namespace key={namespace + index} name={namespace}>
          {groups.map((group, index) => (
            <EvaluationGroup key={group + index} name={group} />
          ))}
        </Namespace>
      ))}
      {/* <Namespace name="Demonstrations">
        <EvaluationGroup name={'default'} interval={'5 minutes'}>
          <AlertRuleListItem
            state="normal"
            name={'CPU Usage'}
            summary="The CPU usage is too high – investigate immediately!"
          />
          <AlertRuleListItem state="pending" name={'Memory Usage'} summary="Memory Usage too high" />
          <AlertRuleListItem state="firing" name={'Network Usage'} summary="network congested" />
        </EvaluationGroPup>

        <EvaluationGroup name={'system metrics'} interval={'1 minute'}>
          <AlertRuleListItem name={'email'} summary="gilles.demey@grafana.com" />
        </EvaluationGroup>
      </Namespace>

      <Namespace name="Network">
        <EvaluationGroup name={'UniFi Router'} provenance={'file'} interval={'2 minutes'}>
          <AlertRuleListItem name={'CPU Usage'} summary="doing way too much work" isProvisioned={true} />
          <AlertRuleListItem name={'Memory Usage'} isProvisioned={true} />
        </EvaluationGroup>
      </Namespace>

      <Namespace name="System Metrics">
        <EvaluationGroup name={'eu-west-1'} interval={'2 minutes'} />
        <EvaluationGroup name={'us-east-0'} interval={'5 minutes'} />
      </Namespace>

      <Namespace icon="prometheus" name=" dev-us-central-0">
        <EvaluationGroup name={'access_grafanacom'} interval={'1 minute'} />
        <EvaluationGroup name={'access_stackstateservice'} interval={'1 minute'} />
      </Namespace> */}
    </ul>
  );
};

function useFetchAllNamespacesAndGroups() {
  const rulesDataSourceNames = useMemo(getAllRulesSourceNames, []);

  const promRuleRequests = useUnifiedAlertingSelector((state) => state.promRules);
  const rulerRuleRequests = useUnifiedAlertingSelector((state) => state.rulerRules);

  const combinedNamespaces = useCombinedRuleNamespaces();

  const loading = rulesDataSourceNames.some(
    (name) => promRuleRequests[name]?.loading || rulerRuleRequests[name]?.loading
  );

  const promRequests = Object.entries(promRuleRequests);
  const allPromLoaded = promRequests.every(
    ([_, state]) => state.dispatched && (state?.result !== undefined || state?.error !== undefined)
  );
  const allPromEmpty = promRequests.every(([_, state]) => state.dispatched && state?.result?.length === 0);

  // Trigger data refresh only when the RULE_LIST_POLL_INTERVAL_MS elapsed since the previous load FINISHED
  const [_, fetchRules] = useAsyncFn(async () => {
    if (!loading) {
      dispatch(fetchAllPromAndRulerRulesAction(false, { limitAlerts: 15 }));
    }
  }, [loading, dispatch]);

  // fetch rules, then poll every RULE_LIST_POLL_INTERVAL_MS
  useEffect(() => {
    dispatch(fetchAllPromAndRulerRulesAction(false, { limitAlerts: 15 }));
  }, []);

  // TODO don't merge namespaces from different data sources
  const data = chain(combinedNamespaces)
    .groupBy((ns) => ns.name)
    .mapValues((ns) => flatMap(ns, (group) => flatMap(group.groups, (group) => group.name)))
    .entries()
    .value();

  return {
    isLoading: !allPromLoaded,
    isEmpty: allPromEmpty,
    data,
    refetch: fetchRules,
  };
}

interface EvaluationGroupProps extends PropsWithChildren {
  name: string;
  interval?: string;
  provenance?: string;
  description?: ReactNode;
}

// TODO toggling the namespace makes it forget what groups were toggled, hoist state?
const EvaluationGroup = ({ children, name, provenance, interval }: EvaluationGroupProps) => {
  const styles = useStyles2(getStyles);
  const [isOpen, toggle] = useToggle(false);

  return (
    <div className={styles.groupWrapper} role="treeitem" aria-expanded={isOpen} aria-selected="false">
      <EvaluationGroupHeader
        onToggle={toggle}
        provenance={provenance}
        expanded={isOpen}
        name={name}
        interval={interval}
      />
      {isOpen && <div role="group">{children}</div>}
    </div>
  );
};

interface EvaluationGroupHeaderProps extends EvaluationGroupProps {
  expanded?: boolean;
  onToggle: () => void;
}

const EvaluationGroupHeader = (props: EvaluationGroupHeaderProps) => {
  const { name, description, provenance, interval, expanded = false, onToggle } = props;

  const styles = useStyles2(getStyles);
  const isProvisioned = Boolean(provenance);

  return (
    <div className={styles.headerWrapper}>
      <Stack direction="row" alignItems="center" gap={1}>
        <button className={styles.hiddenButton} type="button" onClick={onToggle}>
          <Stack alignItems="center" gap={1}>
            <Icon name={expanded ? 'angle-down' : 'angle-up'} />
            <Text variant="body">{name}</Text>
          </Stack>
        </button>
        {isProvisioned && <Badge color="purple" text="Provisioned" />}
        {description && <MetaText>{description}</MetaText>}
        <Spacer />
        <MetaText>
          <Icon name={'history'} size="sm" />
          {interval}
          <span>·</span>
        </MetaText>
        <Button
          variant="secondary"
          size="sm"
          icon="edit"
          type="button"
          disabled={isProvisioned}
          aria-label="edit-group-action"
          data-testid="edit-group-action"
        >
          Edit
        </Button>
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item label="Re-order rules" icon="flip" disabled={isProvisioned} />
              <Menu.Divider />
              <Menu.Item label="Export" icon="download-alt" />
              <Menu.Item label="Delete" icon="trash-alt" destructive disabled={isProvisioned} />
            </Menu>
          }
        >
          <Button
            variant="secondary"
            size="sm"
            icon="ellipsis-h"
            type="button"
            aria-label="more-group-actions"
            data-testid="more-group-actions"
          />
        </Dropdown>
      </Stack>
    </div>
  );
};

interface AlertRuleListItemProps {
  name: string;
  summary?: string;
  error?: string;
  state?: 'normal' | 'pending' | 'firing';
  isProvisioned?: boolean;
}

const AlertRuleListItem = (props: AlertRuleListItemProps) => {
  const { name, summary, state, error, isProvisioned } = props;
  const styles = useStyles2(getStyles);

  const icons: Record<'normal' | 'pending' | 'firing', IconName> = {
    normal: 'check-circle',
    pending: 'circle',
    firing: 'exclamation-circle',
  };

  const color: Record<'normal' | 'pending' | 'firing', 'success' | 'error' | 'warning'> = {
    normal: 'success',
    pending: 'warning',
    firing: 'error',
  };

  return (
    <li className={styles.alertListItemContainer} role="treeitem" aria-selected="false">
      <Stack direction="row" alignItems={'start'} gap={1}>
        <Text color={state ? color[state] : 'secondary'}>
          <Icon name={state ? icons[state] : 'circle'} size="lg" />
        </Text>
        <Stack direction="row" alignItems={'center'} gap={1} flexGrow={1}>
          <Stack direction="column" gap={0.5}>
            <div>
              <Stack direction="column" gap={0}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Link href="/alerting/grafana/-amptgZVk/view">
                    <Text variant="body" color="link" weight="bold">
                      {name}
                    </Text>
                  </Link>
                  {/* <AlertLabels
                    size="sm"
                    labels={{
                      team: 'sysops',
                      type: 'network',
                      vendor: 'ubiquity',
                    }}
                  /> */}
                </Stack>
                {summary && (
                  <Text variant="bodySmall" color="secondary">
                    {summary}
                  </Text>
                )}
              </Stack>
            </div>
            <div>
              <Stack direction="row" gap={1}>
                {error ? (
                  <>
                    {/* TODO we might need an error variant for MetaText, dito for success */}
                    {/* TODO show error details on hover or elsewhere */}
                    <Text color="error" variant="bodySmall" weight="bold">
                      <Stack direction="row" alignItems={'center'} gap={0.5}>
                        <Tooltip
                          content={
                            'failed to send notification to email addresses: gilles.demey@grafana.com: dial tcp 192.168.1.21:1025: connect: connection refused'
                          }
                        >
                          <span>
                            <Icon name="exclamation-circle" /> Last delivery attempt failed
                          </span>
                        </Tooltip>
                      </Stack>
                    </Text>
                  </>
                ) : (
                  <>
                    <MetaText icon="clock-nine">
                      Firing for <Strong>2m 34s</Strong>
                    </MetaText>
                    <MetaText icon="hourglass">
                      Next evaluation in <Strong>34s</Strong>
                    </MetaText>
                  </>
                )}
              </Stack>
            </div>
          </Stack>
          <Spacer />
          <MetaText icon="layer-group">9</MetaText>
          <Button
            variant="secondary"
            size="sm"
            icon="edit"
            type="button"
            disabled={isProvisioned}
            aria-label="edit-rule-action"
            data-testid="edit-rule-action"
          >
            Edit
          </Button>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item label="Silence" icon="bell-slash" />
                <Menu.Divider />
                <Menu.Item label="Export" disabled={isProvisioned} icon="download-alt" />
                <Menu.Item label="Delete" disabled={isProvisioned} icon="trash-alt" destructive />
              </Menu>
            }
          >
            <Button
              variant="secondary"
              size="sm"
              icon="ellipsis-h"
              type="button"
              aria-label="more-rule-actions"
              data-testid="more-rule-actions"
            />
          </Dropdown>
        </Stack>
      </Stack>
    </li>
  );
};

interface NamespaceProps extends PropsWithChildren {
  name: string;
  icon?: 'prometheus'; // TODO add support for loki, mimir, etc
}

// TODO hook up buttons
const Namespace = ({ children, name, icon }: NamespaceProps) => {
  const styles = useStyles2(getStyles);
  const [isOpen] = useToggle(true);

  return (
    <li className={styles.namespaceWrapper} role="treeitem" aria-expanded={isOpen} aria-selected="false">
      <div className={styles.namespaceTitle}>
        <Stack alignItems={'center'}>
          <Stack alignItems={'center'} gap={1}>
            {icon === 'prometheus' && (
              <img
                width={16}
                height={16}
                src="/public/app/plugins/datasource/prometheus/img/prometheus_logo.svg"
                alt="Prometheus"
              />
            )}
            {!icon && <Icon name={isOpen ? 'folder-open' : 'folder'} />}
            <Link href="/dashboards/f/lG5pfeRVk/demonstrations">
              <Text color="link">{name}</Text>
            </Link>
          </Stack>
          <Spacer />
          <Button variant="secondary" size="sm" icon="unlock" type="button" aria-label="edit permissions">
            Edit permissions
          </Button>
        </Stack>
      </div>
      {children && isOpen && (
        <ul role="group" className={styles.groupItemsWrapper}>
          {children}
        </ul>
      )}
    </li>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  rulesTree: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1.5)};
  `,
  groupWrapper: css`
    display: flex;
    flex-direction: column;
  `,
  groupItemsWrapper: css`
    position: relative;
    border-radius: ${theme.shape.radius.default};
    border: solid 1px ${theme.colors.border.weak};
    border-bottom: none;

    margin-left: ${theme.spacing(3)};

    &:before {
      content: '';
      position: absolute;
      height: 100%;

      border-left: solid 1px ${theme.colors.border.weak};

      margin-top: 0;
      margin-left: -${theme.spacing(2.5)};
    }
  `,
  alertListItemContainer: css`
    position: relative;
    list-style: none;
    background: ${theme.colors.background.primary};

    border-bottom: solid 1px ${theme.colors.border.weak};
    padding: ${theme.spacing(1)} ${theme.spacing(1.5)};
  `,
  headerWrapper: css`
    padding: ${theme.spacing(1)} ${theme.spacing(1.5)};

    background: ${theme.colors.background.secondary};

    border: none;
    border-bottom: solid 1px ${theme.colors.border.weak};
    border-top-left-radius: ${theme.shape.radius.default};
    border-top-right-radius: ${theme.shape.radius.default};
  `,
  namespaceWrapper: css`
    display: flex;
    flex-direction: column;

    gap: ${theme.spacing(1.5)};
  `,
  namespaceTitle: css`
    padding: ${theme.spacing(1)} ${theme.spacing(1.5)};

    background: ${theme.colors.background.secondary};

    border: solid 1px ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
  `,
  hiddenButton: css`
    border: none;
    background: transparent;
  `,
});

export default RuleList;
