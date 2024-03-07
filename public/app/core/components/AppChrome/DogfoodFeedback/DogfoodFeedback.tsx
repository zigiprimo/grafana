import React, { useEffect, useState } from 'react';

import { getBackendSrv } from '@grafana/runtime';
import { Drawer, FileUpload, TagsInput, TextArea, ToolbarButton } from '@grafana/ui';
import useRudderStack from './useRudderstack';

export interface Props {}

export const DogfoodFeedback = ({}: Props) => {
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const { trackRudderStackEvent } = useRudderStack();

  function createFeedback(event: any) {
    event.preventDefault();

    trackRudderStackEvent('feedr.feedback', { tags, comment });

    getBackendSrv()
    .fetch({
        url: '/api/plugins/grafana-feedr-app/resources/feedback',
        method: 'POST',
        data: {
          comment: comment,
          url: window.location.href,
        },
      })
      .subscribe((response) => {
        console.log('response', response);

        const issueId = response.data.issue_id;

          console.log('file', files);

          const formData = new FormData();
          formData.append('screenshot', files[0]);

          const result = fetch(`/api/plugins/grafana-feedr-app/resources/feedback/upload?issueId=${issueId}`, {
            method: "POST",
            body: formData,
          });

          result.then((response) => {
            setComment('');
            setTags([]);
            setFiles([]);
          });
      });

    setShowDrawer(false);

    console.log('createFeedback');
  }

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
          <form onSubmit={createFeedback}>
            <span style={{ display: 'block', margin: '5px', fontSize: '16px', lineHeight: '22px', fontWeight: '400' }}>
              Hey Grafanista, what issue have you noticed on this page?
            </span>
            <TextArea placeholder="Describe the issue" rows={10} value={comment} onChange={e => setComment(e.target.value)}/>
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
              <FileUpload showFileName={true} onFileUpload={({ currentTarget }) => {
                const files = Array.from(currentTarget.files || []) as File[];
                setFiles(files);
              }}/>
            </div>


            <div style={{ margin: '5px' }}>
              <button type="submit">Submit</button>
            </div>
          </form>
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
