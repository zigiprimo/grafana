import React from 'react';

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
  const { scene, panel } = model.useState();

  return <Page navId="scenes" pageNav={pageNav} layout={PageLayoutType.Custom}></Page>;
}

function getStyles(theme: GrafanaTheme2) {
  return {};
}
