export interface MiscSrv {
  getUserFiscalYearStartMonth(): number;
  setUserFiscalYearStartMonth(value: number): void;
  getUserOrgId(): number;
  setUserTimeZone(timezone: string): void;
}

let singletonInstance: MiscSrv;

export function setMiscSrv(instance: MiscSrv) {
  singletonInstance = instance;
}

export function getMiscSrv() {
  return singletonInstance;
}
