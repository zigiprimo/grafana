import { set } from 'lodash';

import { MiscSrv } from '@grafana/runtime';

import { contextSrv, ContextSrv } from './core/services/context_srv';
import { AccessControlAction } from './types';

export class MiscService implements MiscSrv {
  private contextSrv: ContextSrv;

  constructor(contextSrv: ContextSrv) {
    this.contextSrv = contextSrv;
  }

  getUserFiscalYearStartMonth(): number {
    return this.contextSrv.user.fiscalYearStartMonth;
  }

  setUserFiscalYearStartMonth(value: number) {
    set(contextSrv, 'user.fiscalYearStartMonth', value);
  }

  getUserOrgId(): number {
    return this.contextSrv.user.orgId;
  }

  setUserTimeZone(timezone: string) {
    set(contextSrv, 'user.timezone', timezone);
  }

  canAddPanelToDashboard(): boolean {
    return (
      contextSrv.hasAccess(AccessControlAction.DashboardsCreate, contextSrv.isEditor) ||
      contextSrv.hasAccess(AccessControlAction.DashboardsWrite, contextSrv.isEditor)
    );
  }

  canCreateDashboard(): boolean {
    return contextSrv.hasAccess(AccessControlAction.DashboardsCreate, contextSrv.isEditor);
  }

  canWriteDashboard(): boolean {
    return contextSrv.hasAccess(AccessControlAction.DashboardsWrite, contextSrv.isEditor);
  }

  canCreateDataSource(): boolean {
    return (
      contextSrv.hasPermission(AccessControlAction.DataSourcesCreate) &&
      contextSrv.hasPermission(AccessControlAction.DataSourcesWrite)
    );
  }
}
