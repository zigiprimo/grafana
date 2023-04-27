import React, { useCallback } from 'react';

import { DashboardViewItem } from 'app/features/search/types';
import { useDispatch } from 'app/types';

import { useLazyGetFolderChildrenQuery } from '../api/browseDashboardsAPI';
import {
  useFlatTreeState,
  useCheckboxSelectionState,
  setFolderOpenState,
  setItemSelectionState,
  setAllSelection,
  storeFolderChildrenInState,
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
  const [getFolderChildren] = useLazyGetFolderChildrenQuery();

  const handleFolderClick = useCallback(
    async (clickedFolderUID: string, isOpen: boolean) => {
      dispatch(setFolderOpenState({ folderUID: clickedFolderUID, isOpen }));

      if (isOpen) {
        getFolderChildren(clickedFolderUID);
        const children = await getFolderChildren(clickedFolderUID).unwrap();
        dispatch(
          storeFolderChildrenInState({
            parentUID: clickedFolderUID,
            children,
          })
        );
      }
    },
    [dispatch, getFolderChildren]
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
