import { PanelPlugin } from '@grafana/data';

import { ExplorationLogsPanel } from './ExplorationLogsPanel';

export const plugin = new PanelPlugin<{}>(ExplorationLogsPanel);
