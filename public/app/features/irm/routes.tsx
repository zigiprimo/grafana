import React from 'react';

import { NavLandingPage } from 'app/core/components/NavLandingPage/NavLandingPage';
import { RouteDescriptor } from 'app/core/navigation/types';

import Detections from './detections';
import Incidents from './incidents';
import Schedules from './schedules';

const commonRoutes: RouteDescriptor[] = [
  {
    path: '/irm',
    component: () => <NavLandingPage navId="irm" />,
  },
  {
    path: '/irm/respond',
    component: () => <NavLandingPage navId="irm/respond" />,
  },
  {
    path: '/irm/respond/detections',
    exact: false,
    component: () => <Detections />,
  },
  {
    path: '/irm/respond/incidents',
    exact: false,
    component: () => <Incidents />,
  },
  {
    path: '/irm/respond/schedules',
    exact: false,
    component: () => <Schedules />,
  },
  {
    path: '/irm/settings',
    component: () => <NavLandingPage navId="irm/settings" />,
  },
];

export function getIrmRoutes(): RouteDescriptor[] {
  return [...commonRoutes];
}
