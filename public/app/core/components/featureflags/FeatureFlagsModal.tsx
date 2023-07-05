import { css } from '@emotion/css';
import React from 'react';
import { useAsync } from 'react-use';

import { GrafanaTheme2 } from '@grafana/data';
import { getBackendSrv, config } from '@grafana/runtime';
import { Modal, useStyles2, Spinner, Tag } from '@grafana/ui';
import store from 'app/core/store';

import { FeatureFlag, LocalFlags } from './types';

export interface FeatureFlagsModalProps {
  onDismiss: () => void;
}

export const FeatureFlagsModal = ({ onDismiss }: FeatureFlagsModalProps): JSX.Element => {
  const styles = useStyles2(getStyles);

  const info = useAsync(getFlagInfo, [])

  return (
    <Modal title="Feature flags" isOpen onDismiss={onDismiss} onClickBackdrop={onDismiss}>
      {info.loading ? <Spinner /> : info.error ? <div>ERROR</div> : <div>
        SHOW INFO!<br />
        {info.value && <div>
          <h3>SERVER (can not change)</h3>
          <ul className={styles.tagList}>
          {info.value.server.map((v) => (<li key={v.name}>
            <Tag  name={v.name} about={v.description} color="blue"/>  
          </li>))}
          </ul>

          <h3>LOCAL</h3>
          {info.value.server.map((v) => (<div key={v.name}>{v.name}</div>))}

          <h3>FRONTEND (can be</h3>
          {info.value.frontend.map((v) => (<div key={v.name}>{v.name}</div>))}
        </div>}
      </div>}
    </Modal>
  );
};


async function getFlagInfo() {
  const info = await getBackendSrv().get<FeatureFlag[]>('/api/featureflags');
  info.forEach(f => f.enabled = (config.featureToggles as any)[f.name]); // sets the 
  const server: FeatureFlag[] = []; // configured on the server
  const local: FeatureFlag[] = []; // only on this browser
  const frontend: FeatureFlag[] = []; // can be set on this browser
  const localFlags = store.getObject<LocalFlags>('grafana.localFeatureToggles') ?? {};

  for (const f of info) {
    f.enabled = (config.featureToggles as any)[f.name];
    f.enabledByDefault = f.expression === 'true';
    if (f.frontend) {
      f.local = localFlags[f.name] === true;
      if (f.local) {
        local.push(f);
      } else {
        frontend.push(f);
      }
    } else if (f.enabled) {
      server.push(f);
    }
  }

  return {
    local,
    server,
    frontend,
  }
}



function getStyles(theme: GrafanaTheme2) {
  return {
    tagList: css`
    list-style: none;
    `,
    categories: css`
      font-size: ${theme.typography.bodySmall.fontSize};
      display: flex;
      flex-flow: row wrap;
      justify-content: space-between;
      align-items: flex-start;
    `,
    shortcutCategory: css`
      width: 50%;
      font-size: ${theme.typography.bodySmall.fontSize};
    `,
    shortcutTable: css`
      margin-bottom: ${theme.spacing(2)};
    `,
    shortcutTableCategoryHeader: css`
      font-weight: normal;
      font-size: ${theme.typography.h6.fontSize};
      text-align: left;
    `,
    shortcutTableDescription: css`
      text-align: left;
      color: ${theme.colors.text.disabled};
      width: 99%;
      padding: ${theme.spacing(1, 2)};
    `,
    shortcutTableKeys: css`
      white-space: nowrap;
      width: 1%;
      text-align: right;
      color: ${theme.colors.text.primary};
    `,
    shortcutTableKey: css`
      display: inline-block;
      text-align: center;
      margin-right: ${theme.spacing(0.5)};
      padding: 3px 5px;
      font: 11px Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      line-height: 10px;
      vertical-align: middle;
      border: solid 1px ${theme.colors.border.medium};
      border-radius: ${theme.shape.borderRadius(3)};
      color: ${theme.colors.text.primary};
      background-color: ${theme.colors.background.secondary};
    `,
  };
}
