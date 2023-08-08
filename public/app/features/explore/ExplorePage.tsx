import { css } from '@emotion/css';
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';

import { ErrorBoundaryAlert } from '@grafana/ui';
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
import { exploreReducer, initialExploreState } from './state/main';
import { isSplit, selectPanesEntries } from './state/selectors';
import { configureExploreStore, useExploreSelector } from './state/store';

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

const store = configureExploreStore(exploreReducer, initialExploreState);

export default function ExplorePage(props: GrafanaRouteComponentProps<{}, ExploreQueryParams>) {
  const navModel = useNavModel('explore');
  const { chrome } = useGrafana();

  useEffect(() => {
    //This is needed for breadcrumbs and topnav.
    //We should probably abstract this out at some point
    chrome.update({ sectionNav: navModel });
  }, [chrome, navModel]);

  return (
    <div className={styles.pageScrollbarWrapper}>
      <Provider store={store}>
        <ExplorePageContent {...props} />
      </Provider>
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
        {panes.map(([exploreId]) => {
          return (
            <ErrorBoundaryAlert key={exploreId} style="page">
              <ExplorePaneContainer exploreId={exploreId} />
            </ErrorBoundaryAlert>
          );
        })}
      </SplitPaneWrapper>
    </>
  );
}
