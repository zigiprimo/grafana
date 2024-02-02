import { Meta, StoryFn } from '@storybook/react';
import Chance from 'chance';
import React from 'react';

import { ComboBox } from './index';

const chance = new Chance();

const meta: Meta = {
  title: 'General/ComboBox',
  component: ComboBox,
};

export default meta;

const OPTIONS_LENGTH = 500;
const options = new Array(OPTIONS_LENGTH).fill(0).map((_, index) => ({
  value: index.toString(),
  label: chance.name(),
}));

export const Basic: StoryFn = (args) => {
  return (
    <div>
      <div style={{ height: '100vh', background: 'green' }}></div>
      <ComboBox options={options} />
      <div style={{ height: '100vh', background: 'green' }}></div>
      <ComboBox options={options} />
    </div>
  );
};
