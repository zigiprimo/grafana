import { css } from '@emotion/css';
import React from 'react';
import { useObservable } from 'react-use';

import { Link } from '@grafana/ui';

import { DashboardModel } from '../../state';

export interface Props {
  dashboard: DashboardModel;
}

export function DashboardTOC({ dashboard }: Props) {
  const changed = useObservable(dashboard.visibilityChanged);

  return (
    <div className={styles.wrapper}>
      <ul className={styles.abs}>
        {dashboard.panels.map((v) => {
          return (
            <li key={v.key} className={v.isInView ? styles.inView : ''}>
              <Link onClick={() => console.log('click', v)}>
                {v.title ?? 'Panel'} ({v.id})
              </Link>
            </li>
          );
        })}
        <br />
        {changed}
      </ul>
    </div>
  );
}

export const styles = {
  wrapper: css`
    border: 1px solid red;
    width: 300px;
  `,

  abs: css`
    position: fixed;
    top: 60px;
    padding-left: 30px;
    border: 1px solid green;
  `,

  inView: css`
    background: #444;
  `,
};
