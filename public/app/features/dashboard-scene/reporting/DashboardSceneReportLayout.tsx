import React from 'react';

import {
  SceneObjectState,
  SceneObject,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectRef,
  SceneGridLayout,
} from '@grafana/scenes';
import { Box, Stack, ToolbarButton } from '@grafana/ui';

import { getDashboardSceneFor } from '../utils/utils';

import { DashboardLinksControls } from './DashboardLinksControls';

interface ReportLayoutState extends SceneObjectState {
  ref: SceneObjectRef<SceneGridLayout>;
  grids: SceneGridLayout[];
}
export class ReportLayout extends SceneObjectBase<ReportLayoutState> {
  public constructor(state: ReportLayoutState) {
    super(state);

    this.addActivationHandler(this._activationHandler.bind(this));
  }

  public _activationHandler() {
    const mainGrid = this.state.ref.resolve();
    mainGrid.activate();
  }

  public static Component = ({ model }: SceneComponentProps<ReportLayout>) => {
    const { grids } = model.useState();

    return (
      <div>
        {grids.map((c) => (
          <>
            <c.Component model={c} key={c.state.key} />
            <div style={{ pageBreakAfter: 'always' }}></div>
          </>
        ))}
      </div>
    );
  };
}
