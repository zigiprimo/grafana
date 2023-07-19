import React from 'react';
import { useLocation } from 'react-router-dom';

import { GrafanaTheme2, PageLayoutType } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState, VizPanel } from '@grafana/scenes';
import { Page } from 'app/core/components/Page/Page';

import { DashboardScene } from './DashboardScene';

export interface ScenePanelEditorState extends SceneObjectState {
  dashboard: DashboardScene;
  panel: VizPanel;
}

export class ScenePanelEditor extends SceneObjectBase<ScenePanelEditorState> {
  static Component = ScenePanelEditor;
}

export function ScenePanelEditorRenderer({ model }: SceneComponentProps<ScenePanelEditor>) {
  const { dashboard, panel } = model.useState();
  const location = useLocation();

  return (
    <Page navId="scenes" pageNav={dashboard.getPageNav(location)} layout={PageLayoutType.Custom}>
      Panel edit
    </Page>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {};
}
