import React, { useCallback, useState } from 'react';

import { Modal, ToolbarButton } from '@grafana/ui';
import { useExploreSelector } from 'app/features/explore/state/store';

import { getExploreItemSelector } from '../../state/selectors';

import { AddToDashboardForm } from './AddToDashboardForm';
import { getAddToDashboardTitle } from './getAddToDashboardTitle';

interface Props {
  exploreId: string;
}

export const AddToDashboard = ({ exploreId }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectExploreItem = getExploreItemSelector(exploreId);
  const explorePaneHasQueries = !!useExploreSelector(selectExploreItem)?.queries?.length;
  const onClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <ToolbarButton
        icon="apps"
        variant="canvas"
        onClick={() => setIsOpen(true)}
        aria-label="Add to dashboard"
        disabled={!explorePaneHasQueries}
      >
        Add to dashboard
      </ToolbarButton>

      {isOpen && (
        <Modal title={getAddToDashboardTitle()} onDismiss={onClose} isOpen>
          <AddToDashboardForm onClose={onClose} exploreId={exploreId} />
        </Modal>
      )}
    </>
  );
};
