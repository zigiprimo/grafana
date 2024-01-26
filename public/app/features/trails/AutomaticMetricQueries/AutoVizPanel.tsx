import React from 'react';

import { SceneObjectState, SceneObjectBase, SceneComponentProps, VizPanel, SceneQueryRunner } from '@grafana/scenes';
import { RadioButtonGroup } from '@grafana/ui';

import { trailDS } from '../shared';

import { AutoQueryInfo, AutoQueryDef } from './types';

export interface AutoVizPanelState extends SceneObjectState {
  panel?: VizPanel;
  autoQuery: AutoQueryInfo;
  queryDef?: AutoQueryDef;
}

export class AutoVizPanel extends SceneObjectBase<AutoVizPanelState> {
  constructor(state: AutoVizPanelState) {
    super(state);

    if (!state.panel) {
      this.setState({
        panel: this.getVizPanelFor(state.autoQuery.main),
        queryDef: state.autoQuery.main,
      });
    }
  }

  private getQuerySelector(def: AutoQueryDef) {
    const variants = this.state.autoQuery.variants;

    if (variants.length === 0) {
      return;
    }

    const options = variants.map((q) => ({ label: q.variant, value: q.variant }));

    return <RadioButtonGroup size="sm" options={options} value={def.variant} onChange={this.onChangeQuery} />;
  }

  public onChangeQuery = (variant: string) => {
    const def = this.state.autoQuery.variants.find((q) => q.variant === variant)!;

    this.setState({
      panel: this.getVizPanelFor(def),
      queryDef: def,
    });
  };

  private getVizPanelFor(def: AutoQueryDef) {
    return def
      .vizBuilder()
      .setData(
        new SceneQueryRunner({
          datasource: trailDS,
          maxDataPoints: 500,
          queries: def.queries,
        })
      )
      .setHeaderActions(this.getQuerySelector(def))
      .build();
  }

  public static Component = ({ model }: SceneComponentProps<AutoVizPanel>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}
