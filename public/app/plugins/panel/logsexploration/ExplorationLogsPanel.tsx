import React from 'react';

import { PanelProps } from '@grafana/data';

import LogsContainer from './Logs/LogsContainer';

interface ExplorationLogsPanelProps extends PanelProps<{}> {}

export const ExplorationLogsPanel = (props: ExplorationLogsPanelProps) => {
  return <LogsContainer width={props.width} />;
};
