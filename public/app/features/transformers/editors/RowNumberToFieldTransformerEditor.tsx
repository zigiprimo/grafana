import React from 'react';

import { DataTransformerID, standardTransformers, TransformerRegistryItem, TransformerUIProps } from '@grafana/data';
import { RowNumberToFieldTransformerOptions } from '@grafana/data/src/transformations/transformers/rowNumberToField';

export const RowNumberToFieldTransformerEditor: React.FC<TransformerUIProps<RowNumberToFieldTransformerOptions>> = ({
  input,
  options,
  onChange,
}) => {
  // if (input.length <= 1) {
  //   // Show warning that merge is useless only apply on a single frame
  //   return <FieldValidationMessage>Merge has no effect when applied on a single frame.</FieldValidationMessage>;
  // }
  return null;
};

export const rowNumberToFieldTransformerRegistryItem: TransformerRegistryItem<RowNumberToFieldTransformerOptions> = {
  id: DataTransformerID.rowNumberToField,
  editor: RowNumberToFieldTransformerEditor,
  transformation: standardTransformers.rowNumberToFieldTransformer,
  name: 'Row number to field',
  description: `Add the row number of the field as a column`,
};
