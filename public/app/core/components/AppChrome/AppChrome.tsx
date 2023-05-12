import { css, cx } from '@emotion/css';
import classNames from 'classnames';
import React, { PropsWithChildren } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { CommandPalette } from 'app/features/commandPalette/CommandPalette';
import { KioskMode } from 'app/types';

import { MegaMenuNew } from './MegaMenu/MegaMenuNew';
import { MegaMenuOverlay } from './MegaMenu/MegaMenuOverlay';
import { NavToolbar } from './NavToolbar/NavToolbar';
import { TopSearchBar } from './TopBar/TopSearchBar';

export interface Props extends PropsWithChildren<{}> {}

export function AppChrome({ children }: Props) {
  const styles = useStyles2(getStyles);
  const { chrome } = useGrafana();
  const state = chrome.useState();

  const searchBarHidden = state.searchBarHidden || state.kioskMode === KioskMode.TV;

  const contentClass = cx({
    [styles.content]: true,
    [styles.contentNoSearchBar]: searchBarHidden,
    [styles.contentChromeless]: state.chromeless,
  });

  // Chromeless routes are without topNav, mega menu, search & command palette
  // We check chromeless twice here instead of having a separate path so {children}
  // doesn't get re-mounted when chromeless goes from true to false.

  return (
    <main className={classNames('main-view', searchBarHidden && 'main-view--search-bar-hidden')}>
      <div className={styles.panes}>
        {state.megaMenuPinned && (
          <MegaMenuNew onCollapse={() => chrome.update({ megaMenuPinned: false })} onClose={() => {}} />
        )}
        <div className={contentClass}>
          <NavToolbar
            searchBarHidden={searchBarHidden}
            sectionNav={state.sectionNav.node}
            pageNav={state.pageNav}
            actions={state.actions}
            onToggleSearchBar={chrome.onToggleSearchBar}
            onToggleMegaMenu={chrome.onToggleMegaMenu}
            onToggleKioskMode={chrome.onToggleKioskMode}
            megaMenuPinned={state.megaMenuPinned}
          />
          <div className={styles.pageContainer}>{children}</div>
        </div>
      </div>

      {!state.chromeless && (
        <>
          <MegaMenuOverlay
            searchBarHidden={searchBarHidden}
            onClose={() => chrome.setMegaMenu(false)}
            onPinned={() => chrome.update({ megaMenuPinned: true, megaMenuOpen: false })}
          />
          <CommandPalette />
        </>
      )}
    </main>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  const shadow = theme.isDark
    ? `0 0.6px 1.5px rgb(0 0 0), 0 2px 4px rgb(0 0 0 / 40%), 0 5px 10px rgb(0 0 0 / 23%)`
    : '0 0.6px 1.5px rgb(0 0 0 / 8%), 0 2px 4px rgb(0 0 0 / 6%), 0 5px 10px rgb(0 0 0 / 5%)';

  return {
    content: css({
      display: 'flex',
      flexDirection: 'column',
      //paddingTop: TOP_BAR_LEVEL_HEIGHT * 2,
      flexGrow: 1,
      height: '100%',
      minWidth: 0,
    }),
    // contentNoSearchBar: css({
    //   paddingTop: TOP_BAR_LEVEL_HEIGHT,
    // }),
    contentChromeless: css({
      paddingTop: 0,
    }),
    topNav: css({
      display: 'flex',
      position: 'fixed',
      zIndex: theme.zIndex.navbarFixed,
      left: 0,
      right: 0,
      boxShadow: shadow,
      background: theme.colors.background.primary,
      flexDirection: 'column',
      borderBottom: `1px solid ${theme.colors.border.weak}`,
    }),
    panes: css({
      label: 'page-panes',
      display: 'flex',
      height: '100%',
      width: '100%',
      flexGrow: 1,
      minHeight: 0,
      flexDirection: 'row',
    }),
    pageContainer: css({
      label: 'page-container',
      flexGrow: 1,
      minHeight: 0,
    }),
    skipLink: css({
      position: 'absolute',
      top: -1000,

      ':focus': {
        left: theme.spacing(1),
        top: theme.spacing(1),
        zIndex: theme.zIndex.portal,
      },
    }),
  };
};
