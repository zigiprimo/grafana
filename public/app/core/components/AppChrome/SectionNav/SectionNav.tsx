import { css, cx } from '@emotion/css';
import React, { useEffect, useState } from 'react';
import { useLocalStorage } from 'react-use';

import { NavModel, GrafanaTheme2, PageLayoutType } from '@grafana/data';
import { useStyles2, CustomScrollbar, useTheme2 } from '@grafana/ui';
import { useGrafana } from 'app/core/context/GrafanaContext';

import { MegaMenu } from '../MegaMenu/MegaMenu';

import { SectionNavItem } from './SectionNavItem';
import { SectionNavToggle } from './SectionNavToggle';

export interface Props {
  model: NavModel;
}

export function SectionNav({ model }: Props) {
  const styles = useStyles2(getStyles);
  const { chrome } = useGrafana();
  const state = chrome.useState();

  // if (!Boolean(model.main?.children?.length)) {
  //   return null;
  // }

  return (
    <div className={styles.navContainer}>
      <nav
        className={cx(styles.nav, {
          [styles.navExpanded]: state.megaMenuOpen,
          [styles.canvasContainer]: state.layout === PageLayoutType.Canvas,
        })}
      >
        <CustomScrollbar showScrollIndicators>
          <MegaMenu onClose={() => chrome.setMegaMenu(false)} />
          {/* <div className={styles.items} role="tablist">
            <SectionNavItem item={model.main} isSectionRoot />
          </div> */}
        </CustomScrollbar>
      </nav>
      {/* <SectionNavToggle isExpanded={isExpanded} onClick={onToggleSectionNav} /> */}
    </div>
  );
}

function useSectionNavState() {
  const theme = useTheme2();

  const isSmallScreen = window.matchMedia(`(max-width: ${theme.breakpoints.values.lg}px)`).matches;
  const [navExpandedPreference, setNavExpandedPreference] = useLocalStorage<boolean>(
    'grafana.sectionNav.expanded',
    !isSmallScreen
  );
  const [isExpanded, setIsExpanded] = useState(!isSmallScreen && navExpandedPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${theme.breakpoints.values.lg}px)`);
    const onMediaQueryChange = (e: MediaQueryListEvent) => setIsExpanded(e.matches ? false : navExpandedPreference);
    mediaQuery.addEventListener('change', onMediaQueryChange);
    return () => mediaQuery.removeEventListener('change', onMediaQueryChange);
  }, [navExpandedPreference, theme.breakpoints.values.lg]);

  const onToggleSectionNav = () => {
    setNavExpandedPreference(!isExpanded);
    setIsExpanded(!isExpanded);
  };

  return { isExpanded, onToggleSectionNav };
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    canvasContainer: css({
      borderRight: `1px solid ${theme.colors.border.weak}`,
      boxShadow: theme.shadows.z2,
      // transition: 'none',
      zIndex: theme.zIndex.sidemenu,
    }),
    navContainer: css({
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      transition: theme.transitions.create(['border', 'box-shadow', 'z-index']),

      [theme.breakpoints.up('md')]: {
        flexDirection: 'row',
      },
    }),
    nav: css({
      display: 'flex',
      flexDirection: 'column',
      background: theme.colors.background.canvas,
      flexShrink: 0,
      // transition: theme.transitions.create(['width', 'max-height']),
      maxHeight: 0,
      visibility: 'hidden',
      [theme.breakpoints.up('md')]: {
        width: 0,
        maxHeight: 'unset',
      },
    }),
    navExpanded: css({
      maxHeight: '50vh',
      visibility: 'visible',
      [theme.breakpoints.up('md')]: {
        width: '250px',
        maxHeight: 'unset',
      },
    }),
    items: css({
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(2, 1, 2, 2),
      minWidth: '250px',

      [theme.breakpoints.up('md')]: {
        padding: theme.spacing(4.5, 1, 2, 2),
      },
    }),
  };
};
