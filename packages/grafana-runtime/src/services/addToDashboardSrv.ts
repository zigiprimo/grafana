import { DataQuery, DataSourceRef } from '@grafana/data';

export interface AddPanelToDashboardOptions {
  queries: DataQuery[];
  datasource?: DataSourceRef;
  dashboardUid?: string;
  panelType: string;
}

export enum AddToDashboardError {
  FETCH_DASHBOARD = 'fetch-dashboard',
  SET_DASHBOARD_LS = 'set-dashboard-ls-error',
}

export interface AddToDashboardSrv {
  setDashboardInLocalStorage(options: AddPanelToDashboardOptions): Promise<void>;
  removeDashboardFromLocalStorage(): void;
}

let singletonInstance: AddToDashboardSrv;

export function setAddToDashboardSrv(instance: AddToDashboardSrv) {
  singletonInstance = instance;
}

export function getAddToDashboardSrv() {
  return singletonInstance;
}
