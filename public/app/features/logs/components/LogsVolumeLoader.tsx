import { css, keyframes } from '@emotion/css';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { Skeleton } from './SkeletonLoader';

const columnWidth = 15;

export const LogsVolumeLoader = () => {
  const styles = useStyles2(getStyles);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const columns = useMemo(() => Array.from({ length: Math.floor(width / (columnWidth * 1.5)) }, () => null), [width]);

  useEffect(() => {
    if (!containerRef?.current?.clientWidth) {
      return;
    }
    setWidth(containerRef?.current?.clientWidth);
  }, [containerRef?.current?.clientWidth]);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.graphContainer}>
        <div className={styles.columnsContainer}>
          {columns.map((_, idx) => (
            <div key={idx} className={styles.column(getRandomInt(0, 100), columnWidth, idx)}>
              <Skeleton skewInDegrees="170deg" />
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className={styles.seriesContainer}>
        <div className={styles.seriesItem}>
          <div className={styles.seriesIcon}></div>
          <div className={styles.skeletonContainer}>
            <Skeleton />
          </div>
        </div>
        <div className={styles.seriesItem}>
          <div className={styles.seriesIcon}></div>
          <div className={styles.skeletonContainer}>
            <Skeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

const columnTransition = (height: number) => keyframes`
  0% {
    max-height: 0;
  }
  50%,
  100% {
    max-height: ${height}px;
  }
`;

function getStyles(theme: GrafanaTheme2) {
  return {
    graphContainer: css`
      border-bottom: 1px solid ${theme.colors.border.strong};
      width: 100%;
      height: 100%;
      margin-left: ${theme.spacing(2.5)}px;
    `,
    columnsContainer: css`
      display: flex;
      flex-wrap: nowrap;
      width: 100%;
      height: 100%;
      align-items: flex-end;
      justify-content: space-between;
    `,
    column: (height: number, width: number, delay: number) => css`
      width: ${width}px;
      height: ${height}%;
      // animation-name: ${columnTransition(height)};
      // animation-duration: 0.1s;
      // animation-delay: ${delay / 10}s;
      // animation-iteration-count: 1;
      background-color: ${theme.colors.background.secondary};
    `,
    seriesContainer: css`
      display: flex;
      align-items: center;
      gap: ${theme.spacing(2)};
    `,
    seriesItem: css`
      display: flex;
      gap: ${theme.spacing(1)};
      align-items: center;
    `,
    skeletonContainer: css`
      width: 50px;
      height: ${theme.spacing(1)};
      background-color: ${theme.colors.background.secondary};
    `,
    container: css`
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 0px 8px 8px;
      gap: ${theme.spacing(2)};
      height: 100%;
      min-height: 160px;
    `,
    seriesIcon: css`
      background: ${theme.visualization.getColorByName('')};
      width: 14px;
      height: 4px;
      border-radius: ${theme.shape.radius.pill};
    `,
  };
}

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}
