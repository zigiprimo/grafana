import { css, cx } from '@emotion/css';
import React from 'react';
import { useLocation } from 'react-router-dom';

import { GrafanaTheme2, PageLayoutType } from '@grafana/data';
import { SceneComponentProps, SceneDebugger } from '@grafana/scenes';
import { CustomScrollbar, Stack, useStyles2 } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { getNavModel } from 'app/core/selectors/navModel';
import { useSelector } from 'app/types';

import { DashboardScene } from './DashboardScene';
import { NavToolbarActions } from './NavToolbarActions';

interface Props {
  model: DashboardScene;
}

export function DashboardSceneLayoutWrapper({ model }: SceneComponentProps<DashboardScene>) {
  const { body, viewPanelScene, isEditing } = model.useState();
  const styles = useStyles2(getStyles);

  if (viewPanelScene) {
    return <viewPanelScene.Component model={viewPanelScene} />;
  }

  if (isEditing) {
    return (
      <div className={styles.editWrapper}>
        <div className={styles.controls}>Layout: Grid</div>
        <div className={styles.body}>
          <body.Component model={body} />
        </div>
      </div>
    );
  }

  return <body.Component model={body} />;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    editWrapper: css({
      label: 'canvas-content',
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(0, 2),
      border: `1px solid ${theme.colors.border.weak}`,
      flexBasis: '100%',
      flexGrow: 1,
    }),
    controls: css({
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(2, 0),
    }),

    body: css({
      label: 'body',
      flexGrow: 1,
      display: 'flex',
      gap: '8px',
      marginBottom: theme.spacing(2),
    }),
  };
}
