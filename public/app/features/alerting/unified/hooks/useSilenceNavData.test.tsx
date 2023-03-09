import { render } from '@testing-library/react';
import React from 'react';
import { useResolvedPath } from 'react-router-dom';

import { useSilenceNavData } from './useSilenceNavData';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useResolvedPath: jest.fn(),
}));

const setup = () => {
  let result: ReturnType<typeof useSilenceNavData>;
  function TestComponent() {
    result = useSilenceNavData();
    return null;
  }

  render(<TestComponent />);

  return { result };
};
describe('useSilenceNavData', () => {
  it('should return correct nav data when route is "/alerting/silence/new"', () => {
    (useResolvedPath as jest.Mock).mockReturnValue({ pathname: '/alerting/silence/new' });
    const { result } = setup();

    expect(result).toEqual({
      icon: 'bell-slash',
      breadcrumbs: [{ title: 'Silences', url: 'alerting/silences' }],
      id: 'silence-new',
      text: 'Add silence',
    });
  });

  it('should return correct nav data when route is "/alerting/silence/:id/edit"', () => {
    (useResolvedPath as jest.Mock).mockReturnValue({ pathname: '/alerting/silence/:id/edit' });
    const { result } = setup();

    expect(result).toEqual({
      icon: 'bell-slash',
      breadcrumbs: [{ title: 'Silences', url: 'alerting/silences' }],
      id: 'silence-edit',
      text: 'Edit silence',
    });
  });
});
