import React, { useCallback, useEffect, useRef } from 'react';

import { DashboardViewItem } from 'app/features/search/types';
import { useDispatch } from 'app/types';

import { endpoints } from '../api/browseDashboardsAPI';
import {
  useFlatTreeState,
  useCheckboxSelectionState,
  setFolderOpenState,
  setItemSelectionState,
  setAllSelection,
} from '../state';

import { DashboardsTree } from './DashboardsTree';

interface BrowseViewProps {
  height: number;
  width: number;
  folderUID: string | undefined;
}

export function BrowseView({ folderUID, width, height }: BrowseViewProps) {
  const dispatch = useDispatch();
  const flatTree = useFlatTreeState(folderUID);
  const selectedItems = useCheckboxSelectionState();
  // const [getFolderChildren] = useLazyGetFolderChildrenQuery();
  const subscriptions = useRef<Record<string, any>>({});

  useEffect(() => {
    const subscriptionCopies = subscriptions.current;
    return () => {
      Object.values(subscriptionCopies).forEach((subscription) => {
        subscription.unsubscribe();
      })
    }
  }, [])

  const handleFolderClick = useCallback(
    async (clickedFolderUID: string, isOpen: boolean) => {
      dispatch(setFolderOpenState({ folderUID: clickedFolderUID, isOpen }));

      if (isOpen) {
        // getFolderChildren(clickedFolderUID);
        const subscription = dispatch(endpoints.getFolderChildren.initiate(clickedFolderUID))
        subscriptions.current[clickedFolderUID] = subscription;
        // const children = await getFolderChildren(clickedFolderUID).unwrap();
        // dispatch(
        //   storeFolderChildrenInState({
        //     parentUID: clickedFolderUID,
        //     children,
        //   })
        // );
      } else {
        // remove subscription when collapsing the folder
        subscriptions.current[clickedFolderUID].unsubscribe();
      }
    },
    [dispatch]
  );

  const handleItemSelectionChange = useCallback(
    (item: DashboardViewItem, isSelected: boolean) => {
      dispatch(setItemSelectionState({ item, isSelected }));
    },
    [dispatch]
  );

  return (
    <DashboardsTree
      items={flatTree}
      width={width}
      height={height}
      selectedItems={selectedItems}
      onFolderClick={handleFolderClick}
      onAllSelectionChange={(newState) => dispatch(setAllSelection({ isSelected: newState }))}
      onItemSelectionChange={handleItemSelectionChange}
    />
  );
}
