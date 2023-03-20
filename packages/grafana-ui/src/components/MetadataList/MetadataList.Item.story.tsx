import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

import { Button, Checkbox, Icon, MetadataList, TagList } from '@grafana/ui';

import { withHorizontallyCenteredStory } from '../../../src/utils/storybook/withCenteredStory';

import { MetaItem } from './MetadataList.Item';
import { Stack } from './Stack';

const meta: ComponentMeta<typeof MetadataList.Item> = {
  title: 'Layout/MetadataList/Item',
  component: MetadataList.Item,
  decorators: [withHorizontallyCenteredStory],
  parameters: {},
};

export const Alert = () => {
  const prefix = null;
  const title = (
    <>
      <Icon name="check" /> HTTP requests/s
    </>
  );

  const folder: MetaItem = {
    label: <Icon name="folder" size="sm" />,
    value: (
      <Stack direction="row" alignItems="center" gap={0}>
        Folder 1 <Icon name="angle-right" size="sm" /> Evaluation Group 1
      </Stack>
    ),
  };

  const interval: MetaItem = {
    label: (
      <>
        <Icon name="clock-nine" size="sm" /> for
      </>
    ),
    value: '5m',
  };

  const meta: MetaItem[] = [folder, interval];
  const actions = (
    <>
      <Button variant="secondary" fill="outline" size="sm" icon="pen">
        Edit
      </Button>
      <Button variant="secondary" fill="outline" size="sm">
        More <Icon name="angle-down" />
      </Button>
    </>
  );

  return (
    <MetadataList.Item
      prefix={prefix}
      title={title}
      description="This measures HTTP request rate"
      metadata={meta}
      suffix={actions}
    />
  );
};

export const Dashboard: ComponentStory<typeof MetadataList.Item> = () => {
  const prefix = <Checkbox />;
  const title = 'My Dashboard';

  const meta: MetaItem[] = [
    {
      label: <Icon size="sm" name="folder" />,
      value: 'Folder',
    },
  ];

  const tags = <TagList tags={['operations', 'prometheus']} />;

  return <MetadataList.Item prefix={prefix} title={title} metadata={meta} suffix={tags} />;
};

export const LibraryPanel: ComponentStory<typeof MetadataList.Item> = () => {
  const prefix = <img alt="gauge" src="https://grafana.com/api/plugins/gauge/logos/small" width={38} />;
  const title = 'Highest DPM by stack';
  const description = 'This value calculated at the current instant. ie. `now()`';

  const meta: MetaItem[] = [
    {
      label: (
        <>
          <Icon name="folder-upload" /> Uploaded by
        </>
      ),
      value: 'Sam Jewell',
    },
  ];

  const trash = (
    <Button icon={'trash-alt'} size="sm" fill="outline" variant="destructive">
      Delete
    </Button>
  );

  return <MetadataList.Item prefix={prefix} title={title} description={description} metadata={meta} suffix={trash} />;
};

export default meta;
