import { ComponentStory, ComponentMeta } from '@storybook/react';
import React from 'react';

import { MetadataList } from './MetadataList';
import { Basic } from './MetadataList.Item.story';

export const basic: ComponentStory<typeof MetadataList> = () => {
  return (
    <MetadataList flexGrow={1}>
      <Basic />
      <Basic />
      <Basic />
    </MetadataList>
  );
};

const meta: ComponentMeta<typeof MetadataList> = {
  title: 'Layout/MetadataList',
  component: MetadataList.Item,
  decorators: [],
  parameters: {},
};

export default meta;
