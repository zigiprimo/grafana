import { config } from '@grafana/runtime';
import {
  SceneDataProvider,
  SceneDataProviderResult,
  SceneDataState,
  SceneDataTransformer,
  SceneObjectBase,
  SceneQueryRunner,
} from '@grafana/scenes';
import { PanelModel } from 'app/features/dashboard/state';
import { SHARED_DASHBOARD_QUERY } from 'app/plugins/datasource/dashboard';

import { ShareQueryDataProvider } from '../scene/ShareQueryDataProvider';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';
import { Unsubscribable } from 'rxjs';
import { getQueryRunnerFor } from './utils';

export function createPanelDataProvider(panel: PanelModel): SceneDataProvider | undefined {
  // Skip setting query runner for panels without queries
  if (!panel.targets?.length) {
    return undefined;
  }

  // Skip setting query runner for panel plugins with skipDataQuery
  if (config.panels[panel.type]?.skipDataQuery) {
    return undefined;
  }

  let dataProvider: SceneDataProvider | undefined = undefined;

  if (panel.datasource?.uid === SHARED_DASHBOARD_QUERY) {
    dataProvider = new ShareQueryDataProvider({ query: panel.targets[0] });
  } else {
    dataProvider = new SceneQueryRunner({
      datasource: panel.datasource ?? undefined,
      queries: panel.targets,
      maxDataPoints: panel.maxDataPoints ?? undefined,
      maxDataPointsFromWidth: true,
      dataLayerFilter: {
        panelId: panel.id,
      },
    });
  }

  return new DashboardDataProvider({
    $data: new SceneDataTransformer({
      $data: dataProvider,
      transformations: panel.transformations || [],
    }),
  });
}

interface DashboardDataProviderState extends SceneDataState {
  $data: SceneDataProvider;
}

export class DashboardDataProvider extends SceneObjectBase<DashboardDataProviderState> implements SceneDataProvider {
  private _results = new ReplaySubject<SceneDataProviderResult>();
  private _dataSub?: Unsubscribable;

  constructor(state: DashboardDataProviderState) {
    super(state);
    this.addActivationHandler(this._onActivate);
  }

  private _onActivate = () => {
    const data = this.state.$data;
    if (!data) {
      throw new Error('No data provider');
    }

    this._dataSub = data.subscribeToState((state) => {
      console.log('DashboardDataProvider data change rfrom ac', data.state.key);
      this._results.next({ origin: this, data: state.data! });
      this.setState({ data: state.data });
    });

    // this.subscribeToState(this._onStateChanged);

    return () => {
      if (this._dataSub) {
        this._dataSub.unsubscribe();
        this._dataSub = undefined;
      }
    };
  };

  // private _onStateChanged: SceneStateChangedHandler<DashboardDataProviderState> = (n, p) => {
  //   // console.log('DashboardDataProvider._onStateChanged', n.$data, p.$data);
  //   if (n.$data !== p.$data) {
  //     console.log('DashboardDataProvider._onStateChanged');
  //     if (this._dataSub) {
  //       this._dataSub.unsubscribe();
  //       this._dataSub = undefined;
  //     }
  //     this._dataSub = n.$data.subscribeToState((state) => {
  //       this._results.next({ origin: this, data: state.data });
  //       this.setState({ data: state.data });
  //     });
  //     console.log('Setting data');
  //     this.setState({ data: n.$data.state.data });
  //   }
  // };

  public setContainerWidth(width: number) {
    if (this.state.$data && this.state.$data.setContainerWidth) {
      this.state.$data.setContainerWidth(width);
    }
  }

  public isDataReadyToDisplay() {
    if (this.state.$data && this.state.$data.isDataReadyToDisplay) {
      return this.state.$data.isDataReadyToDisplay();
    }

    return true;
  }

  public cancelQuery() {
    if (this.state.$data && this.state.$data.cancelQuery) {
      this.state.$data.cancelQuery();
    }
  }

  public getResultsStream() {
    return this._results;
  }

  public getDataProvider(): SceneQueryRunner | ShareQueryDataProvider | undefined {
    let provider: SceneQueryRunner | ShareQueryDataProvider | undefined;
    let dataObj: SceneDataProvider | undefined = this.state.$data;

    if (dataObj instanceof SceneDataTransformer) {
      dataObj = dataObj.state.$data;
    }

    if (dataObj instanceof SceneQueryRunner || dataObj instanceof ShareQueryDataProvider) {
      provider = dataObj;
    }

    return provider;
  }

  public getQueryRunner(): SceneQueryRunner {
    // let runner: SceneQueryRunner;
    let dataObj: SceneDataProvider | undefined = this.state.$data;

    return getQueryRunnerFor(dataObj)!;
    // if (dataObj instanceof SceneDataTransformer) {
    //   dataObj = dataObj.state.$data;
    // }

    // if (dataObj instanceof ShareQueryDataProvider) {
    //   runner = dataObj.state.$data as SceneQueryRunner;
    // }

    // if (dataObj instanceof SceneQueryRunner) {
    //   runner = dataObj;
    // }

    // return runner!;
  }

  public getDataTransformer(): SceneDataTransformer | undefined {
    let dataObj: SceneDataProvider | undefined = this.state.$data;
    if (dataObj instanceof SceneDataTransformer) {
      return dataObj;
    }

    return undefined;
  }
}
