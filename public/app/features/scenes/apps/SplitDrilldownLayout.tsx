import React from 'react';

import {
  SceneComponentProps,
  SceneFlexLayout,
  SceneObject,
  SceneObjectBase,
  SceneObjectStatePlain,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
} from '@grafana/scenes';

export interface SplitDrilldownLayoutState extends SceneObjectStatePlain {
  handler?: string;
  body: SceneFlexLayout;
  currentSceneHandler?: string;
  getDrillDownScene: (drilldown: string) => SceneObject;
}

export class SplitDrilldownLayout extends SceneObjectBase<SplitDrilldownLayoutState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['handler'] });

  public constructor(state: SplitDrilldownLayoutState) {
    super(state);

    this.addActivationHandler(() => {
      this._subs.add(this.subscribeToState(() => this.updateScene()));
      this.updateScene();
    });
  }

  public getUrlState(state: SplitDrilldownLayoutState) {
    return { handler: state.handler };
  }

  public updateFromUrl(values: SceneObjectUrlValues) {
    if (typeof values.handler === 'string') {
      this.setState({ handler: decodeURIComponent(values.handler) });
    } else if (this.state.handler) {
      this.setState({ handler: undefined });
    }
  }

  private updateScene() {
    const { body, handler, getDrillDownScene, currentSceneHandler } = this.state;

    // if we have a handler update layout to show the drilldown scene
    if (handler && currentSceneHandler !== handler) {
      const drilldownScene = getDrillDownScene(handler);
      body.setState({ children: [body.state.children[0], drilldownScene] });
      this.setState({ currentSceneHandler: handler });
      return;
    }

    // Remove drilldown
    if (!handler && currentSceneHandler) {
      body.setState({ children: [body.state.children[0]] });
      this.setState({ currentSceneHandler: undefined });
    }
  }

  public static Component = ({ model }: SceneComponentProps<SplitDrilldownLayout>) => {
    const { body } = model.state;

    return <body.Component model={body} />;
  };
}
