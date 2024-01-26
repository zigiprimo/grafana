import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneQueryRunner,
  PanelBuilders,
  SceneFlexItem,
  SceneDataTransformer,
  SceneFlexLayout,
} from '@grafana/scenes';
import { GraphDrawStyle } from '@grafana/schema/dist/esm/common/common.gen';
import { TempoQuery } from '@grafana-plugins/tempo/types';

import { trailDS } from './shared';

export interface TraceTimeSeriesPanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
  query: TempoQuery;
}

export class TraceTimeSeriesPanel extends SceneObjectBase<TraceTimeSeriesPanelState> {
  constructor(state: TraceTimeSeriesPanelState) {
    super(state);

    if (!state.panel) {
      this.setState({
        panel: this.getVizPanelFor(state.query),
      });
    }
  }

  private getVizPanelFor(query: TempoQuery) {
    return new SceneFlexLayout({
      direction: 'row',
      children: [
        new SceneFlexItem({
          $data: new SceneQueryRunner({
            datasource: trailDS,
            maxDataPoints: 500,
            queries: [query],
          }),
          body: PanelBuilders.timeseries() //
            .setTitle('Query')
            .setOption('legend', { showLegend: false })
            .setCustomFieldConfig('drawStyle', GraphDrawStyle.Points)
            .setCustomFieldConfig('fillOpacity', 9)
            .setData(
              new SceneDataTransformer({
                transformations: [
                  {
                    id: 'partitionByValues',
                    options: {
                      fields: ['status'],
                      naming: {
                        asLabels: false,
                      },
                    },
                  },
                ],
              })
            )
            .build(),
        }),
      ],
    });
  }

  public static Component = ({ model }: SceneComponentProps<TraceTimeSeriesPanel>) => {
    const { panel } = model.useState();

    if (!panel) {
      return;
    }

    return <panel.Component model={panel} />;
  };
}
