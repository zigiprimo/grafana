import { Meta, StoryFn } from '@storybook/react';
import React from 'react';

import { withCenteredStory } from '../../utils/storybook/withCenteredStory';

import { Spinner2, Spinner2Props } from './Spinner2';

const meta: Meta = {
  title: 'Visualizations/Spinner2',
  component: Spinner2,
  decorators: [withCenteredStory],
  parameters: {
    args: {
      size: 16,
    },
  },
};

export const Basic: StoryFn = (args: Spinner2Props) => {
  return (
    <div>
      <Spinner2 size={args.size} color={args.color} />
    </div>
  );
};

Basic.args = {
  size: 16,
};

export const Large: StoryFn = (args: Spinner2Props) => {
  return (
    <div>
      <Spinner2 size={args.size} />
    </div>
  );
};

Large.args = {
  size: 48,
};

export const Medium: StoryFn = (args: Spinner2Props) => {
  return (
    <div>
      <Spinner2 size={args.size} />
    </div>
  );
};

Medium.args = {
  size: 24,
};

export const Small: StoryFn = (args: Spinner2Props) => {
  return (
    <div>
      <Spinner2 size={args.size} />
    </div>
  );
};

Small.args = {
  size: 12,
};

export default meta;
