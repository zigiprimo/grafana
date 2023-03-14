import { PanelPlugin } from '@grafana/data';

import { AlertRulePanel } from './AlertRulePanel';
import { AlertRulePanelOptions } from './options';

export const plugin = new PanelPlugin<AlertRulePanelOptions>(AlertRulePanel).setPanelOptions((builder) => {
  builder.addTextInput({
    name: 'RuleUID',
    path: 'ruleUid',
    category: ['Options'],
  });
});
