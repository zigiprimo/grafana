import { VizPanelBuilder } from '@grafana/scenes';
import { TempoQuery } from '@grafana-plugins/tempo/types';
import { PromQuery } from 'app/plugins/datasource/prometheus/types';

export interface AutoQueryDef {
  variant: string;
  title: string;
  unit: string;
  queries: PromQuery[] | TempoQuery[];
  vizBuilder: VizBuilder;
}

export interface AutoQueryInfo {
  preview: AutoQueryDef;
  main: AutoQueryDef;
  variants: AutoQueryDef[];
  breakdown: AutoQueryDef;
}

export type VizBuilder = () => VizPanelBuilder<{}, {}>;
