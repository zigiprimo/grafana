import React, { useState, useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';

import { ExploreCorrelationHelperData, SupportedTransformationType } from '@grafana/data';
import { Collapse, Alert, Field, Input, Select } from '@grafana/ui';
import { useDispatch, useSelector } from 'app/types';

import { getSupportedTransTypeDetails, getTransformOptions } from '../correlations/Forms/types';
import { getTransformationVars } from '../correlations/transformations';

import { changeCorrelationEditorDetails } from './state/main';
import { selectCorrelationDetails } from './state/selectors';

interface Props {
  correlations: ExploreCorrelationHelperData;
}

interface Transformation {
  type: SupportedTransformationType;
  field: string;
  expression: string;
  mapValue: string;
}

// only one transformation is in the form at a time
interface FormValues {
  label: string;
  description: string;
  transformation: Transformation;
}

interface TransformationHelper {
  exampleValue: string;
  showExpression?: boolean;
  showMapValue?: boolean;
}

export const CorrelationHelper = ({ correlations }: Props) => {
  const dispatch = useDispatch();
  const { register, watch, getValues } = useForm<FormValues>();
  const [isLabelDescOpen, setIsLabelDescOpen] = useState(false);
  const [isTransformationsOpen, setIsTransformationsOpen] = useState(false);
  const [transformationHelper, setTransformationHelper] = useState<TransformationHelper | undefined>(undefined);
  //const [transformationsList, setTransformationsList] = useState<Transformation[]>([]);
  const correlationDetails = useSelector(selectCorrelationDetails);
  const id = useId();

  useEffect(() => {
    const subscription = watch((value) => {
      let dirty = false;

      if (!correlationDetails?.dirty && (value.label !== '' || value.description !== '')) {
        dirty = true;
      } else if (correlationDetails?.dirty && value.label.trim() === '' && value.description.trim() === '') {
        dirty = false;
      }
      dispatch(changeCorrelationEditorDetails({ label: value.label, description: value.description, dirty: dirty }));
    });
    return () => subscription.unsubscribe();
  }, [correlationDetails?.dirty, dispatch, watch]);

  // only fire once on mount to allow save button to enable / disable when unmounted
  useEffect(() => {
    dispatch(changeCorrelationEditorDetails({ canSave: true }));

    return () => {
      dispatch(changeCorrelationEditorDetails({ canSave: false }));
    };
  }, [dispatch]);

  return (
    <Alert title="Correlation details" severity="info">
      The correlation link will appear by the <code>{correlations.resultField}</code> field. You can use the following
      variables to set up your correlations:
      <pre>
        {Object.entries(correlations.vars).map((entry) => {
          return `\$\{${entry[0]}\} = ${entry[1]}\n`;
        })}
      </pre>
      <Collapse
        collapsible
        isOpen={isLabelDescOpen}
        onToggle={() => {
          setIsLabelDescOpen(!isLabelDescOpen);
        }}
        label="Label/Description"
      >
        <Field label="Label" htmlFor={`${id}-label`}>
          <Input {...register('label')} id={`${id}-label`} />
        </Field>
        <Field label="Description" htmlFor={`${id}-description`}>
          <Input {...register('description')} id={`${id}-description`} />
        </Field>
      </Collapse>
      <Collapse
        collapsible
        isOpen={isTransformationsOpen}
        onToggle={() => {
          setIsTransformationsOpen(!isTransformationsOpen);
        }}
        label="Transformations"
      >
        <Field label="Field" htmlFor={`${id}-field`}>
          <Select
            id={`${id}-field`}
            options={Object.entries(correlations.vars).map((entry) => {
              return { label: entry[0], value: entry[0] };
            })}
            onChange={(value) => {
              if (value.value) {
                setTransformationHelper({ exampleValue: correlations.vars[value.value] });
              }
            }}
          />
        </Field>
        {transformationHelper?.exampleValue && (
          <>
            <pre>{transformationHelper?.exampleValue}</pre>
            <Field label="Type" htmlFor={`${id}-type`}>
              <Select
                id={`${id}-type`}
                options={getTransformOptions()}
                onChange={(value) => {
                  if (value.value) {
                    const transformationDetails = getSupportedTransTypeDetails(
                      value.value as SupportedTransformationType
                    );
                    setTransformationHelper({
                      ...transformationHelper,
                      showExpression: transformationDetails.showExpression,
                      showMapValue: transformationDetails.showMapValue,
                    });

                    const wat = getTransformationVars(
                      { type: value.value as SupportedTransformationType },
                      transformationHelper.exampleValue,
                      getValues('transformation.field')
                    );
                    console.log(wat);
                  }
                }}
              />
            </Field>
            {transformationHelper.showExpression && (
              <Field label="Expression" htmlFor={`${id}-expression`}>
                <Input id={`${id}-expression`} />
              </Field>
            )}
            {transformationHelper.showMapValue && (
              <Field label="Map Value" htmlFor={`${id}-mapValue`}>
                <Input id={`${id}-mapValue`} />
              </Field>
            )}
          </>
        )}
      </Collapse>
    </Alert>
  );
};
