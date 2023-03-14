import React from 'react';
import { useAsync } from 'react-use';

import { PanelProps } from '@grafana/data';
import { TagList } from '@grafana/ui';
import { useCombinedRule } from 'app/features/alerting/unified/hooks/useCombinedRule';
import { fetchPromAndRulerRulesAction } from 'app/features/alerting/unified/state/actions';
import { GRAFANA_RULES_SOURCE_NAME } from 'app/features/alerting/unified/utils/datasource';
import { labelsToTags } from 'app/features/alerting/unified/utils/labels';
import { useDispatch } from 'app/types';

import { AlertRulePanelOptions } from './options';

export function AlertRulePanel(props: PanelProps<AlertRulePanelOptions>) {
  const dispatch = useDispatch();

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

  return (
    <div>
      {rule.name}
      <TagList tags={labelsToTags(rule.labels)} />
    </div>
  );
}
