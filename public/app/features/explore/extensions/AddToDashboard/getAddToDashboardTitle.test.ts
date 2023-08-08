import { getAddToDashboardTitle } from './getAddToDashboardTitle';

jest.mock('app/core/services/context_srv');

describe('getAddToDashboardTitle', () => {
  it('should return title ending with "dashboard" if user has full access', () => {
    expect(getAddToDashboardTitle()).toBe('Add panel to dashboard');
  });

  it('should return title ending with "dashboard" if user has no access', () => {
    expect(getAddToDashboardTitle()).toBe('Add panel to dashboard');
  });

  it('should return title ending with "new dashboard" if user only has access to create dashboards', () => {
    expect(getAddToDashboardTitle()).toBe('Add panel to new dashboard');
  });

  it('should return title ending with "existing dashboard" if user only has access to edit dashboards', () => {
    expect(getAddToDashboardTitle()).toBe('Add panel to existing dashboard');
  });
});
