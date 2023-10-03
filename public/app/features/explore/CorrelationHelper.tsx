import React, { useState, useEffect, useId } from 'react';
import Highlighter from 'react-highlight-words';
import { useForm } from 'react-hook-form';

import { ExploreCorrelationHelperData, ScopedVars, SupportedTransformationType } from '@grafana/data';
import { Collapse, Alert, Field, Input, Select, InputControl } from '@grafana/ui';
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
interface FormDTO {
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
  const { register, watch, getValues, control } = useForm<FormDTO>();
  const [isLabelDescOpen, setIsLabelDescOpen] = useState(false);
  const [isTransformationsOpen, setIsTransformationsOpen] = useState(false);
  const [transformationHelper, setTransformationHelper] = useState<TransformationHelper | undefined>(undefined);
  const [transformationVars, setTransformationVars] = useState<ScopedVars>();
  //const [transformationsList, setTransformationsList] = useState<Transformation[]>([]);
  const correlationDetails = useSelector(selectCorrelationDetails);
  const id = useId();

  useEffect(() => {
    const subscription = watch((value) => {
      let dirty = false;

      if (!correlationDetails?.dirty && (value.label !== '' || value.description !== '')) {
        dirty = true;
      } else if (correlationDetails?.dirty && value?.label.trim() === '' && value?.description.trim() === '') {
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

  const calcTransformationVars = () => {
    const transformationType = getValues('transformation.type');
    setTransformationVars(undefined);
    if (transformationType !== undefined && transformationHelper !== undefined) {
      const transformationDetails = getSupportedTransTypeDetails(transformationType as SupportedTransformationType);
      setTransformationHelper({
        exampleValue: transformationHelper.exampleValue,
        showExpression: transformationDetails.showExpression || false,
        showMapValue: transformationDetails.showMapValue || false,
      });

      const transformationVars = getTransformationVars(
        {
          type: transformationType as SupportedTransformationType,
          expression: getValues('transformation.expression'),
          mapValue: getValues('transformation.mapValue'),
        },
        transformationHelper.exampleValue || '',
        getValues('transformation.field')
      );

      if (Object.keys(transformationVars).length > 0) {
        setTransformationVars({ ...transformationVars });
      }
    }
  };

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
            <pre>
              <Highlighter
                textToHighlight={transformationHelper?.exampleValue}
                searchWords={[getValues('transformation.expression') ?? '']}
                autoEscape={false}
              />
            </pre>

            <Field label="Type">
              <InputControl
                control={control}
                render={({ field: { onChange, ref, ...field } }) => (
                  <Select
                    {...field}
                    onChange={(value) => {
                      onChange(value.value);
                      calcTransformationVars();
                    }}
                    options={getTransformOptions()}
                    aria-label="type"
                  />
                )}
                name={`transformation.type` as const}
              />
            </Field>
            {transformationHelper.showExpression && (
              <Field label="Expression" htmlFor={`${id}-expression`} required>
                <Input
                  {...register('transformation.expression')}
                  id={`${id}-expression`}
                  onKeyUp={calcTransformationVars}
                />
              </Field>
            )}
            {transformationHelper.showMapValue && (
              <Field label="Map Value" htmlFor={`${id}-mapValue`} required>
                <Input
                  {...register('transformation.mapValue')}
                  id={`${id}-mapValue`}
                  onKeyUp={calcTransformationVars}
                />
              </Field>
            )}
            {transformationVars !== undefined && (
              <>
                This transformation will add the following variables:
                <pre>
                  {Object.entries(transformationVars).map((entry) => {
                    return `\$\{${entry[0]}\} = ${entry[1]?.value}\n`;
                  })}
                </pre>
              </>
            )}
          </>
        )}
      </Collapse>
    </Alert>
  );
};
