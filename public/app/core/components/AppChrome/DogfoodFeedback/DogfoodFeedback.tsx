import React, { useState } from 'react';

import { Drawer, FileUpload, TagsInput, TextArea, ToolbarButton } from '@grafana/ui';

export interface Props {}

export const DogfoodFeedback = ({}: Props) => {
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);

  return (
    <>
      <ToolbarButton
        iconOnly
        icon="comment-alt"
        aria-label="Dogfood"
        tooltip="Dogfood feedback"
        onClick={() => setShowDrawer(true)}
      />
      {showDrawer && (
        <Drawer title="Dogfood feedback" size="sm" onClose={() => setShowDrawer(false)} expandable={false} >
          <span style={{ display: 'block', margin: '5px', fontSize: '16px', lineHeight: '22px', fontWeight: '400' }}>
            Hey Grafanista, what issue have you noticed on this page?
          </span>
          <TextArea placeholder="Describe the issue" rows={10} />
          <div style={{ margin: '50px 5px' }}>
          <span style={{ display: 'block', margin: '5px', fontSize: '16px', lineHeight: '22px', fontWeight: '400' }}>
            Add some tags to help us categorize the issue
          </span>
          <TagsInput tags={tags} onChange={setTags} />
          </div>
          <div style={{ margin: '5px' }}>
            <span
              style={{ marginBottom: '5px', display: 'block', fontSize: '16px', lineHeight: '22px', fontWeight: '400' }}
            >
              Do you want to add a screenshot?
            </span>
            <FileUpload
              onFileUpload={({ currentTarget }) => console.log('file', currentTarget?.files && currentTarget.files[0])}
            />
          </div>
        </Drawer>
      )}
    </>
  );
};

// const getStyles = (theme: GrafanaTheme2) => ({
//   buttonContent: css({
//     alignItems: 'center',
//     display: 'flex',
//   }),
//   buttonText: css({
//     [theme.breakpoints.down('md')]: {
//       display: 'none',
//     },
//   }),
//   separator: css({
//     [theme.breakpoints.down('sm')]: {
//       display: 'none',
//     },
//   }),
// });
