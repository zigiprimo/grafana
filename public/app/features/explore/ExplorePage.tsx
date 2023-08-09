import { css } from '@emotion/css';
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';

import {
  ErrorBoundaryAlert,
  Exploration,
  ExplorationContextProvider,
  ExplorationPaneContextProvider,
  useExplorationContext,
} from '@grafana/ui';
import { SplitPaneWrapper } from 'app/core/components/SplitPaneWrapper/SplitPaneWrapper';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { useNavModel } from 'app/core/hooks/useNavModel';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { ExploreQueryParams } from 'app/features/explore/types';

import { ExploreActions } from './ExploreActions';
import { ExplorePaneContainer } from './ExplorePaneContainer';
import { useExplorePageTitle } from './hooks/useExplorePageTitle';
import { useSplitSizeUpdater } from './hooks/useSplitSizeUpdater';
import { useStateSync } from './hooks/useStateSync';
import { useTimeSrvFix } from './hooks/useTimeSrvFix';
import { isSplit, selectPanesEntries } from './state/selectors';
import { getExploreService, setupExploreRedux } from './state/service';
import { getExploreStore, useExploreSelector } from './state/store';

const MIN_PANE_WIDTH = 200;

const styles = {
  pageScrollbarWrapper: css`
    width: 100%;
    flex-grow: 1;
    min-height: 0;
    height: 100%;
    position: relative;
  `,
};

setupExploreRedux();
const store = getExploreStore();

export default function ExplorePage(props: GrafanaRouteComponentProps<{}, ExploreQueryParams>) {
  const navModel = useNavModel('explore');
  const { chrome } = useGrafana();

  useEffect(() => {
    //This is needed for breadcrumbs and topnav.
    //We should probably abstract this out at some point
    chrome.update({ sectionNav: navModel });
  }, [chrome, navModel]);

  const exploration = getExploreService();

  return (
    <div className={styles.pageScrollbarWrapper}>
      <ExplorationContextProvider value={exploration}>
        <Provider store={store}>
          <ExplorePageContent {...props} />
        </Provider>
      </ExplorationContextProvider>
    </div>
  );
}

function ExplorePageContent(props: GrafanaRouteComponentProps<{}, ExploreQueryParams>) {
  useTimeSrvFix();
  useStateSync(props.queryParams);
  // We want  to set the title according to the URL and not to the state because the URL itself may lag
  // (due to how useStateSync above works) by a few milliseconds.
  // When a URL is pushed to the history, the browser also saves the title of the page and
  // if we were to update the URL on state change, the title would not match the URL.
  // Ultimately the URL is the single source of truth from which state is derived, the page title is not different
  useExplorePageTitle(props.queryParams);
  const { keybindings } = useGrafana();
  const { updateSplitSize, widthCalc } = useSplitSizeUpdater(MIN_PANE_WIDTH);

  const panes = useExploreSelector(selectPanesEntries);
  const hasSplit = useExploreSelector(isSplit);

  // @ts-ignore
  const exploration: Exploration = useExplorationContext();

  useEffect(() => {
    keybindings.setupTimeRangeBindings(false);
  }, [keybindings]);

  return (
    <>
      <ExploreActions />

      <SplitPaneWrapper
        splitOrientation="vertical"
        paneSize={widthCalc}
        minSize={MIN_PANE_WIDTH}
        maxSize={MIN_PANE_WIDTH * -1}
        primary="second"
        splitVisible={hasSplit}
        paneStyle={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}
        onDragFinished={(size) => size && updateSplitSize(size)}
      >
        {panes.map(([exploreId], index) => {
          const explorationPane = exploration.panes[index];
          return (
            <ErrorBoundaryAlert key={exploreId} style="page">
              <ExplorationPaneContextProvider value={explorationPane}>
                <ExplorePaneContainer exploreId={exploreId} />
              </ExplorationPaneContextProvider>
            </ErrorBoundaryAlert>
          );
        })}
      </SplitPaneWrapper>
    </>
  );
}
