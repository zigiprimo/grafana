import { set } from 'lodash';

import { MiscSrv } from '@grafana/runtime';

import { contextSrv, ContextSrv } from './core/services/context_srv';

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
}
