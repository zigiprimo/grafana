import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2, NavModelItem } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';

type Props = {
  children: React.ReactNode | React.ReactNode[];
  title?: string;
};

const defaultPageNav: Partial<NavModelItem> = {
  icon: 'bell',
  id: 'alert-rule-view',
  breadcrumbs: [{ title: 'Alert rules', url: 'alerting/list' }],
};

export function RuleViewerLayout(props: Props): JSX.Element | null {
  const { children, title } = props;
  const styles = useStyles2(getPageStyles);

  return (
    <Page pageNav={{ ...defaultPageNav, text: title ?? '' }} navId="alert-list">
      <Page.Contents>
        <div className={styles.content}>{children}</div>
      </Page.Contents>
    </Page>
  );
}

const getPageStyles = (theme: GrafanaTheme2) => {
  return {
    content: css`
      max-width: ${theme.breakpoints.values.xxl}px;
    `,
  };
};
