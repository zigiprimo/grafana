import { CorrelationsData, DataLinkTransformationConfig, ScopedVars } from '@grafana/data';
import { CorrelationsSrv } from '@grafana/runtime';

import { getTransformationVars as _getTransformationVars } from './transformations';
import { getCorrelationsBySourceUIDs as _getCorrelationsBySourceUIDs } from './utils';

/**
 * Exposed to plugins
 */
export class CorrelationsService implements CorrelationsSrv {
  getCorrelationsBySourceUIDs(sourceUIDs: string[]): Promise<CorrelationsData> {
    return _getCorrelationsBySourceUIDs(sourceUIDs);
  }

  getTransformationVars(
    transformation: DataLinkTransformationConfig,
    fieldValue: string,
    fieldName: string
  ): ScopedVars {
    return _getTransformationVars(transformation, fieldValue, fieldName);
  }
}
