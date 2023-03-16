import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

import { Checkbox, Icon, MetadataList } from '@grafana/ui';

import { withHorizontallyCenteredStory } from '../../../src/utils/storybook/withCenteredStory';

import { MetaItem } from './MetadataList.Item';
import { Stack } from './Stack';

const meta: ComponentMeta<typeof MetadataList.Item> = {
  title: 'Layout/MetadataList/Item',
  component: MetadataList.Item,
  decorators: [withHorizontallyCenteredStory],
  parameters: {},
};

export const Basic = () => {
  const prefix = null;
  const title = (
    <>
      <Icon name="check" /> HTTP requests/s
    </>
  );

  const folder: MetaItem = {
    label: <Icon name="folder" />,
    value: (
      <Stack direction="row" alignItems="center" gap={0}>
        Folder 1 <Icon name="angle-right" /> Evaluation Group 1
      </Stack>
    ),
  };

  const interval: MetaItem = {
    label: <Icon name="clock-nine" />,
    value: '5m',
  };

  const meta: MetaItem[] = [folder, interval];

  return (
    <MetadataList.Item prefix={prefix} title={title} description="This measures HTTP request rate" metadata={meta} />
  );
};

export const Dashboard: ComponentStory<typeof MetadataList.Item> = () => {
  const prefix = <Checkbox />;
  const title = 'My Dashboard';

  const folder: MetaItem = {
    label: <Icon name="folder" />,
    value: 'Folder',
  };

  const meta: MetaItem[] = [folder];

  return <MetadataList.Item prefix={prefix} title={title} metadata={meta} />;
};

export default meta;
