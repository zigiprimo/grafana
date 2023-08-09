import { AddPanelToDashboardOptions, AddToDashboardError, AddToDashboardSrv } from '@grafana/runtime';
import { backendSrv } from 'app/core/services/backend_srv';

import {
  getNewDashboardModelData,
  removeDashboardToFetchFromLocalStorage,
  setDashboardToFetchFromLocalStorage,
} from '../state/initDashboard';

function createDashboard() {
  const dto = getNewDashboardModelData();

  // getNewDashboardModelData adds by default the "add-panel" panel. We don't want that.
  dto.dashboard.panels = [];

  return dto;
}

class AddToDashboardService implements AddToDashboardSrv {
  async setDashboardInLocalStorage(options: AddPanelToDashboardOptions) {
    const panel = {
      targets: options.queries,
      type: options.panelType,
      title: 'New Panel',
      gridPos: { x: 0, y: 0, w: 12, h: 8 },
      datasource: options.datasource,
    };

    let dto;

    if (options.dashboardUid) {
      try {
        dto = await backendSrv.getDashboardByUid(options.dashboardUid);
      } catch (e) {
        throw AddToDashboardError.FETCH_DASHBOARD;
      }
    } else {
      dto = createDashboard();
    }

    dto.dashboard.panels = [panel, ...(dto.dashboard.panels ?? [])];

    try {
      setDashboardToFetchFromLocalStorage(dto);
    } catch {
      throw AddToDashboardError.SET_DASHBOARD_LS;
    }
  }

  removeDashboardFromLocalStorage(): void {
    removeDashboardToFetchFromLocalStorage();
  }
}

export const addToDashboardService = new AddToDashboardService();
