import { CorrelationsData, DataLinkTransformationConfig, ScopedVars } from '@grafana/data';

let singletonInstance: CorrelationsSrv;

export interface CorrelationsSrv {
  getCorrelationsBySourceUIDs(sourceUIDs: string[]): Promise<CorrelationsData>;
  getTransformationVars(
    transformation: DataLinkTransformationConfig,
    fieldValue: string,
    fieldName: string
  ): ScopedVars;
}

export function setCorrelationsSrv(instance: CorrelationsSrv) {
  singletonInstance = instance;
}

export function getCorrelationsSrv(): CorrelationsSrv {
  return singletonInstance;
}
