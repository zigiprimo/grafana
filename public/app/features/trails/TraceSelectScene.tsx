import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  PanelBuilders,
  SceneCSSGridLayout,
  SceneCSSGridItem,
  SceneQueryRunner,
  SceneDataNode,
} from '@grafana/scenes';
import { Text, useStyles2, InlineSwitch } from '@grafana/ui';
import { TempoQuery } from '@grafana-plugins/tempo/types';

import { ByFrameRepeater } from './ActionTabs/ByFrameRepeater';
import { SelectServiceNameAction } from './SelectServiceName';
import { trailDS } from './shared';
import { getColorByIndex } from './utils';

export interface TraceSelectSceneState extends SceneObjectState {
  body: SceneCSSGridLayout;
  showHeading?: boolean;
  searchQuery?: string;
  showPreviews?: boolean;
}

const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export class TraceSelectScene extends SceneObjectBase<TraceSelectSceneState> {
  constructor(state: Partial<TraceSelectSceneState>) {
    super({
      body: state.body ?? new SceneCSSGridLayout({ children: [] }),
      showPreviews: true,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.setState({
      body: this.buildBody(),
    });
  }

  private buildBody() {
    return new SceneCSSGridLayout({
      children: [
        new ByFrameRepeater({
          $data: new SceneQueryRunner({
            datasource: trailDS,
            queries: [buildQuery()],
          }),
          body: new SceneCSSGridLayout({
            templateColumns: GRID_TEMPLATE_COLUMNS,
            autoRows: '200px',
            children: [],
          }),
          getLayoutChild: (data, frame, frameIndex) => {
            console.log(data);
            return new SceneCSSGridItem({
              body: PanelBuilders.timeseries()
                .setTitle(getLabelValue(frame))
                .setData(new SceneDataNode({ data: { ...data, series: [frame] } }))
                .setColor({ mode: 'fixed', fixedColor: getColorByIndex(frameIndex) })
                .setOption('legend', { showLegend: false })
                .setCustomFieldConfig('fillOpacity', 9)
                .setHeaderActions(new SelectServiceNameAction({ frame }))
                .build(),
            });
          },
        }),
      ],
    });
  }

  public onTogglePreviews = () => {
    this.setState({ showPreviews: !this.state.showPreviews });
    this.setState({ body: this.buildBody() });
  };

  public static Component = ({ model }: SceneComponentProps<TraceSelectScene>) => {
    const { showHeading, showPreviews } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        {showHeading && (
          <div className={styles.headingWrapper}>
            <Text variant="h4">Select a metric</Text>
          </div>
        )}
        <div className={styles.header}>
          {/*<Input placeholder="Search metrics" value={searchQuery} onChange={model.onSearchChange} />*/}
          <InlineSwitch showLabel={true} label="Show previews" value={showPreviews} onChange={model.onTogglePreviews} />
        </div>
        <model.state.body.Component model={model.state.body} />
      </div>
    );
  };
}

function getLabelValue(frame: DataFrame) {
  const name = frame.fields[1]?.name;

  if (!name) {
    return 'No name';
  }
  return name;
}

function buildQuery(): TempoQuery {
  return {
    refId: 'A',
    query: `{} | rate() by (resource.service.name)`,
    queryType: 'metrics',
    filters: [],
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
    }),
    headingWrapper: css({
      marginTop: theme.spacing(1),
    }),
    header: css({
      flexGrow: 0,
      display: 'flex',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(1),
    }),
  };
}
