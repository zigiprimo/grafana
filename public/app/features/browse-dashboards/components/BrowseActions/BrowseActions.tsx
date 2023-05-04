import { css } from '@emotion/css';
import React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import appEvents from 'app/core/app_events';
import { useDispatch, useSelector } from 'app/types';
import { ShowModalReactEvent } from 'app/types/events';

import {
  useDeleteDashboardMutation,
  useDeleteFolderMutation,
  useMoveDashboardMutation,
  useMoveFolderMutation,
} from '../../api/browseDashboardsAPI';
import { childrenByParentUIDSelector, rootItemsSelector, setAllSelection, useActionSelectionState } from '../../state';
import { findItem } from '../../state/utils';

import { DeleteModal } from './DeleteModal';
import { MoveModal } from './MoveModal';

export interface Props {}

export function BrowseActions() {
  const styles = useStyles2(getStyles);
  const selectedItems = useActionSelectionState();
  const [deleteDashboard] = useDeleteDashboardMutation();
  const [deleteFolder] = useDeleteFolderMutation();
  const [moveFolder] = useMoveFolderMutation();
  const [moveDashboard] = useMoveDashboardMutation();
  const dispatch = useDispatch();
  const selectedDashboards = Object.keys(selectedItems.dashboard).filter((uid) => selectedItems.dashboard[uid]);
  const selectedFolders = Object.keys(selectedItems.folder).filter((uid) => selectedItems.folder[uid]);
  const rootItems = useSelector(rootItemsSelector);
  const childrenByParentUID = useSelector(childrenByParentUIDSelector);

  const onActionComplete = () => {
    dispatch(
      setAllSelection({
        isSelected: false,
      })
    );
  };

  const onDelete = async () => {
    // Delete all the folders sequentially
    // TODO error handling here
    for (const folderUID of selectedFolders) {
      // find the folder to get it's parentUID
      const folder = findItem(rootItems ?? [], childrenByParentUID, folderUID);
      deleteFolder({
        uid: folderUID,
        parentUID: folder?.parentUID,
      });
    }

    // Delete all the dashboards sequentially
    // TODO error handling here
    for (const dashboardUID of selectedDashboards) {
      // find the dashboard to get it's parentUID
      const dashboard = findItem(rootItems ?? [], childrenByParentUID, dashboardUID);
      deleteDashboard({
        uid: dashboardUID,
        parentUID: dashboard?.parentUID,
      });
    }
    onActionComplete();
  };

  const onMove = async (destinationUID: string) => {
    // Move all the folders sequentially
    // TODO error handling here
    for (const folderUID of selectedFolders) {
      // find the folder to get it's parentUID
      const folder = findItem(rootItems ?? [], childrenByParentUID, folderUID);
      moveFolder({
        uid: folderUID,
        parentUID: folder?.parentUID,
        destinationUID,
      });
    }

    // Move all the dashboards sequentially
    // TODO error handling here
    for (const dashboardUID of selectedDashboards) {
      // find the dashboard to get it's parentUID
      const dashboard = findItem(rootItems ?? [], childrenByParentUID, dashboardUID);
      moveDashboard({
        uid: dashboardUID,
        parentUID: dashboard?.parentUID,
        destinationUID,
      });
    }
    onActionComplete();
  };

  const showMoveModal = () => {
    appEvents.publish(
      new ShowModalReactEvent({
        component: MoveModal,
        props: {
          selectedItems,
          onConfirm: onMove,
        },
      })
    );
  };

  const showDeleteModal = () => {
    appEvents.publish(
      new ShowModalReactEvent({
        component: DeleteModal,
        props: {
          selectedItems,
          onConfirm: onDelete,
        },
      })
    );
  };

  return (
    <div className={styles.row} data-testid="manage-actions">
      <Button onClick={showMoveModal} variant="secondary">
        Move
      </Button>
      <Button onClick={showDeleteModal} variant="destructive">
        Delete
      </Button>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  row: css({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  }),
});
