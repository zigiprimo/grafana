import { css } from '@emotion/css';
import { cloneDeep } from 'lodash';
import React from 'react';
import { useLocation } from 'react-router-dom';

import { GrafanaTheme2 } from '@grafana/data';
import { CustomScrollbar, useStyles2, Button } from '@grafana/ui';
import { useSelector } from 'app/types';

import { NavBarMenuItemWrapper } from './NavBarMenuItemWrapper';
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

  const navTree = cloneDeep(navBarTree);

  // Remove profile + help from tree
  const navItems = navTree
    .filter((item) => item.id !== 'profile' && item.id !== 'help' && item.id !== 'home')
    .map((item) => enrichWithInteractionTracking(item, true));

  const activeItem = getActiveItem(navItems, location.pathname);

  return (
    <nav className={styles.menuWrapper}>
      <CustomScrollbar showScrollIndicators hideHorizontalTrack>
        <ul className={styles.itemList}>
          {navItems.map((link) => (
            <NavBarMenuItemWrapper link={link} onClose={onClose} activeItem={activeItem} key={link.text} />
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
    </nav>
  );
});

MegaMenuNew.displayName = 'MegaMenuNew';

export const MENU_WIDTH = '280px';

const getStyles = (theme: GrafanaTheme2) => ({
  menuWrapper: css({
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 0,
    minHeight: 0,
    borderRight: `1px solid ${theme.colors.border.weak}`,
    width: MENU_WIDTH,
  }),
  footer: css({
    padding: theme.spacing(2),
    flexGrow: 0,
    display: 'flex',
  }),
  itemList: css({
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1, 2),
    flexGrow: 1,
  }),
});
