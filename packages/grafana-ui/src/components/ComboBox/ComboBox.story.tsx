import { Meta, StoryFn } from '@storybook/react';
import Chance from 'chance';
import React, { useCallback, useId } from 'react';

import { ComboBox } from './index';

const chance = new Chance();

const meta: Meta = {
  title: 'General/ComboBox',
  component: ComboBox,
};

export default meta;

const OPTIONS_LENGTH = 500_000;

const options = new Array(OPTIONS_LENGTH).fill(0).map((_, index) => ({
  value: index.toString(),
  label: chance.name(),
}));

export const Basic: StoryFn = (args) => {
  const labelId = useId();
  const inputId = useId();

  const [value, setValue] = React.useState<string | undefined>();

  const handleChange = useCallback((newValue: string | undefined) => {
    console.log('combo box emitted', newValue);
    setValue(newValue);
  }, []);

  return (
    <div>
      <label id={labelId} htmlFor={inputId}>
        Users:
      </label>

      <ComboBox value={value} onChange={handleChange} labelId={labelId} inputId={inputId} options={options} />
    </div>
  );
};
