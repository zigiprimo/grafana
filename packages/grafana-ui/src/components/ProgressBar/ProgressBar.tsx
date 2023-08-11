import { css, keyframes } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';

import { useTheme2 } from '../../themes';

interface ProgressBarProps {
  progress?: number;
}

export const ProgressBar = ({ progress = 0 }: ProgressBarProps) => {
  const isCompleted = progress === 100;
  const label = isCompleted ? 'Completed' : `${progress}%`;

  const theme = useTheme2();
  const styles = getBarStyles(theme, progress);

  const fillerClass = isCompleted ? `${styles.completed}` : `${styles.progressBarFiller}`;

  return (
    <div className={styles.progressBarContainer}>
      <div className={fillerClass}>
        <span className={styles.progressBarLabel}>{label}</span>
      </div>
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';

const slide = keyframes`
  0% {
    background-position: 40px 40px; 
  }
  100% {
    background-position: 0 0; 
  }
  `;

export const getBarStyles = (theme: GrafanaTheme2, progress: number) => {
  return {
    progressBarContainer: css({
      backgroundColor: `${theme.colors.background.primary}`,
      margin: 'auto',
      borderRadius: `${theme.shape.radius.default}`,
      overflow: 'hidden',
      height: '20px',
      width: '100%',
      position: 'relative',
      border: `1px solid ${theme.colors.border.weak}`,
      transition: 'width 0.3s',
      animation: `${slide} 2s linear infinite`,
    }),
    progressBarFiller: css({
      height: '100%',
      width: `${progress}%`,
      background: `linear-gradient(
            -45deg,
            ${theme.colors.primary.main} 25%,
            transparent 25%,
            transparent 50%,
            ${theme.colors.primary.main} 50%,
            ${theme.colors.primary.main} 75%,
            transparent 75%
          )`,
      backgroundSize: '40px 40px',
      borderRadius: `${theme.shape.radius.default}`,
      textAlign: 'right',
      position: 'absolute',
      animation: `${slide} 2s linear infinite`,
    }),
    progressBarLabel: css({
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '5px',
      color: 'white',
      fontWeight: 'bold',
    }),
    completed: css({
      backgroundColor: `${theme.colors.primary.main}`,
      animation: 'none',
      height: '100%',
      width: `${progress}%`,
    }),
  };
};
