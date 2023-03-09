import React, { Suspense, useEffect, useLayoutEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// @ts-ignore
import Drop from 'tether-drop';

import { locationSearchToObject, navigationLogger, reportPageview } from '@grafana/runtime';
import { ErrorBoundary } from '@grafana/ui';

import { useGrafana } from '../context/GrafanaContext';
import { contextSrv } from '../services/context_srv';

import { GrafanaRouteError } from './GrafanaRouteError';
import { GrafanaRouteLoading } from './GrafanaRouteLoading';
import { GrafanaRouteComponentProps, RouteDescriptor } from './types';

export interface Props extends Omit<GrafanaRouteComponentProps, 'queryParams'> {}

export function GrafanaRoute({ route }: Props) {
  const { chrome, keybindings } = useGrafana();
  const location = useLocation();

  chrome.setMatchedRoute(route);

  useLayoutEffect(() => {
    keybindings.clearAndInitGlobalBindings(route);
  }, [keybindings, route]);

  useEffect(() => {
    updateBodyClassNames(route);
    cleanupDOM();
    navigationLogger('GrafanaRoute', false, 'Mounted', route);

    return () => {
      navigationLogger('GrafanaRoute', false, 'Unmounted', route);
      updateBodyClassNames(route, true);
    };
    // props.match instance change even though only query params changed so to make this effect only trigger on route mount we have to disable exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cleanupDOM();
    reportPageview();
    navigationLogger('GrafanaRoute', false, 'Updated', route);
  });

  navigationLogger('GrafanaRoute', false, 'Rendered', route);

  return (
    <ErrorBoundary>
      {({ error, errorInfo }) => {
        if (error) {
          return <GrafanaRouteError error={error} errorInfo={errorInfo} />;
        }

        if (route.roles && route.roles().length) {
          if (!route.roles().some((r: string) => contextSrv.hasRole(r))) {
            return <Navigate to="/" replace />;
          }
        }

        return (
          <Suspense fallback={<GrafanaRouteLoading />}>
            <route.component route={route} queryParams={locationSearchToObject(location.search)} />
          </Suspense>
        );
      }}
    </ErrorBoundary>
  );
}

function getPageClasses(route: RouteDescriptor) {
  return route.pageClass ? route.pageClass.split(' ') : [];
}

function updateBodyClassNames(route: RouteDescriptor, clear = false) {
  for (const cls of getPageClasses(route)) {
    if (clear) {
      document.body.classList.remove(cls);
    } else {
      document.body.classList.add(cls);
    }
  }
}

function cleanupDOM() {
  document.body.classList.remove('sidemenu-open--xs');

  // cleanup tooltips
  const tooltipById = document.getElementById('tooltip');
  tooltipById?.parentElement?.removeChild(tooltipById);

  const tooltipsByClass = document.querySelectorAll('.tooltip');
  for (let i = 0; i < tooltipsByClass.length; i++) {
    const tooltip = tooltipsByClass[i];
    tooltip.parentElement?.removeChild(tooltip);
  }

  // cleanup tether-drop
  for (const drop of Drop.drops) {
    drop.destroy();
  }
}
