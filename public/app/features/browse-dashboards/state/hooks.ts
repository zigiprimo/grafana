import { MutableRefObject, useEffect, useRef } from 'react';
import { createSelector } from 'reselect';

import { DashboardViewItem } from 'app/features/search/types';
import { useSelector, StoreState, useDispatch } from 'app/types';

import { useGetFolderChildrenQuery, endpoints, useDeleteDashboardMutation, useDeleteFolderMutation, useMoveFolderMutation, useMoveDashboardMutation } from '../api/browseDashboardsAPI';
import { DashboardsTreeItem, DashboardTreeSelection } from '../types';

const hasSelectionSelector = createSelector(
  (wholeState: StoreState) => wholeState.browseDashboards.selectedItems,
  (selectedItems) => {
    return Object.values(selectedItems).some((selectedItem) =>
      Object.values(selectedItem).some((isSelected) => isSelected)
    );
  }
);

const selectedItemsForActionsSelector = createSelector(
  (wholeState: StoreState) => wholeState.browseDashboards.selectedItems,
  (wholeState: StoreState) => wholeState.browseDashboards.childrenByParentUID,
  (selectedItems, childrenByParentUID) => {
    return getSelectedItemsForActions(selectedItems, childrenByParentUID);
  }
);

export function useFlatTreeState(folderUID: string | undefined) {
  const { data } = useGetFolderChildrenQuery(folderUID);
  const rootItems = data ?? [];
  const rtkQueryState = useSelector((wholeState: StoreState) => wholeState.browseDashboardsAPI.queries);
  const openFolders = useSelector((wholeState: StoreState) => wholeState.browseDashboards.openFolders);
  const dispatch = useDispatch();
  const subscriptions = useRef<Record<string, any>>({});

  useEffect(() => {
    const subscriptionsCopy = subscriptions.current;
    return () => {
      Object.values(subscriptionsCopy).forEach((subscription) => {
        subscription.unsubscribe();
      })
    }
  }, [])
  return createFlatTree(dispatch, subscriptions, folderUID, rootItems, rtkQueryState, openFolders);
}

export function useHasSelection() {
  return useSelector((state) => hasSelectionSelector(state));
}

export function useCheckboxSelectionState() {
  return useSelector((wholeState: StoreState) => wholeState.browseDashboards.selectedItems);
}

export function useActionSelectionState() {
  return useSelector((state) => selectedItemsForActionsSelector(state));
}

export function useDeleteFolder() {
  const [deleteFolder] = useDeleteFolderMutation();
  const rtkQueryState = useSelector((wholeState: StoreState) => wholeState.browseDashboardsAPI.queries);
  return (folderUID: string) => {
    let parentUID: string | undefined = undefined;
    for (const queries of Object.values(rtkQueryState)) {
      if (queries?.data && Array.isArray(queries.data)) {
        for (const item of queries.data) {
          if (item.uid === folderUID) {
            parentUID = item.parentUID;
          }
        }
      }
    }
    return deleteFolder({
      uid: folderUID,
      parentUID,
    });
  };
}

export function useDeleteDashboard() {
  const [deleteDashboard] = useDeleteDashboardMutation();
  const rtkQueryState = useSelector((wholeState: StoreState) => wholeState.browseDashboardsAPI.queries);
  return (dashboardUID: string) => {
    let parentUID = '';
    for (const queries of Object.values(rtkQueryState)) {
      if (queries?.data && Array.isArray(queries.data)) {
        for (const item of queries.data) {
          if (item.uid === dashboardUID) {
            parentUID = item.parentUID;
          }
        }
      }
    }
    return deleteDashboard({
      uid: dashboardUID,
      parentUID,
    });
  };
}

export function useMoveFolder() {
  const [moveFolder] = useMoveFolderMutation();
  const rtkQueryState = useSelector((wholeState: StoreState) => wholeState.browseDashboardsAPI.queries);
  return (folderUID: string, destinationUID: string) => {
    let parentUID: string | undefined = undefined;
    for (const queries of Object.values(rtkQueryState)) {
      if (queries?.data && Array.isArray(queries.data)) {
        for (const item of queries.data) {
          if (item.uid === folderUID) {
            parentUID = item.parentUID;
          }
        }
      }
    }
    return moveFolder({
      uid: folderUID,
      parentUID,
      destinationUID,
    });
  };
}

