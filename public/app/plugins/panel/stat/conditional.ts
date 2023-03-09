// These are used in some other plugins for some reason

import {
  FieldDisplay,
  DataFrame,
  InterpolateFunction,
  ReducerID,
  reduceField,
  PanelOptionsEditorBuilder,
  StandardEditorContext,
  GrafanaTheme2,
} from '@grafana/data';
import { ComparisonOperation } from '@grafana/schema';
import { findFieldFrom } from 'app/features/dimensions';

import { comparisonOptionsLong } from '../geomap/editor/StyleRuleEditor';
import { compareValues } from '../geomap/utils/checkFeatureMatchesStyleRule';

import { ConditionalDisplay, ConditionTest, ConditionTestMode, CustomDisplayValue, PanelOptions } from './panelcfg.gen';

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

export function addConditionalDisplayOptions(
  builder: PanelOptionsEditorBuilder<PanelOptions>,
  context: StandardEditorContext<PanelOptions>
) {
  const rootCategory = ['Conditional display'];
  const displayCategory = ['Display'];
  const testCategory = ['Test'];

  for (let i = 0; i < 1; i++) {
    const header = ['Condition: ' + (i + 1)];
    builder.addNestedOptions({
      category: rootCategory,
      path: `conditions[${i}]`,
      build: (wrap, c) => {
        wrap.addNestedOptions<ConditionTest>({
          category: header,
          path: `test`,
          build: (b, c) => {
            b.addRadio({
              path: 'mode',
              name: 'Mode',
              defaultValue: ConditionTestMode.Value,
              settings: {
                options: [
                  { value: ConditionTestMode.Value, label: 'Value', description: 'The calculated value' },
                  { value: ConditionTestMode.Field, label: 'Field', description: 'An explicit field' },
                  { value: ConditionTestMode.True, label: 'True', description: 'Always true' },
                ],
              },
              category: testCategory,
            });
            b.addFieldNamePicker({
              path: 'field',
              name: 'Field',
              settings: {
                placeholderText: 'Current field',
                isClearable: true,
              },
              showIf: (v) => v?.mode === ConditionTestMode.Field,
              category: testCategory,
            });
            b.addSelect({
              path: 'op',
              name: 'Operation',
              defaultValue: ComparisonOperation.GTE,
              settings: {
                options: comparisonOptionsLong,
              },
              showIf: (v) => v?.mode !== ConditionTestMode.True,
              category: testCategory,
            });
            b.addNumberInput({
              path: 'value',
              name: 'Value',
              defaultValue: undefined,
              settings: {
                placeholder: 'Compare to',
              },
              showIf: (v) => v?.mode !== ConditionTestMode.True,
              category: testCategory,
            });
          },
        });
        wrap.addNestedOptions<CustomDisplayValue>({
          category: header,
          path: `display`,
          build: (b, c) => {
            b.addTextInput({
              path: 'text',
              name: 'Text',
              defaultValue: '',
              settings: {
                placeholder: 'Optional custom text',
              },
              category: displayCategory,
            });
            b.addTextInput({
              path: 'prefix',
              name: 'Prefix',
              defaultValue: '',
              settings: {
                placeholder: 'Optional custom prefix',
              },
              category: displayCategory,
            });
            b.addTextInput({
              path: 'suffix',
              name: 'Suffix',
              defaultValue: '',
              settings: {
                placeholder: 'Optional custom suffix',
              },
              category: displayCategory,
            });
            b.addColorPicker({
              path: 'color',
              name: 'Color',
              defaultValue: undefined,
              settings: {
                isClearable: true,
                placeholder: 'Optional custom color',
              },
              category: displayCategory,
            });
          },
        });
      },
    });
  }
}

export function processConditionalDisplayValues(
  conditions: ConditionalDisplay[],
  values: FieldDisplay[],
  data: DataFrame[],
  replace: InterpolateFunction,
  theme: GrafanaTheme2
): FieldDisplay[] {
  // future: this can be optimized so we only find fields once
  return values.map((disp) => {
    for (const c of conditions) {
      if (checkConditionTest(c.test, disp, data) && c.display) {
        return applyFormatting(c.display, disp, replace, theme);
      }
    }
    return disp;
  });
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

function applyFormatting(
  apply: CustomDisplayValue,
  field: FieldDisplay,
  replace: InterpolateFunction,
  theme: GrafanaTheme2
): FieldDisplay {
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
    display.color = theme.visualization.getColorByName(apply.color);
  }
  return { ...field, display }; // copy with new display
}
