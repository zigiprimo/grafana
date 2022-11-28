import { Observable } from 'rxjs';

import {
  DataQuery,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  DataSourceJsonData,
  DataSourceOptionsType,
  DataSourcePlugin,
  DataSourceQueryType,
} from '@grafana/data/src/types';
import { DataSourceWithBackend } from '@grafana/runtime';

export type DataSourceTypeName = string;

export interface MultiTypeDataSourceQuery extends DataQuery {
  type: DataSourceTypeName;
}

// export class MultiTypeDatasource extends DataSourceApi<MultiTypeDataSourceQuery> {
//   constructor(instanceSettings: DataSourceInstanceSettings<any>) {
//     super(instanceSettings);
//   }

//   query(options: DataQueryRequest<MultiTypeDataSourceQuery>): Observable<DataQueryResponse> {
//     // this.components
//     return {} as Observable<DataQueryResponse>;
//   }

//   testDatasource(): Promise<any> {
//     throw new Error('Method not implementedd');
//   }
// }

export class MultiTypeDatasource extends DataSourceWithBackend<MultiTypeDataSourceQuery> {
  datasources: Record<string, DataSourcePlugin<any>> = {};
  constructor(instanceSettings: DataSourceInstanceSettings<any>) {
    super(instanceSettings);
  }

  query(options: DataQueryRequest<MultiTypeDataSourceQuery>): Observable<DataQueryResponse> {
    // this.components
    return {} as Observable<DataQueryResponse>;
  }

  testDatasource(): Promise<any> {
    throw new Error('Method not implementedd');
  }
}

export class MultiTypeDataSourcePlugin<
  DSType extends DataSourceApi<TQuery, TOptions>,
  TQuery extends DataQuery = DataSourceQueryType<DSType>,
  TOptions extends DataSourceJsonData = DataSourceOptionsType<DSType>,
  TSecureOptions = {}
> extends DataSourcePlugin<MultiTypeDatasource, MultiTypeDataSourceQuery> {
  plugins: Record<string, DataSourcePlugin<DSType, TQuery, TOptions, TSecureOptions>>;
  constructor() {
    super(MultiTypeDatasource);
  }

  setDataSourcePlugins(datasources: Record<string, DataSourcePlugin<DSType, TQuery, TOptions, TSecureOptions>>) {
    const instance = new this.DataSourceClass({} as any);
    this.plugins = datasources;
    for (const [key, datasource] of Object.entries(datasources)) {
      instance.datasources[key] = new datasource.DataSourceClass({} as any);
    }
    return this;
  }
}
