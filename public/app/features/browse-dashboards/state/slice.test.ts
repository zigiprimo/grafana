import { wellFormedDashboard, wellFormedFolder } from '../fixtures/dashboardsTreeItem.fixture';
import { BrowseDashboardsState } from '../types';

import { browseDashboardsReducer } from './slice';

function createInitialState(): BrowseDashboardsState {
  return {
    rootItems: [],
    childrenByParentUID: {},
    openFolders: {},
    selectedItems: {
      $all: false,
      dashboard: {},
      folder: {},
      panel: {},
    },
  };
}

describe('browse-dashboards slice', () => {
  describe('extraReducers', () => {
    describe('getFolderChildren', () => {
      it('updates state correctly for root items', () => {
        const state = createInitialState();
        const children = [
          wellFormedFolder(1).item,
          wellFormedFolder(2).item,
          wellFormedFolder(3).item,
          wellFormedDashboard(4).item,
        ];

        const action = {
          payload: children,
          type: 'browseDashboardsAPI/executeQuery/fulfilled',
          meta: {
            arg: {
              endpointName: "getFolderChildren",
              originalArgs: undefined,
            },
            requestId: 'abc-123',
            requestStatus: 'fulfilled' as const,
          },
        };

        const updatedState = browseDashboardsReducer(state, action);

        expect(updatedState.rootItems).toEqual(children);
      });

      it('updates state correctly for items in folders', () => {
        const state = createInitialState();
        const parentFolder = wellFormedFolder(1).item;
        const children = [wellFormedFolder(2).item, wellFormedDashboard(3).item];

        const action = {
          payload: children,
          type: 'browseDashboardsAPI/executeQuery/fulfilled',
          meta: {
            arg: {
              endpointName: "getFolderChildren",
              originalArgs: parentFolder.uid
            },
            requestId: 'abc-123',
            requestStatus: 'fulfilled' as const,
          },
        };

        const updatedState = browseDashboardsReducer(state, action);

        expect(updatedState.childrenByParentUID).toEqual({ [parentFolder.uid]: children });
      });

      it('marks children as selected if the parent is selected', () => {
        const parentFolder = wellFormedFolder(1).item;

        const state = createInitialState();
        state.selectedItems.folder[parentFolder.uid] = true;

        const childFolder = wellFormedFolder(2).item;
        const childDashboard = wellFormedDashboard(3).item;

        const action = {
          payload: [childFolder, childDashboard],
          type: 'browseDashboardsAPI/executeQuery/fulfilled',
          meta: {
            arg: {
              endpointName: "getFolderChildren",
              originalArgs: parentFolder.uid,
            },
            requestId: 'abc-123',
            requestStatus: 'fulfilled' as const,
          },
        };

        const updatedState = browseDashboardsReducer(state, action);

        expect(updatedState.selectedItems).toEqual({
          $all: false,
          dashboard: {
            [childDashboard.uid]: true,
          },
          folder: {
            [parentFolder.uid]: true,
            [childFolder.uid]: true,
          },
          panel: {},
        });
      });
    });
  });
});
