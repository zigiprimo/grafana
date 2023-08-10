import { css, keyframes } from '@emotion/css';
import React, { useEffect, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';

import { useTheme2 } from '../../themes';

export interface Spinner2Props {
  size?: number | string;
  inline?: boolean;
  color?: GrafanaTheme2 | string;
}

export const Spinner2 = ({ size = 12, inline = false }: Spinner2Props) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loading && count < 100) {
      const timer = setTimeout(() => {
        setCount(count + 1);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setLoading(false);
    }

    return () => {};
  }, [loading, count]);

  const theme = useTheme2();
  const style = getStyles(theme, size, inline);
  return (
    <div className={style.container}>
      <div className={style.first}>
        <div className={style.second}>
          <div className={style.third}>
            <div className={style.third}></div>
          </div>
        </div>
      </div>

      <div className={style.counter}>{loading ? size === 16 || size === 12 ? '' : <p>{count}</p> : ''}</div>
    </div>
  );
};

const spinnerAnimation = keyframes`
 0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const getStyles = (theme: GrafanaTheme2, size: number | string, inline: boolean) => {
  return {
    container: css({
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      display: inline ? 'inline-block' : 'block',
    }),
    first: css({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      borderLeft: `1px solid ${theme.colors.text.disabled}`,
      borderBottom: `1px solid ${theme.colors.text.disabled}`,
      borderRadius: theme.shape.radius.circle,
      position: 'relative',
      margin: '0 auto',
      animation: `${spinnerAnimation} 3s infinite linear`,
    }),
    second: css({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '85%',
      height: '85%',
      borderLeft: `1px solid ${theme.colors.text.disabled}`,
      borderTop: `1px solid ${theme.colors.text.disabled}`,
      borderRadius: theme.shape.radius.circle,
      position: 'absolute',
      top: '2px',
      left: '2px',
      animation: `${spinnerAnimation} 3s infinite linear`,
    }),
    third: css({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '75%',
      height: '75%',
      borderLeft: `1px solid ${theme.colors.text.disabled}`,
      borderBottom: `1px solid ${theme.colors.text.disabled}`,
      borderRadius: theme.shape.radius.circle,
      position: 'absolute',
      top: '2px',
      left: '2px',
      animation: `${spinnerAnimation} 3s infinite linear`,
    }),
    counter: css({
      position: 'absolute',
      top: '70%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      font: '150 10px system-ui',
      padding: '2rem',
    }),
  };
};
