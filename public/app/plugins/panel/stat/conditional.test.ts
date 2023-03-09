import { FieldType, ArrayVector } from '@grafana/data';
import { ComparisonOperation } from '@grafana/schema';

import { processConditionalDisplayValues } from './conditional';
import { ConditionalDisplay, ConditionTestMode } from './panelcfg.gen';

describe('conditional formatting functions', () => {
  const emptyArryVector = new ArrayVector([]);
  const replaceFunction = (v: string) => v;
  const mockSharedFieldValueProps = {
    hasLinks: false,
    display: {
      color: '#F2495C',
      numeric: 95.13749301705772,
      percent: 0.5197488596479736,
      prefix: '$',
      suffix: '%',
      text: '95.1',
      title: 'A-series',
    },
  };
  it('passes the untouched values when no tests exist', () => {
    const input = {
      name: 'testField',
      field: {},
      source: { type: FieldType.boolean, name: 'test13', config: {}, values: emptyArryVector },
      ...mockSharedFieldValueProps,
    };

    const processed = processConditionalDisplayValues(input, [], replaceFunction);
    expect(processed).toEqual(input);
  });

  it('sucessfully apply the prefix, and leave the suffix unchanged', () => {
    const condition: ConditionalDisplay = {
      test: {
        mode: ConditionTestMode.True,
        op: ComparisonOperation.EQ,
      },
      display: {
        prefix: 'PREFIX',
        //  suffix: 'SUFFIX',
        text: 'TEXT',
        color: '#FFF',
      },
    };
    const input = {
      name: 'testField',
      field: {},
      source: {
        type: FieldType.boolean,
        name: 'test13',
        config: {
          custom: {
            conditions: [condition],
          },
        },
        values: emptyArryVector,
      },
      ...mockSharedFieldValueProps,
    };

    const processed = processConditionalDisplayValues(input, [], replaceFunction);
    expect(processed.display.prefix).toBe('PREFIX');
    expect(processed.display.text).toBe('TEXT');
    expect(processed.display.suffix).toBe(input.display.suffix);
  });

  // it('sucessfully appends the `display.suffix` value with the custom suffix, and leaves the prefix unchanged', () => {
  //   const updatedFieldValues = formatDisplayValuesWithCustomUnits(mockFieldValues, {
  //     // Empty custom prefix
  //     prefix: '',
  //     suffix,
  //   });

  //   expect(updatedFieldValues[0].display.prefix).toBe(mockFieldValues[0].display.prefix);
  //   expect(updatedFieldValues[0].display.suffix).toBe('%*');
  // });

  // it('sucessfully formats both the prefix and the suffix', () => {
  //   const updatedFieldValues = formatDisplayValuesWithCustomUnits(mockFieldValues, {
  //     prefix,
  //     suffix,
  //   });

  //   expect(updatedFieldValues[0].display.prefix).toBe('&$');
  //   expect(updatedFieldValues[0].display.suffix).toBe('%*');
  // });

  // it('ignores any `fieldValues` that are non-numeric', () => {
  //   const updatedFieldValues = formatDisplayValuesWithCustomUnits(mockFieldValues, {
  //     prefix,
  //     suffix,
  //   });

  //   // Since the 1 and 2 index are NOT numeric FieldTypes, they should remain unchanged
  //   expect(updatedFieldValues[1]).toEqual(mockFieldValues[1]);
  //   expect(updatedFieldValues[2]).toEqual(mockFieldValues[2]);

  //   // 0 index, however should be updated/formatted
  //   expect(updatedFieldValues[0].display.prefix).toBe('&$');
  //   expect(updatedFieldValues[0].display.suffix).toBe('%*');
  // });

  // it('should handle prefixes and suffixes that are nullish in nature', () => {
  //   // Empty object
  //   const updatedFieldValues1 = formatDisplayValuesWithCustomUnits(mockFieldValues, {});

  //   expect(updatedFieldValues1[0].display.prefix).toBe('$');
  //   expect(updatedFieldValues1[0].display.suffix).toBe('%');

  //   // Object with props with undefined values
  //   const updatedFieldValues2 = formatDisplayValuesWithCustomUnits(mockFieldValues, {
  //     prefix: undefined,
  //     suffix: undefined,
  //   });

  //   expect(updatedFieldValues2[0].display.prefix).toBe('$');
  //   expect(updatedFieldValues2[0].display.suffix).toBe('%');
  // });
});
