import React from 'react';
import { useHistory } from 'react-router-dom';

import { setReturnToPrevious } from '@grafana/runtime';
import { Button } from '@grafana/ui';

export interface ReturnToPreviousProps {
  href: string;
  title: string;
  children: string;
}

export const ReturnToPrevious = ({ href, title, children }: ReturnToPreviousProps) => {
  const history = useHistory();

  const handleOnClick = () => {
    setReturnToPrevious({ title: '', href: '' });
    history.push(href);
  };

  return (
    <Button
      icon="angle-left"
      size="sm"
      variant="secondary"
      onClick={handleOnClick}
      title={title}
      className="return-to-previous"
    >
      Back to {children}
    </Button>
  );
};

ReturnToPrevious.displayName = 'ReturnToPrevious';
