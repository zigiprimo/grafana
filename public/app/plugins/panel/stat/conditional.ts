// These are used in some other plugins for some reason

import {
  FieldDisplay,
  FieldConfigEditorBuilder,
  DataFrame,
  InterpolateFunction,
  ReducerID,
  reduceField,
} from '@grafana/data';
import { findFieldFrom } from 'app/features/dimensions';

import { compareValues } from '../geomap/utils/checkFeatureMatchesStyleRule';

import {
  ConditionalDisplay,
  ConditionTest,
  ConditionTestMode,
  CustomDisplayValue,
  PanelFieldConfig,
} from './panelcfg.gen';

// export function formatDisplayValuesWithCustomUnits(
//   fieldValues: FieldDisplay[],
//   config: PanelFieldConfig
// ): FieldDisplay[] {
//   const { prefix, suffix } = config;

//   // No custom values?
//   if (!prefix && !suffix) {
//     return fieldValues;
//   }

//   return fieldValues.map((fieldValue) => {
//     const fieldType = fieldValue?.sourceField?.type;
//     // Test for FieldType.number, since that is the only type on which formatting is enforced
//     if (fieldType === FieldType.number) {
//       const { display } = fieldValue;

//       // Test also for nullishness here, otherwise "undefined" will be concatenated into the string
//       const customPrefix = `${prefix ?? ''}${display.prefix ?? ''}`;
//       const customSuffix = `${display.suffix ?? ''}${suffix ?? ''}`;

//       return {
//         ...fieldValue,
//         display: {
//           ...display,
//           prefix: customPrefix,
//           suffix: customSuffix,
//         },
//       };
//     }
//     return fieldValue;
//   });
// }

export function addConditionalDisplayOptions(builder: FieldConfigEditorBuilder<PanelFieldConfig>) {
  const category = ['Custom units'];
  return builder
    .addTextInput({
      path: 'prefix',
      name: 'Prefix',
      defaultValue: '',
      settings: {
        placeholder: 'Enter custom prefix',
      },
      category,
    })
    .addTextInput({
      path: 'suffix',
      name: 'Suffix',
      defaultValue: '',
      settings: {
        placeholder: 'Enter custom suffix',
      },
      category,
    });
}

export function processConditionalDisplayValues(
  disp: FieldDisplay,
  data: DataFrame[],
  replace: InterpolateFunction
): FieldDisplay {
  const conditions = disp.source?.config?.custom?.conditions as ConditionalDisplay[];
  if (conditions?.[0].test?.mode) {
    // has a valid first value set
    for (const c of conditions) {
      if (checkConditionTest(c.test, disp, data)) {
        return applyFormatting(c.display, disp, replace);
      }
    }
  }
  return disp;
}

function checkConditionTest(test: ConditionTest, disp: FieldDisplay, data: DataFrame[]): boolean {
  if (test.mode === ConditionTestMode.True) {
    return true;
  }
  let left: number | string | boolean = disp.display.numeric;
  if (test.mode === ConditionTestMode.Field) {
    const field = test.field ? findFieldFrom(test.field, data) : disp.source;
    if (!field) {
      return false;
    }
    const reducer = test.reducer ?? ReducerID.lastNotNull;
    left = reduceField({
      field,
      reducers: [reducer],
    })[reducer];
  }
  return compareValues(left, test.op, test.value);
}

function applyFormatting(apply: CustomDisplayValue, field: FieldDisplay, replace: InterpolateFunction): FieldDisplay {
  const display = { ...field.display };
  if (apply.prefix) {
    display.prefix = replace(apply.prefix); // include original in scoped vars?
  }
  if (apply.suffix) {
    display.suffix = replace(apply.suffix);
  }
  if (apply.text) {
    display.text = replace(apply.text);
  }
  if (apply.color) {
    display.color = apply.color; // convert it?
  }
  return { ...field, display }; // copy with new display
}
