import React from 'react';
import { useAsync } from 'react-use';

import { ArrayVector, DataFrame, dataFrameFromJSON, dateTime, Field, FieldType, PanelProps } from '@grafana/data';
import { relativeToTimeRange } from '@grafana/data/src/datetime/rangeutil';
import { LegendDisplayMode, ThresholdsMode, VisibilityMode } from '@grafana/schema';
import { TagList, useTheme2 } from '@grafana/ui';
import { TimelineChart } from 'app/core/components/TimelineChart/TimelineChart';
import { TimelineMode } from 'app/core/components/TimelineChart/utils';
import { historyApi } from 'app/features/alerting/unified/api/historyApi';
import { useCombinedRule } from 'app/features/alerting/unified/hooks/useCombinedRule';
import { fetchPromAndRulerRulesAction } from 'app/features/alerting/unified/state/actions';
import { GRAFANA_RULES_SOURCE_NAME } from 'app/features/alerting/unified/utils/datasource';
import { labelsToTags } from 'app/features/alerting/unified/utils/labels';
import { useDispatch } from 'app/types';

import { AlertRulePanelOptions } from './options';

export function AlertRulePanel(props: PanelProps<AlertRulePanelOptions>) {
  const dispatch = useDispatch();
  const theme = useTheme2();
  const { useGetRuleHistoryQuery } = historyApi;

  const from = dateTime().subtract(1, 'h');
  const to = dateTime();
  const { currentData: ruleHistory } = useGetRuleHistoryQuery({
    ruleUid: props.options.ruleUid,
    from: from.unix(),
    to: to.unix(),
  });

  const dataFrame = ruleHistory ? dataFrameFromJSON(ruleHistory) : undefined;
  console.log(dataFrame);

  useAsync(async () => {
    await dispatch(fetchPromAndRulerRulesAction({ rulesSourceName: GRAFANA_RULES_SOURCE_NAME }));
  });

  const ruleRequest = useCombinedRule(
    { uid: props.options.ruleUid, ruleSourceName: GRAFANA_RULES_SOURCE_NAME },
    GRAFANA_RULES_SOURCE_NAME
  );

  const rule = ruleRequest.result;

  if (!rule) {
    return null;
  }

  if (dataFrame) {
    dataFrame.fields = dataFrame.fields.map<Field>((field, fieldIdx) => {
      if (field.name === 'line') {
        return {
          ...field,
          config: {
            color: { mode: 'thresholds' },
            custom: { fillOpacity: 70 },
            thresholds: {
              mode: ThresholdsMode.Absolute,
              steps: [
                {
                  color: '#1B855E',
                  value: 0,
                },
                {
                  color: '#E0226E',
                  value: 1,
                },
              ],
            },
          },
          state: { origin: { fieldIndex: fieldIdx, frameIndex: 0 } },
          values: new ArrayVector(field.values.toArray().map((value) => value.current)),
          type: FieldType.number,
          display: (value: 'Normal' | 'Alerting') => {
            return { numeric: 0, text: value, color: value === 'Alerting' ? '#E0226E' : '#1B855E' };
          },
        };
      }

      return { ...field, config: { custom: { fillOpacity: 70 } } };
    });
  }

  return (
    <div>
      {rule.name}
      <TagList tags={labelsToTags(rule.labels)} />
      {dataFrame && (
        <TimelineChart
          frames={[dataFrame]}
          timeRange={{ from, to, raw: { from, to } }}
          timeZone={props.timeZone}
          mode={TimelineMode.Changes}
          height={300}
          width={500}
          showValue={VisibilityMode.Always}
          theme={theme}
          legend={{ calcs: [], displayMode: LegendDisplayMode.List, placement: 'bottom', showLegend: true }}
        />
      )}
    </div>
  );
}

interface AlertHistoryStateChange {
  current: 'Alerting' | 'Normal';
  previous: 'Normal' | 'Alerting';
}

function isAlertHistoryChange(value: unknown): value is AlertHistoryStateChange {
  const validStates = ['Alerting', 'Normal'];

  const state = value as AlertHistoryStateChange;

  if (validStates.includes(state.current) && validStates.includes(state.previous)) {
    return true;
  }

  return false;
}
