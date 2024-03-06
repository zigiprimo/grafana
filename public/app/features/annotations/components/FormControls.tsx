import React, { ChangeEvent, useState } from 'react';

import { Checkbox, InlineField, InlineSwitch, Input, RadioButtonGroup, Select, Switch } from '@grafana/ui';
const values = ['val1', 'val2', 'val3'].map((val) => ({ label: val, value: val }));

export const FormControls = () => {
  const [booleanValue, setBooleanValue] = useState(true);
  const [stringValue, setStringValue] = useState('val2');

  return (
    <>
      <Switch
        label="Switch with label"
        value={booleanValue}
        onChange={(event) => setBooleanValue(event.currentTarget.checked)}
      />

      <div data-testid="test-radio-button-group">
        <RadioButtonGroup options={values} value={stringValue} onChange={(v) => setStringValue(v)} />
      </div>

      <Checkbox
        label="Checkbox with label"
        value={booleanValue}
        onChange={(event) => setBooleanValue(event.currentTarget.checked)}
      />

      <InlineField labelWidth={30} label="Inline field with switch">
        <InlineSwitch
          value={booleanValue}
          onChange={(event) => setBooleanValue(event.currentTarget.checked)}
          id="inline-field-with-switch"
        />
      </InlineField>

      <InlineField labelWidth={30} label="Inline field with checkbox">
        <Checkbox
          id="inline-field-with-checkbox"
          value={booleanValue}
          onChange={(event) => setBooleanValue(event.currentTarget.checked)}
        />
      </InlineField>

      <InlineField labelWidth={30} label="Inline field with input">
        <Input
          value={stringValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setStringValue(e.target.value)}
          id="inline-field-with-input"
        />
      </InlineField>

      <InlineField labelWidth={30} label="Inline field with select">
        <Select
          value={stringValue}
          options={values}
          onChange={(values) => setStringValue(values.value!)}
          id="inline-field-with-select"
        />
      </InlineField>
    </>
  );
};
