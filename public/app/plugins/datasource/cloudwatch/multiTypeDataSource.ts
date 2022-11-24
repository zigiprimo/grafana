import { Observable } from 'rxjs';

import {
  DataQuery,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  DataSourcePlugin,
} from '@grafana/data/src/types';

export type DataSourceTypeName = string;

export interface MultiTypeDataSourceQuery extends DataQuery {
  type: DataSourceTypeName;
}

export class MultiTypeDatasource extends DataSourceApi<MultiTypeDataSourceQuery> {
  constructor(instanceSettings: DataSourceInstanceSettings<any>) {
    super(instanceSettings);
  }

  query(options: DataQueryRequest<MultiTypeDataSourceQuery>): Observable<DataQueryResponse> {
    return {} as Observable<DataQueryResponse>;
  }

  testDatasource(): Promise<any> {
    throw new Error('Method not implementedd');
  }
}

export class MultiTypeDataSourcePlugin extends DataSourcePlugin<MultiTypeDatasource, MultiTypeDataSourceQuery> {
  datasources: Record<string, DataSourcePlugin<any>> = {};
  constructor() {
    super(MultiTypeDatasource);
  }

  setDataSourcePlugins(datasource: DataSourcePlugin<any>) {
    this.datasources = datasources;
    return this;
  }
}
