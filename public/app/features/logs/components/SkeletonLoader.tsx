import { css, keyframes } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

export interface SkeletonProps {
  skewInDegrees?: string;
  size?: GrafanaTheme2['spacing'];
}

export const Skeleton = ({ skewInDegrees = '155deg' }: SkeletonProps) => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.skeletonContainer}>
      <div className={styles.skeleton(skewInDegrees)}></div>
    </div>
  );
};

const skeletonAnimation = (skewInDegrees: string) => keyframes`
  0% {
    transform: translateX(-100%) skew(${skewInDegrees});
  }
  50%,
  100% {
    transform: translateX(150%) skew(${skewInDegrees});
  }
`;
function getStyles(theme: GrafanaTheme2) {
  return {
    skeletonContainer: css`
      overflow: hidden;
      pointer-events: none;
      position: relative;
      user-select: none;

      height: 100%;
      width: 100%;
    `,
    skeleton: (skewInDegrees: string) => css`
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(
        90deg,
        transparent,
        ${theme.colors.background.primary} 40%,
        ${theme.colors.background.primary} 60%,
        transparent
      );
      transform: translateX(-150%) skew(${skewInDegrees});
      animation-name: ${skeletonAnimation(skewInDegrees)};
      animation-timing-function: cubic-bezier(0.06, 0.42, 0.57, 0.89);
      animation-duration: 3.5s;
      animation-iteration-count: infinite;
    `,
  };
}
