import { css } from '@emotion/css';
import React, { ReactNode } from 'react';

import { GrafanaTheme2, IconName } from '@grafana/data';
import { Stack } from '@grafana/experimental';
import { Badge, Button, Dropdown, Icon, Link, Menu, Text, Tooltip, useStyles2 } from '@grafana/ui';

import { AlertLabels } from '../AlertLabels';
import { MetaText } from '../MetaText';
import { Spacer } from '../Spacer';
import { Strong } from '../Strong';

const RuleList = () => {
  const styles = useStyles2(getStyles);

  return (
    <Stack direction="column">
      <Namespace name="Demonstrations" />
      <div className={styles.EvaluationGroupWrapper}>
        <Stack direction="column" gap={0}>
          <EvaluationGroupHeader expanded name={'default'} interval={'5 minutes'} />
          <div className={styles.AlertRulesWrapper}>
            <AlertRuleListItem
              state="normal"
              name={'CPU Usage'}
              summary="The CPU usage is too high – investigate immediately!"
            />
            <AlertRuleListItem state="pending" name={'Memory Usage'} summary="Memory Usage too high" />
            <AlertRuleListItem state="firing" name={'Network Usage'} summary="network congested" />
          </div>
        </Stack>
        <Stack direction="column" gap={0}>
          <EvaluationGroupHeader expanded name={'system metrics'} interval={'1 minute'} />
          <div className={styles.AlertRulesWrapper}>
            <AlertRuleListItem name={'email'} summary="gilles.demey@grafana.com" />
          </div>
        </Stack>
      </div>

      <Namespace name="Network" />
      <div className={styles.EvaluationGroupWrapper}>
        <Stack direction="column" gap={0}>
          <EvaluationGroupHeader expanded name={'UniFi Router'} provenance={'file'} interval={'2 minutes'} />
          <div className={styles.AlertRulesWrapper}>
            <Stack direction="column" gap={0}>
              <AlertRuleListItem name={'CPU Usage'} summary="doing way too much work" isProvisioned={true} />
              <AlertRuleListItem name={'Memory Usage'} isProvisioned={true} />
            </Stack>
          </div>
        </Stack>
      </div>

      <Namespace name="System Metrics" />
      <div className={styles.EvaluationGroupWrapper}>
        <Stack direction="column" gap={0}>
          <EvaluationGroupHeader name={'eu-west-1'} interval={'2 minutes'} />
        </Stack>
        <Stack direction="column" gap={0}>
          <EvaluationGroupHeader name={'us-east-0'} interval={'5 minutes'} />
        </Stack>
      </div>
    </Stack>
  );
};

interface EvaluationGroupHeaderProps {
  name: string;
  expanded?: boolean;
  interval?: string;
  provenance?: string;
  description?: ReactNode;
}

const EvaluationGroupHeader = (props: EvaluationGroupHeaderProps) => {
  const { name, description, provenance, interval, expanded = false } = props;

  const styles = useStyles2(getStyles);
  const isProvisioned = Boolean(provenance);

  return (
    <div className={styles.headerWrapper}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Stack alignItems="center" gap={1}>
          <Icon name={expanded ? 'angle-down' : 'angle-up'} />
          <Text variant="body">{name}</Text>
        </Stack>
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
    <div className={styles.alertListItemWrapper}>
      <Stack direction="row" alignItems={'start'} gap={1}>
        <Text color={state ? color[state] : 'secondary'}>
          <Icon name={state ? icons[state] : 'circle'} size="lg" />
        </Text>
        <Stack direction="row" alignItems={'center'} gap={1} flexGrow={1}>
          <Stack direction="column" gap={1}>
            <div className={styles.receiverDescriptionRow}>
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
            <div className={styles.metadataRow}>
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
    </div>
  );
};

interface NamespaceProps {
  name: string;
}

const Namespace = ({ name }: NamespaceProps) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.namespaceWrapper}>
      <Stack alignItems={'center'}>
        <Stack alignItems={'center'} gap={1}>
          <Icon name="folder-open" />
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
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  EvaluationGroupWrapper: css`
    position: relative;
    border-radius: ${theme.shape.borderRadius()};
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
  alertListItemWrapper: css`
    position: relative;
    background: ${theme.colors.background.primary};

    border-bottom: solid 1px ${theme.colors.border.weak};
    padding: ${theme.spacing(1)} ${theme.spacing(1.5)};
  `,
  headerWrapper: css`
    padding: ${theme.spacing(1)} ${theme.spacing(1.5)};

    background: ${theme.colors.background.secondary};

    border-bottom: solid 1px ${theme.colors.border.weak};
    border-top-left-radius: ${theme.shape.borderRadius()};
    border-top-right-radius: ${theme.shape.borderRadius()};
  `,
  namespaceWrapper: css`
    padding: ${theme.spacing(1)} ${theme.spacing(1.5)};

    background: ${theme.colors.background.secondary};

    border: solid 1px ${theme.colors.border.weak};
    border-radius: ${theme.shape.borderRadius()};
  `,
  receiverDescriptionRow: css``,
  metadataRow: css``,
  AlertRulesWrapper: css``,
});

export default RuleList;
