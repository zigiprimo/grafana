import { action } from '@storybook/addon-actions';
import { Meta, StoryFn } from '@storybook/react';
import React from 'react';

import { getTagColorIndexFromName } from '../../utils';
import { Card } from '../Card/Card';
import { Box } from '../Layout/Box/Box';
import { Stack } from '../Layout/Stack/Stack';

import { Tag } from './Tag';
import mdx from './Tag.mdx';

const meta: Meta<typeof Tag> = {
  title: 'Forms/Tags/Tag',
  component: Tag,
  parameters: {
    docs: {
      page: mdx,
    },
    controls: {
      exclude: ['onClick'],
    },
  },
  args: {
    name: 'Tag',
    colorIndex: 0,
  },
};

export const Single: StoryFn<typeof Tag> = (args) => {
  return <Tag name={args.name} colorIndex={args.colorIndex} onClick={action('Tag clicked')} icon={args.icon} />;
};

export default meta;

export function DemoWithManyTags() {
  const tags = [
    'alert_type',
    'success-rate-alert',
    'job',
    'opentelemetry-demo/checkoutservice',
    'operation',
    'oteldemo.CheckoutService/PlaceOrder',
    'service_name',
    'service_namespace',
    'opentelemetry-demo',
    'severity',
    'critical',
    'operation =  ingress',
    'failure',
    'asserts',
    'service_name = frontend-proxy',
    'teams',
    'users',
    'service_namespace = otel-demo-obscon',
    'asserts_serverity',
    'alert_type = success-rate-alert',
    'job = otel-demo-obscon/frontend-proxy',
    'severity = critical',
    'operation',
    'cluster = EU',
    'service_name = frontend',
    'pod',
  ];

  const chunks = [];

  for (let i = 0; i < tags.length; i += 5) {
    const chunk = tags.slice(i, i + 5);
    chunks.push(chunk);
  }

  return (
    <Stack direction="column" gap={2}>
      <Box paddingY={2}>
        Using a tag in the <Tag name="middle" colorIndex={0} /> of some text.
      </Box>
      {chunks.map((chunkTags, index) => (
        <Card key={index}>
          <Card.Heading>Vertical {index}</Card.Heading>
          <Card.Meta>
            <Stack direction="row" gap={1}>
              {chunkTags.slice(0, 5).map((tag, index) => (
                <Tag key={index} name={tag} colorIndex={getTagColorIndexFromName(tag)} />
              ))}
            </Stack>
          </Card.Meta>
        </Card>
      ))}
      {chunks.map((chunkTags, index) => (
        <Card key={index}>
          <Card.Heading>Horizontal {index}</Card.Heading>
          <Card.Meta>
            <Stack direction="column" gap={1} alignItems={'flex-start'}>
              {chunkTags.slice(0, 5).map((tag, index) => (
                <Tag key={index} name={tag} colorIndex={getTagColorIndexFromName(tag)} />
              ))}
            </Stack>
          </Card.Meta>
        </Card>
      ))}
    </Stack>
  );
}
