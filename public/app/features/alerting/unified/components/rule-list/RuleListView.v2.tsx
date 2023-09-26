import { css } from '@emotion/css';
import { produce } from 'immer';
import { groupBy } from 'lodash';
import React, { PropsWithChildren, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import { useToggle } from 'react-use';
import AutoSizer from 'react-virtualized-auto-sizer';

import { GrafanaTheme2, IconName } from '@grafana/data';
import { Stack } from '@grafana/experimental';
import {
  Alert,
  Badge,
  Button,
  Dropdown,
  Icon,
  Link,
  LoadingBar,
  Menu,
  Pagination,
  Text,
  Tooltip,
  useStyles2,
} from '@grafana/ui';
import { AlertRuleSource, RulerDataSourceConfig } from 'app/types/unified-alerting';

import { alertRuleApi } from '../../api/alertRuleApi';
import { fetchRulerRules } from '../../api/ruler';
import { usePagination } from '../../hooks/usePagination';
import { fetchRulesSourceBuildInfo } from '../../state/actions';
import { getAllRulesSourceNames } from '../../utils/datasource';
import { isAlertingRulerRule, isGrafanaRulerRule, isRecordingRulerRule } from '../../utils/rules';
import { MetaText } from '../MetaText';
import { Spacer } from '../Spacer';
import { Strong } from '../Strong';

const GROUPS_PAGE_SIZE = 30;

const RuleList = () => {
  const styles = useStyles2(getStyles);

  // 1. fetch all alerting data sources
  // 2. perform feature discovery for each
  // 3. fetch all rules for each discovered DS

  const { data, isLoading, fetch } = useFetchAllNamespacesAndGroups();
  // useInterval(fetch, 5000);

  useEffect(() => fetch(), [fetch]);

  // in order to do decent pagination we have to flatten all of the groups again for the namespaces.
  const groups = Object.values(data)
    .flatMap((ns) => ns)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((namespace) =>
      namespace.groups.map((group) => ({
        group,
        namespace: namespace.name,
        rulesSource: namespace.rulesSource,
      }))
    );

  const { pageItems, numberOfPages, onPageChange, page } = usePagination(groups, 1, GROUPS_PAGE_SIZE);

  // TODO figure out how to get the interval for a group, make separate HTTP calls?
  const paginatedNamespaces = groupBy(pageItems, (item) => item.namespace);

  return (
    <>
      {/* {isLoading && ( */}
      <AutoSizer disableHeight>
        {({ width }) => (
          <div style={{ width, overflow: 'hidden' }}>
            <LoadingBar width={400} />
          </div>
        )}
      </AutoSizer>
      {/* )} */}
      <ul className={styles.rulesTree} role="tree">
        {Object.entries(paginatedNamespaces).map(([namespace, groups]) => (
          <Namespace key={namespace + groups[0].rulesSource.id} name={namespace}>
            {groups.map(({ group, namespace, rulesSource }) => (
              <EvaluationGroupLoader
                key={namespace + group + rulesSource.id}
                name={group}
                namespace={namespace}
                rulerConfig={rulesSource.rulerConfig}
              />
            ))}
          </Namespace>
        ))}
        {/* <Namespace name="Demonstrations">
          <EvaluationGroup name={'default'} interval={'5 minutes'} isOpen onToggle={() => {}}>
            <AlertRuleListItem
              state="normal"
              name={'CPU Usage'}
              summary="The CPU usage is too high – investigate immediately!"
            />
            <AlertRuleListItem state="pending" name={'Memory Usage'} summary="Memory Usage too high" />
            <AlertRuleListItem state="firing" name={'Network Usage'} summary="network congested" />
            <div className={styles.alertListItemContainer}>
              <Pagination
                hideWhenSinglePage
                currentPage={1}
                numberOfPages={5}
                onNavigate={() => {}}
                className={styles.clearFloat}
              />
            </div>
          </EvaluationGroup>

          <EvaluationGroup name={'system metrics'} interval={'1 minute'} onToggle={() => {}}>
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
      <Pagination numberOfPages={numberOfPages} currentPage={page} onNavigate={onPageChange} hideWhenSinglePage />
    </>
  );
};

interface RulesSourceNamespace {
  name: string;
  groups: string[];
  rulesSource: AlertRuleSource;
}

/**
 * This function will fetch all namespaces and groups for all configured alerting data sources.
 * It will track the namespaces and groups in a record with the datasource ID as the key.
 *
 * This way we can show duplicate namespace names and keep track of where we discovered them.
 */
type NamespacesByDataSource = Record<string, RulesSourceNamespace[]>;
function useFetchAllNamespacesAndGroups() {
  const [isLoading, setLoading] = useState(false);
  const [namespaces, setNamespaces] = useState<NamespacesByDataSource>({});

  const alertRuleSources = useMemo(getAllRulesSourceNames, []);

  // build an Array of lazy promises
  const triggers = useMemo(() => {
    return alertRuleSources.map((rulesSourceName) => async () => {
      // memoize buildinfo
      const buildInfo = await fetchRulesSourceBuildInfo(rulesSourceName);
      // unable to fetch build info, skip data source
      // TODO add support for vanilla Prometheus (data source without ruler API)
      if (!buildInfo.rulerConfig) {
        return;
      }

      const namespacesAndGroups = await fetchRulerRules(buildInfo.rulerConfig);
      const namespacesFromSource = Object.entries(namespacesAndGroups).map(([name, groups]) => {
        return {
          name,
          groups: groups.map((group) => group.name).sort(sortCaseInsensitive),
          rulesSource: buildInfo,
        };
      });

      setNamespaces((namespaces) =>
        produce(namespaces, (draft) => {
          const dataSourceId = String(buildInfo.id);
          draft[dataSourceId] = namespacesFromSource;
        })
      );
    });
  }, [alertRuleSources]);

  const fetch = useCallback(() => {
    setLoading(true);

    const fetchAll = triggers.map((fn) => fn());
    Promise.allSettled(fetchAll).finally(() => {
      console.log('all done');
      setLoading(false);
    });
  }, [setLoading, triggers]);

  return {
    isLoading: isLoading,
    data: namespaces,
    fetch,
  };
}

const sortCaseInsensitive = (a: string, b: string) => a.localeCompare(b);

interface EvaluationGroupLoaderProps {
  name: string;
  interval?: string;
  provenance?: string;
  description?: ReactNode;
  namespace: string;
  rulerConfig?: RulerDataSourceConfig;
}

const ALERT_RULE_PAGE_SIZE = 15;

const EvaluationGroupLoader = ({
  name,
  description,
  provenance,
  interval,
  namespace,
  rulerConfig,
}: EvaluationGroupLoaderProps) => {
  const styles = useStyles2(getStyles);
  const [isOpen, toggle] = useToggle(false);

  // TODO fetch the state of the rule
  const [fetchRulerRuleGroup, { currentData: rulerRuleGroup, isLoading, error }] =
    alertRuleApi.endpoints.rulerRuleGroup.useLazyQuery();

  const { page, pageItems, onPageChange, numberOfPages } = usePagination(
    rulerRuleGroup?.rules ?? [],
    1,
    ALERT_RULE_PAGE_SIZE
  );

  useEffect(() => {
    if (isOpen && rulerConfig) {
      fetchRulerRuleGroup({
        rulerConfig,
        namespace,
        group: name,
      });
    }
  }, [fetchRulerRuleGroup, isOpen, name, namespace, rulerConfig]);

  return (
    <EvaluationGroup
      name={name}
      description={description}
      interval={interval}
      provenance={provenance}
      isOpen={isOpen}
      onToggle={toggle}
    >
      <>
        {error && (
          <div className={styles.alertListItemContainer}>
            <Alert title="Something went wrong when trying to fetch group details">{String(error)}</Alert>
          </div>
        )}
        {isLoading ? (
          <GroupLoadingIndicator />
        ) : (
          pageItems.map((rule, index) => {
            if (isAlertingRulerRule(rule)) {
              return (
                <AlertRuleListItem
                  key={index}
                  state="normal"
                  name={rule.alert}
                  summary={rule.annotations?.['summary']}
                />
              );
            }

            if (isRecordingRulerRule(rule)) {
              return <RecordingRuleListItem key={index} name={rule.record} />;
            }

            if (isGrafanaRulerRule(rule)) {
              return (
                <AlertRuleListItem
                  key={index}
                  name={rule.grafana_alert.title}
                  summary={rule.annotations?.['summary']}
                  isProvisioned={Boolean(rule.grafana_alert.provenance)}
                />
              );
            }

            return null;
          })
        )}
        {numberOfPages > 1 && (
          <div className={styles.alertListItemContainer}>
            <Pagination
              currentPage={page}
              numberOfPages={numberOfPages}
              onNavigate={onPageChange}
              className={styles.clearFloat}
            />
          </div>
        )}
      </>
    </EvaluationGroup>
  );
};

interface EvaluationGroupProps extends PropsWithChildren {
  name: string;
  description?: ReactNode;
  interval?: string;
  provenance?: string;
  isOpen?: boolean;
  onToggle: () => void;
}

const EvaluationGroup = ({
  name,
  description,
  provenance,
  interval,
  onToggle,
  isOpen = false,
  children,
}: EvaluationGroupProps) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.groupWrapper} role="treeitem" aria-expanded={isOpen} aria-selected="false">
      <EvaluationGroupHeader
        onToggle={onToggle}
        provenance={provenance}
        isOpen={isOpen}
        description={description}
        name={name}
        interval={interval}
      />
      {isOpen && <div role="group">{children}</div>}
    </div>
  );
};

const GroupLoadingIndicator = () => (
  <AutoSizer disableHeight>
    {({ width }) => (
      <div style={{ width }}>
        <LoadingBar width={width} />
        <SkeletonListItem />
      </div>
    )}
  </AutoSizer>
);

const SkeletonListItem = () => {
  const styles = useStyles2(getStyles);

  return (
    <li className={styles.alertListItemContainer} role="treeitem" aria-selected="false">
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <Skeleton width={16} height={16} circle />
        <Stack direction="row" alignItems={'center'} gap={1} flexGrow={1}>
          <Stack direction="column" gap={0.5}>
            <div>
              <Skeleton height={16} width={350} />
            </div>
            <div>
              <Skeleton height={10} width={200} />
            </div>
          </Stack>
        </Stack>
      </Stack>
    </li>
  );
};

const EvaluationGroupHeader = (props: EvaluationGroupProps) => {
  const { name, description, provenance, interval, isOpen = false, onToggle } = props;

  const styles = useStyles2(getStyles);
  const isProvisioned = Boolean(provenance);

  return (
    <div className={styles.headerWrapper}>
      <Stack direction="row" alignItems="center" gap={1}>
        <button className={styles.hiddenButton} type="button" onClick={onToggle}>
          <Stack alignItems="center" gap={1}>
            <Icon name={isOpen ? 'angle-down' : 'angle-up'} />
            <Text truncate variant="body">
              {name}
            </Text>
          </Stack>
        </button>
        {isProvisioned && <Badge color="purple" text="Provisioned" />}
        {description && <MetaText>{description}</MetaText>}
        <Spacer />
        {interval && (
          <MetaText>
            <Icon name={'history'} size="sm" />
            {interval}
            <span>·</span>
          </MetaText>
        )}
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

interface RecordingRuleListItemProps {
  name: string;
  error?: string;
  isProvisioned?: boolean;
}

const RecordingRuleListItem = ({ name, error, isProvisioned }: RecordingRuleListItemProps) => {
  const styles = useStyles2(getStyles);

  return (
    <li className={styles.alertListItemContainer} role="treeitem" aria-selected="false">
      <Stack direction="row" alignItems={'center'} gap={1}>
        <Icon name="record-audio" size="lg" />
        <Stack direction="row" alignItems={'center'} gap={1} flexGrow={1}>
          <Stack direction="column" gap={0.5}>
            <div>
              <Stack direction="column" gap={0}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Link href="/alerting/grafana/-amptgZVk/view">
                    <Text truncate variant="body" color="link" weight="bold">
                      {name}
                    </Text>
                  </Link>
                </Stack>
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
                  <></>
                )}
              </Stack>
            </div>
          </Stack>
          <Spacer />
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
      <Stack direction="row" alignItems={'start'} gap={1} wrap={false}>
        <Text color={state ? color[state] : 'secondary'}>
          <Icon name={state ? icons[state] : 'circle'} size="lg" />
        </Text>
        <Stack direction="row" alignItems="flex-start" gap={1} flexGrow={1} wrap={false}>
          <Stack direction="column" gap={0.5}>
            <div>
              <Stack direction="column" gap={0}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Link href="/alerting/grafana/-amptgZVk/view">
                    <Text truncate variant="body" color="link" weight="bold">
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
          <Stack direction="row" alignItems="center" gap={1} wrap={false}>
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
              <Text truncate color="link">
                {name}
              </Text>
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
  clearFloat: css({
    float: 'none',
  }),
});

export default RuleList;
