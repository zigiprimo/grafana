import { useEffect, useState } from 'react';
import { useResolvedPath } from 'react-router-dom';

import { NavModelItem } from '@grafana/data';

const defaultPageNav: Partial<NavModelItem> = {
  icon: 'bell-slash',
  breadcrumbs: [{ title: 'Silences', url: 'alerting/silences' }],
};

export function useSilenceNavData() {
  const path = useResolvedPath('').pathname;
  const [pageNav, setPageNav] = useState<Pick<NavModelItem, 'id' | 'text' | 'icon'> | undefined>();

  useEffect(() => {
    if (path === '/alerting/silence/new') {
      setPageNav({
        ...defaultPageNav,
        id: 'silence-new',
        text: 'Add silence',
      });
    } else if (path === '/alerting/silence/:id/edit') {
      setPageNav({
        ...defaultPageNav,
        id: 'silence-edit',
        text: 'Edit silence',
      });
    }
  }, [path]);

  return pageNav;
}
