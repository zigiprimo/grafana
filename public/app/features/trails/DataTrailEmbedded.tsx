import React from 'react';

import { DataTrailEmbeddedState, getDataSourceSrv } from '@grafana/runtime';
import { SceneComponentProps, SceneObjectBase } from '@grafana/scenes';

import { DataTrail } from './DataTrail';
import { getDataTrailsApp } from './DataTrailsApp';
import { OpenEmbeddedTrailEvent } from './shared';

export class DataTrailEmbedded extends SceneObjectBase<DataTrailEmbeddedState> {
  static Component = DataTrailEmbeddedRenderer;

  public trail: DataTrail;

  constructor(state: DataTrailEmbeddedState) {
    super(state);

    this.trail = buildDataTrailFromState(state);
    this.trail.addActivationHandler(() => {
      this.trail.subscribeToEvent(OpenEmbeddedTrailEvent, this.onOpenTrail);
    });
  }

  onOpenTrail = () => {
    getDataTrailsApp().goToUrlForTrail(this.trail.clone({ embedded: false }));
  };
}

function DataTrailEmbeddedRenderer({ model }: SceneComponentProps<DataTrailEmbedded>) {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <model.trail.Component model={model.trail} />
    </div>
  );
}

export function buildDataTrailFromState({ metric, filters, dsRef, timeRange }: DataTrailEmbeddedState) {
  const ds = getDataSourceSrv().getInstanceSettings(dsRef);

  return new DataTrail({
    $timeRange: timeRange,
    metric,
    initialDS: ds?.uid,
    initialFilters: filters,
    embedded: true,
  });
}