export function useMoveDashboard() {
  const [moveDashboard] = useMoveDashboardMutation();
  const rtkQueryState = useSelector((wholeState: StoreState) => wholeState.browseDashboardsAPI.queries);
  return (dashboardUID: string, destinationUID: string) => {
    let parentUID = '';
    for (const queries of Object.values(rtkQueryState)) {
      if (queries?.data && Array.isArray(queries.data)) {
        for (const item of queries.data) {
          if (item.uid === dashboardUID) {
            parentUID = item.parentUID;
          }
        }
      }
    }
    return moveDashboard({
      uid: dashboardUID,
      parentUID,
      destinationUID,
    });
  };
}

/**
 * Creates a list of items, with level indicating it's 'nested' in the tree structure
 *
 * @param folderUID The UID of the folder being viewed, or undefined if at root Browse Dashboards page
 * @param rootItems Array of loaded items at the root level (without a parent). If viewing a folder, we expect this to be empty and unused
 * @param childrenByUID Arrays of children keyed by their parent UID
 * @param openFolders Object of UID to whether that item is expanded or not
 * @param level level of item in the tree. Only to be specified when called recursively.
 */
function createFlatTree(
  dispatch: ReturnType<typeof useDispatch>,
  subscriptions: MutableRefObject<Record<string, any>>,
  folderUID: string | undefined,
  rootItems: DashboardViewItem[],
  // childrenByUID: Record<string, DashboardViewItem[] | undefined>,
  rtkQueryState: StoreState['browseDashboardsAPI']['queries'],
  openFolders: Record<string, boolean>,
  level = 0
): DashboardsTreeItem[] {
  function mapItem(item: DashboardViewItem, parentUID: string | undefined, level: number): DashboardsTreeItem[] {
    const mappedChildren = createFlatTree(dispatch, subscriptions, item.uid, rootItems, rtkQueryState, openFolders, level + 1);

    const isOpen = Boolean(openFolders[item.uid]);
    if (isOpen) {
      if (!subscriptions.current[item.uid]) {
        const subscription = dispatch(endpoints.getFolderChildren.initiate(item.uid));
        subscriptions.current[item.uid] = subscription;
      }
    } else {
      const subscription = subscriptions.current[item.uid];
      if (subscription) {
        subscription.unsubscribe();
        delete subscriptions.current[item.uid];
      }
    }
    const data = rtkQueryState[`getFolderChildren("${item.uid}")`]?.data;
    const emptyFolder = Array.isArray(data) && data.length === 0;
    if (isOpen && emptyFolder) {
      mappedChildren.push({
        isOpen: false,
        level: level + 1,
        item: { kind: 'ui-empty-folder', uid: item.uid + '-empty-folder' },
      });
    }

    const thisItem = {
      item,
      parentUID,
      level,
      isOpen,
    };

    return [thisItem, ...mappedChildren];
  }

  const isOpen = (folderUID && openFolders[folderUID]) || level === 0;
  if (folderUID) {
    if (isOpen) {
      if (!subscriptions.current[folderUID]) {
        const subscription = dispatch(endpoints.getFolderChildren.initiate(folderUID));
        subscriptions.current[folderUID] = subscription;
      }
    } else {
      const subscription = subscriptions.current[folderUID];
      if (subscription) {
        subscription.unsubscribe();
        delete subscriptions.current[folderUID];
      }
    }
  }

  const data = rtkQueryState[`getFolderChildren("${folderUID}")`]?.data;
  const items = folderUID
    ? (isOpen && Array.isArray(data) && data) || [] // keep seperate lines
    : rootItems;

  return items.flatMap((item) => mapItem(item, folderUID, level));
}

/**
 * Returns a DashboardTreeSelection but unselects any selected folder's children.
 * This is useful when making backend requests to move or delete items.
 * In this case, we only need to move/delete the parent folder and it will cascade to the children.
 * @param selectedItemsState Overall selection state
 * @param childrenByParentUID Arrays of children keyed by their parent UID
 */
function getSelectedItemsForActions(
  selectedItemsState: DashboardTreeSelection,
  childrenByParentUID: Record<string, DashboardViewItem[] | undefined>
): Omit<DashboardTreeSelection, 'panel' | '$all'> {
  // Take a copy of the selected items to work with
  // We don't care about panels here, only dashboards and folders can be moved or deleted
  const result = {
    dashboard: { ...selectedItemsState.dashboard },
    folder: { ...selectedItemsState.folder },
  };

  // Loop over selected folders in the input
  for (const folderUID of Object.keys(selectedItemsState.folder)) {
    const isSelected = selectedItemsState.folder[folderUID];
    if (isSelected) {
      // Unselect any children in the output
      const children = childrenByParentUID[folderUID];
      if (children) {
        for (const child of children) {
          if (child.kind === 'dashboard') {
            result.dashboard[child.uid] = false;
          }
          if (child.kind === 'folder') {
            result.folder[child.uid] = false;
          }
        }
      }
    }
  }

  return result;
}
