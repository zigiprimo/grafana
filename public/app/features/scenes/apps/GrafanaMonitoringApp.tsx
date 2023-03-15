// Libraries
import React, { useState } from 'react';

import {
  SceneCanvasText,
  SceneFlexLayout,
  SceneApp,
  SceneAppPage,
  SceneRouteMatch,
  EmbeddedScene,
  SceneAppPageLike,
  SceneTimeRange,
  SceneTimePicker,
  SceneRefreshPicker,
  SceneAppPageCustomControl,
} from '@grafana/scenes';
import { Badge, Spinner } from '@grafana/ui';
import { usePageNav } from 'app/core/components/Page/usePageNav';
import { PluginPageContext, PluginPageContextType } from 'app/features/plugins/components/PluginPageContext';

import { getOverviewScene, getHttpHandlerListScene, getHandlerDetailsScene, getHandlerLogsScene } from './scenes';

const appScene = new SceneApp({
  pages: [getMainPageScene()],
});

export function GrafanaMonitoringApp() {
  const sectionNav = usePageNav('scenes')!;
  const [pluginContext] = useState<PluginPageContextType>({ sectionNav });

  return (
    <PluginPageContext.Provider value={pluginContext}>
      <appScene.Component model={appScene} />;
    </PluginPageContext.Provider>
  );
}

export function getMainPageScene() {
  const mainPage = new SceneAppPage({
    title: 'Grafana Monitoring',
    titleImg: 'public/img/grafana_icon.svg',
    subTitle: 'A custom app with embedded scenes to monitor your Grafana server',
    url: '/scenes/grafana-monitoring',
    hideFromBreadcrumbs: false,
    getScene: getOverviewScene,
    controls: [
      new SceneAppPageCustomControl({ label: 'Status', value: <Spinner />, separator: true }),
      new SceneTimePicker({ isOnCanvas: true, label: 'Time' }),
      new SceneRefreshPicker({ isOnCanvas: true, label: 'Refresh' }),
    ],
    tabs: [
      new SceneAppPage({
        title: 'Overview',
        url: '/scenes/grafana-monitoring',
        getScene: getOverviewScene,
        preserveUrlKeys: ['from', 'to', 'var-instance'],
      }),
      // new SceneAppPage({
      //   title: 'HTTP handlers',
      //   url: '/scenes/grafana-monitoring/handlers',
      //   getScene: getHttpHandlerListScene,
      //   preserveUrlKeys: ['from', 'to', 'var-instance'],
      //   drilldowns: [
      //     {
      //       routePath: '/scenes/grafana-monitoring/handlers/:handler',
      //       getPage: getHandlerDrilldownPage,
      //     },
      //   ],
      // }),
      // new SceneAppPage({
      //   title: 'Logs',
      //   url: '/scenes/grafana-monitoring/logs',
      //   getScene: getOverviewLogsScene,
      //   preserveUrlKeys: ['from', 'to', 'var-instance'],
      // }),
    ],
  });

  mainPage.registerActivationHandler(() => {
    if (mainPage.state.tabs!.length > 1) {
      return;
    }

    const timeout = setTimeout(() => {
      const status = mainPage.state.controls![0] as SceneAppPageCustomControl;

      status.setState({
        value: <Badge text="Online" color="green" />,
      });

      mainPage.setState({
        ...mainPage.state,
        // Update page info
        // Tests adding a dynamic tab based on some async query or data state
        tabs: [
          ...mainPage.state.tabs!,
          new SceneAppPage({
            title: 'HTTP handlers',
            url: '/scenes/grafana-monitoring/handlers',
            getScene: getHttpHandlerListScene,
            preserveUrlKeys: ['from', 'to', 'var-instance'],
            drilldowns: [
              {
                routePath: '/scenes/grafana-monitoring/handlers/:handler',
                getPage: getHandlerDrilldownPage,
              },
            ],
          }),
        ],
      });
    }, 2000);

    return () => clearTimeout(timeout);
  });

  return mainPage;
}

export function getHandlerDrilldownPage(
  match: SceneRouteMatch<{ handler: string; tab?: string }>,
  parent: SceneAppPageLike
) {
  const handler = decodeURIComponent(match.params.handler);
  const baseUrl = `/scenes/grafana-monitoring/handlers/${encodeURIComponent(handler)}`;

  return new SceneAppPage({
    title: handler,
    subTitle: 'A grafana http handler is responsible for service a specific API request',
    url: baseUrl,
    $timeRange: new SceneTimeRange(),
    pageInfo: [],
    getParentPage: () => parent,
    getScene: () => getHandlerDetailsScene(handler),
    tabs: [
      new SceneAppPage({
        title: 'Metrics',
        url: baseUrl,
        routePath: '/scenes/grafana-monitoring/handlers/:handler',
        getScene: () => getHandlerDetailsScene(handler),
        preserveUrlKeys: ['from', 'to', 'var-instance'],
      }),
      new SceneAppPage({
        title: 'Logs',
        url: baseUrl + '/logs',
        routePath: '/scenes/grafana-monitoring/handlers/:handler/logs',
        getScene: () => getHandlerLogsScene(handler),
        preserveUrlKeys: ['from', 'to', 'var-instance'],
        drilldowns: [
          {
            routePath: '/scenes/grafana-monitoring/handlers/:handler/logs/:secondLevel',
            getPage: getSecondLevelDrilldown,
          },
        ],
      }),
    ],
  });
}

export function getSecondLevelDrilldown(
  match: SceneRouteMatch<{ handler: string; secondLevel: string }>,
  parent: SceneAppPageLike
) {
  const handler = decodeURIComponent(match.params.handler);
  const secondLevel = decodeURIComponent(match.params.secondLevel);
  const baseUrl = `/scenes/grafana-monitoring/handlers/${encodeURIComponent(handler)}/logs/${secondLevel}`;

  return new SceneAppPage({
    title: secondLevel,
    subTitle: 'Second level dynamic drilldown',
    url: baseUrl,
    getParentPage: () => parent,
    getScene: () => {
      return new EmbeddedScene({
        body: new SceneFlexLayout({
          children: [
            new SceneCanvasText({
              text: 'Drilldown: ' + secondLevel,
            }),
          ],
        }),
      });
    },
  });
}

export default GrafanaMonitoringApp;
