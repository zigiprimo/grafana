import { Meta, StoryFn } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { withCenteredStory } from '../../utils/storybook/withCenteredStory';

import { ProgressBar } from './ProgressBar';
import mdx from './ProgressBar.mdx';

const meta: Meta = {
  title: 'General/ProgressBar',
  component: ProgressBar,
  decorators: [withCenteredStory],

  parameters: {
    controls: {},
    docs: {
      page: mdx,
    },
  },
};

export const Basic: StoryFn<typeof ProgressBar> = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (progress < 100) {
        setProgress(progress + 1);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [progress]);

  return (
    <div style={{ display: 'flex', width: '100%', flexDirection: 'column', alignItems: 'center', margin: 'auto' }}>
      <h3>Progress bar</h3>
      <ProgressBar progress={progress} />
    </div>
  );
};

Basic.args = {
  progress: 0,
};

export default meta;
