import React, { PropsWithChildren } from 'react';

import { MetadataListItem } from './MetadataList.Item';
import { Stack, StackProps } from './Stack';

const MetadataList = (props: PropsWithChildren<StackProps>) => {
  const { children, ...rest } = props;

  return (
    <Stack direction="column" {...rest}>
      {props.children}
    </Stack>
  );
};

MetadataList.Item = MetadataListItem;

export { MetadataList };
