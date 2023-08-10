import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Icon, useStyles2 } from '@grafana/ui';
import { Skeleton } from 'app/features/logs/components/SkeletonLoader';

import { autoColor } from './components/Theme';

export const TraceViewLoader = () => {
  const styles = useStyles2(getStyles);

  return (
    <>
      <h6 className={styles.panelHeader}>Trace</h6>

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.titleContainer}>
            <Skeleton />
          </div>
          <div className={styles.headerActions}>
            <div className={styles.headerButton}>
              <Skeleton />
            </div>
            <div className={styles.headerButton}>
              <Skeleton />
            </div>
          </div>
        </div>

        <div className={styles.subtitle}>
          <div className={styles.timestamp}>
            <Skeleton />
          </div>

          <div className={styles.tagMeta}>
            <Skeleton />
          </div>
          <div className={styles.tagMeta}>
            <Skeleton />
          </div>

          <div className={styles.urlMeta}></div>
        </div>
      </header>

      <div className={styles.spanFilters}>
        <div className={styles.spanFiltersCollapse}>
          <Icon name="angle-right" />
          <div>Span Filters</div>
        </div>

        <div className={styles.spanFiltersActions}>
          <div className={styles.spanFilterButton}>
            <Skeleton />
          </div>
          <div className={styles.spanFilterButton}>
            <Skeleton />
          </div>
        </div>
      </div>

      <div className={styles.traceTimelineViewer}>
        <div className={styles.timeline}>
          <Skeleton />
        </div>

        <div className={styles.serviceAndOperation}>
          <div className={styles.serviceAndOperationTitle}>
            <h4>Service &amp; Operation</h4>
            <Icon size="xl" name="angle-down" />
            <Icon size="xl" name="angle-right" />
            <Icon size="xl" name="angle-double-down" />
            <Icon size="xl" name="angle-double-right" />
          </div>
        </div>

        <div className={styles.serviceViewer}>
          <div className={styles.serviceViewerItem}>
            <Icon name="angle-down" />
            <div className={styles.serviceName}>
              <Skeleton />
            </div>

            <div className={styles.serviceViewerTimeline}>
              <div className={styles.timelineContainer} style={{ width: '100%' }}>
                <Skeleton />
              </div>
            </div>
          </div>

          <div className={styles.serviceViewerItem} style={{ marginLeft: '3rem' }}>
            <div className={styles.serviceName}>
              <Skeleton />
            </div>

            <div className={styles.serviceViewerTimeline}>
              <div className={styles.timelineContainer} style={{ width: '75%', marginLeft: '30px' }}>
                <Skeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    panelHeader: css`
      margin-bottom: 0px;
      padding: 0px 8px;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      font-size: 1rem;
      font-weight: 500;
    `,
    header: css`
      label: TracePageHeader;
      background-color: ${theme.colors.background.primary};
      padding: 0.5em 0 0 0;
      position: sticky;
      top: 0;
    `,
    titleRow: css`
      align-items: flex-start;
      justify-content: space-between;
      display: flex;
      padding: 0 8px;
    `,
    titleContainer: css`
      min-width: 200px;
      height: 24px;
      background-color: ${theme.colors.background.secondary};
    `,
    headerActions: css`
      display: flex;
      gap: 0.5rem;
    `,
    headerButton: css`
      width: 83px;
      height: 24px;
      background-color: ${theme.colors.background.secondary};
    `,
    subtitle: css`
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 1rem;
      margin: 0.5em 0.5em 0.75em 0.5em;
    `,
    timestamp: css`
      height: 18px;
      width: 175px;
      background-color: ${theme.colors.background.secondary};
    `,
    tagMeta: css`
      height: 22px;
      width: 35px;
      background-color: ${theme.colors.background.secondary};
    `,
    urlMeta: css`
      height: 18px;
      width: 360px;
      background-color: ${theme.colors.background.secondary};
    `,
    spanFilters: css`
      border: 1px solid ${theme.colors.border.weak};
      border-left: none;
      border-right: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 6px;
    `,
    spanFiltersCollapse: css`
      display: flex;
      align-items: center;
      gap: 1rem;
    `,
    spanFiltersActions: css`
      display: flex;
      gap: 0.5rem;
    `,
    spanFilterButton: css`
      width: 42px;
      height: 24px;
      background-color: ${theme.colors.background.secondary};
    `,
    traceTimelineViewer: css`
      // border-bottom: 1px solid ${autoColor(theme, '#bbb')};
    `,
    timeline: css`
      margin-top: 14px;
      height: 60px;
      width: 100%;
      background-color: ${theme.colors.background.secondary};
    `,
    serviceAndOperation: css`
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
    `,
    serviceAndOperationTitle: css`
      display: flex;
      align-items: center;
      gap: 1rem;

      h4 {
        margin-bottom: 0;
      }
    `,
    serviceViewer: css`
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `,
    serviceName: css`
      padding: 0 0.25rem 0 0.5rem;
      position: relative;
      flex: 25%;

      & div {
        width: 122px;
        height: 20px;
        background-color: ${theme.colors.background.secondary};
      }

      &::before {
        content: ' ';
        position: absolute;
        top: 4px;
        bottom: 4px;
        left: -2px;
        border-left: 4px solid;
        border-left-color: inherit;
      }
    `,
    serviceViewerItem: css`
      display: flex;
      gap: 0.25rem;
      justify-content: space-between;
      align-items: center;
    `,
    serviceViewerTimeline: css`
      flex: 50%;
    `,
    timelineContainer: css`
      height: 10px;
      background-color: ${theme.colors.background.secondary};
      border-radius: ${theme.shape.radius.pill};
    `,
  };
}
