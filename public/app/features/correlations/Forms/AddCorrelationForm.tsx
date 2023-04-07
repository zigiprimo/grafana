import { css } from '@emotion/css';
import { countBy } from 'lodash';
import React, { useEffect, useState } from 'react';

import { DataQuery, GrafanaTheme2 } from '@grafana/data';
import { PanelContainer, useStyles2 } from '@grafana/ui';
import { CloseButton } from 'app/core/components/CloseButton/CloseButton';

import { getVariableUsageInfo } from '../../explore/utils/links';
import { Wizard } from '../components/Wizard';
import { TrackingAddingInfo } from '../types';
import { useCorrelations } from '../useCorrelations';

import { ConfigureCorrelationBasicInfoForm } from './ConfigureCorrelationBasicInfoForm';
import { ConfigureCorrelationSourceForm } from './ConfigureCorrelationSourceForm';
import { ConfigureCorrelationTargetForm } from './ConfigureCorrelationTargetForm';
import { CorrelationFormNavigation } from './CorrelationFormNavigation';
import { CorrelationsFormContextProvider } from './correlationsFormContext';
import { FormDTO } from './types';

const getStyles = (theme: GrafanaTheme2) => ({
  panelContainer: css`
    position: relative;
    padding: ${theme.spacing(1)};
    margin-bottom: ${theme.spacing(2)};
  `,
  infoBox: css`
    margin-top: 20px; // give space for close button
  `,
});

interface Props {
  onClose: () => void;
  onCreated: (addingInfo: TrackingAddingInfo) => void;
}

export const AddCorrelationForm = ({ onClose, onCreated }: Props) => {
  const styles = useStyles2(getStyles);
  const [addingStarted, _] = useState(Date.now());

  const {
    create: { execute, loading, error, value },
  } = useCorrelations();

  useEffect(() => {
    if (!error && !loading && value) {
      const secondsToComplete = Math.round((Date.now() - addingStarted) / 1000);
      const transformations = value.config?.transformations || [];
      const addingInfo: TrackingAddingInfo = {
        secondsToComplete,
        source: value.source?.type,
        target: value.target?.type,
        targetVariables: getVariableUsageInfo(value.config?.target, {}).variables.length,
        transformations: transformations.length,
      };
      onCreated(addingInfo);
    }
  }, [error, loading, value, onCreated, addingStarted]);

  const defaultValues: Partial<FormDTO> = { config: { type: 'query', target: {}, field: '' } };

  return (
    <PanelContainer className={styles.panelContainer}>
      <CloseButton onClick={onClose} />
      <CorrelationsFormContextProvider data={{ loading, readOnly: false, correlation: undefined }}>
        <Wizard<FormDTO>
          defaultValues={defaultValues}
          pages={[ConfigureCorrelationBasicInfoForm, ConfigureCorrelationTargetForm, ConfigureCorrelationSourceForm]}
          navigation={CorrelationFormNavigation}
          onSubmit={(data) => {
            execute(data);
          }}
        />
      </CorrelationsFormContextProvider>
    </PanelContainer>
  );
};
