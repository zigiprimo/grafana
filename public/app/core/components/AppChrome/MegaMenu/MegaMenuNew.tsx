import { css } from '@emotion/css';
import { cloneDeep } from 'lodash';
import React from 'react';
import { useLocation } from 'react-router-dom';

import { GrafanaTheme2, locationUtil, textUtil } from '@grafana/data';
import { config } from '@grafana/runtime';
import { CustomScrollbar, useStyles2, Button, Dropdown, ToolbarButton, LinkButton, getInputStyles } from '@grafana/ui';
import { contextSrv } from 'app/core/core';
import { useSelector } from 'app/types';

import { QuickAdd } from '../QuickAdd/QuickAdd';
import { TopNavBarMenu } from '../TopBar/TopNavBarMenu';
import { TopSearchBarCommandPaletteTrigger } from '../TopBar/TopSearchBarCommandPaletteTrigger';

import { NavBarMenuSection } from './NavBarMenuSection';
import { enrichWithInteractionTracking, getActiveItem } from './utils';

export interface Props {
  onClose: () => void;
  onCollapse?: () => void;
  onPinned?: () => void;
}

export const MegaMenuNew = React.memo<Props>(({ onClose, onCollapse, onPinned }) => {
  const navBarTree = useSelector((state) => state.navBarTree);
  const styles = useStyles2(getStyles);
  const location = useLocation();
  const navIndex = useSelector((state) => state.navIndex);
  const navTree = cloneDeep(navBarTree);

  // Remove profile + help from tree
  const navItems = navTree
    .filter((item) => item.id !== 'profile' && item.id !== 'help' && item.id !== 'home')
    .map((item) => enrichWithInteractionTracking(item, true));

  const activeItem = getActiveItem(navItems, location.pathname);
  const profileNode = navIndex['profile'];

  let homeUrl = config.appSubUrl || '/';
  if (!contextSrv.isSignedIn && !config.anonymousEnabled) {
    homeUrl = textUtil.sanitizeUrl(locationUtil.getUrlForPartial(location, { forceLogin: 'true' }));
  }

  return (
    <nav className={styles.menuWrapper}>
      <div className={styles.header}>
        <div className={styles.headerLevel}>
          <TopSearchBarCommandPaletteTrigger />
          <QuickAdd />
        </div>
      </div>
      <div className={styles.body}>
        <CustomScrollbar showScrollIndicators hideHorizontalTrack>
          <ul className={styles.itemList}>
            {navItems.map((link) => (
              <NavBarMenuSection onClose={onClose} link={link} activeItem={activeItem} key={link.text} />
            ))}
          </ul>
        </CustomScrollbar>
        {onCollapse && (
          <div className={styles.footer}>
            <Button variant="secondary" onClick={onCollapse} fullWidth size="sm" fill="outline" icon="angle-left">
              Collapse
            </Button>
          </div>
        )}
        {onPinned && (
          <div className={styles.footer}>
            <Button variant="secondary" onClick={onPinned} fullWidth size="sm" fill="outline">
              Pin
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
});

MegaMenuNew.displayName = 'MegaMenuNew';

export const MENU_WIDTH = '250px';

const getStyles = (theme: GrafanaTheme2) => {
  const baseStyles = getInputStyles({ theme });

  return {
    menuWrapper: css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexGrow: 0,
      minHeight: 0,
      borderRight: `1px solid ${theme.colors.border.weak}`,
      width: MENU_WIDTH,
    }),
    header: css({
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(1.5, 2, 1, 1),
      flexGrow: 0,
      gap: theme.spacing(2),
    }),
    headerLevel: css({
      display: 'flex',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
    }),
    body: css({
      flexGrow: 1,
      minHeight: 0,
    }),
    footer: css({
      padding: theme.spacing(2),
      flexGrow: 0,
      display: 'flex',
    }),
    img: css({
      height: theme.spacing(3),
      width: theme.spacing(3),
    }),
    logo: css({
      display: 'flex',
    }),
    profileButton: css({
      padding: theme.spacing(0, 0.25),
      img: {
        borderRadius: '50%',
        height: '16px',
        marginRight: 0,
        width: '16px',
      },
    }),
    itemList: css({
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(1, 2, 1, 1),
      flexGrow: 1,
    }),
  };
};
