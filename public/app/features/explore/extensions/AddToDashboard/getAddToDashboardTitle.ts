import { getMiscSrv } from '@grafana/runtime';

export function getAddToDashboardTitle(): string {
  const canCreateDashboard = getMiscSrv().canCreateDashboard();
  const canWriteDashboard = getMiscSrv().canWriteDashboard();

  if (canCreateDashboard && !canWriteDashboard) {
    return 'Add panel to new dashboard';
  }

  if (canWriteDashboard && !canCreateDashboard) {
    return 'Add panel to existing dashboard';
  }

  return 'Add panel to dashboard';
}
