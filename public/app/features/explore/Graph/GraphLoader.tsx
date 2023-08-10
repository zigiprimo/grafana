import { css, keyframes } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { Skeleton } from 'app/features/logs/components/SkeletonLoader';

export interface GraphLoaderProps {
  width: number;
  height: number;
}

export const GraphLoader = ({ width, height }: GraphLoaderProps) => {
  const theme = useTheme2();
  const styles = getStyles(theme, width, '100%');

  return (
    <div className={styles.container}>
      <div className={styles.svgContainer}>
        <svg version="1.1" width={width} height={'100%'} xmlns="http://www.w3.org/2000/svg" className={styles.svgLine}>
          <path
            d={generatePath(width, height)}
            className="line"
            strokeWidth="4"
            fill="transparent"
            strokeLinejoin="round"
          ></path>
        </svg>
      </div>

      <div className={styles.seriesContainer}>
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

function generatePath(width: number, height: number) {
  let path = `M 0 ${height}`;
  const heightLimit = height - 30;

  for (let i = 10; i <= width; i += 20) {
    const point = getRandomInt(10, heightLimit);
    path += ` L ${i} ${point}`;
  }

  return path;
}

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

const dash = (width: number) => keyframes`
  from {
    stroke-dashoffset: ${width * 15};
  }
  to {
    stroke-dashoffset: 0;
  }
`;

function getStyles(theme: GrafanaTheme2, width: number, height: number | string) {
  return {
    svgLine: css`
      .line {
        stroke-dasharray: ${width * 15};
        stroke-dashoffset: ${width * 15};
        stroke: ${theme.colors.background.secondary};
        animation: ${dash(width)} 10s linear infinite;
      }
    `,
    container: css`
      width: ${width};
      height: ${height};

      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 0px 8px 8px;
      gap: ${theme.spacing(2)};
      min-height: ${theme.spacing(15)};
    `,
    svgContainer: css`
      height: 100%;
      border-left: 1px solid ${theme.colors.border.weak};
      border-bottom: 1px solid ${theme.colors.border.weak};
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
      height: 20px;
      background-color: ${theme.colors.background.secondary};
    `,
    seriesIcon: css`
      background: ${theme.visualization.getColorByName('')};
      width: 14px;
      height: 4px;
      border-radius: ${theme.shape.radius.pill};
    `,
  };
}
