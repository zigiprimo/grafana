import { css } from '@emotion/css';
import { useDialog } from '@react-aria/dialog';
import { FocusScope } from '@react-aria/focus';
import { OverlayContainer, useOverlay } from '@react-aria/overlays';
import React, { useEffect, useRef, useState } from 'react';
import CSSTransition from 'react-transition-group/CSSTransition';

import { GrafanaTheme2 } from '@grafana/data';
import { Icon, IconButton, useTheme2 } from '@grafana/ui';
import { useGrafana } from 'app/core/context/GrafanaContext';

import { TOP_BAR_LEVEL_HEIGHT } from '../types';

import { MegaMenuNew, MENU_WIDTH } from './MegaMenuNew';

export interface Props {
  searchBarHidden?: boolean;
  onClose: () => void;
  onPinned?: () => void;
}

export function MegaMenuOverlay({ searchBarHidden, onClose, onPinned }: Props) {
  const theme = useTheme2();
  const styles = getStyles(theme, searchBarHidden);
  const animationSpeed = theme.transitions.duration.shortest;
  const animStyles = getAnimStyles(theme, animationSpeed);
  const { chrome } = useGrafana();
  const state = chrome.useState();
  const ref = useRef(null);
  const backdropRef = useRef(null);
  const { dialogProps } = useDialog({}, ref);
  const [isOpen, setIsOpen] = useState(false);

  const onMenuClose = () => setIsOpen(false);

  const { overlayProps, underlayProps } = useOverlay(
    {
      isDismissable: true,
      isOpen: true,
      onClose: onMenuClose,
    },
    ref
  );

  const onPinnedInternal = () => {
    onMenuClose();
    onPinned!();
  };

  useEffect(() => {
    if (state.megaMenuOpen) {
      setIsOpen(true);
    }
  }, [state.megaMenuOpen]);

  return (
    <div className={styles.menuWrapper}>
      <OverlayContainer>
        <CSSTransition
          nodeRef={ref}
          in={isOpen}
          unmountOnExit={true}
          classNames={animStyles.overlay}
          timeout={{ enter: animationSpeed, exit: 0 }}
          onExited={onClose}
        >
          <FocusScope contain autoFocus>
            <div data-testid="navbarmenu" ref={ref} {...overlayProps} {...dialogProps} className={styles.container}>
              <div className={styles.mobileHeader}>
                <Icon name="bars" size="xl" />
                <IconButton
                  aria-label="Close navigation menu"
                  name="times"
                  onClick={onMenuClose}
                  size="xl"
                  variant="secondary"
                />
              </div>
              <div className={styles.content}>
                <MegaMenuNew onClose={onMenuClose} onPinned={onPinnedInternal} />
              </div>
            </div>
          </FocusScope>
        </CSSTransition>
        <CSSTransition
          nodeRef={backdropRef}
          in={isOpen}
          unmountOnExit={true}
          classNames={animStyles.backdrop}
          timeout={{ enter: animationSpeed, exit: 0 }}
        >
          <div ref={backdropRef} className={styles.backdrop} {...underlayProps} />
        </CSSTransition>
      </OverlayContainer>
    </div>
  );
}

MegaMenuOverlay.displayName = 'NavBarMenu';

const getStyles = (theme: GrafanaTheme2, searchBarHidden?: boolean) => {
  const topPosition = TOP_BAR_LEVEL_HEIGHT;

  return {
    menuWrapper: css({
      position: 'fixed',
      display: 'grid',
      gridAutoFlow: 'column',
      height: '100%',
      zIndex: theme.zIndex.sidemenu,
    }),
    backdrop: css({
      backdropFilter: 'blur(1px)',
      backgroundColor: theme.components.overlay.background,
      bottom: 0,
      left: 0,
      position: 'fixed',
      right: 0,
      top: TOP_BAR_LEVEL_HEIGHT,
      zIndex: theme.zIndex.modalBackdrop,

      [theme.breakpoints.up('md')]: {
        top: topPosition,
      },
    }),
    container: css({
      display: 'flex',
      bottom: 0,
      flexDirection: 'column',
      left: 0,
      marginRight: theme.spacing(1.5),
      right: 0,
      // Needs to below navbar should we change the navbarFixed? add add a new level?
      zIndex: theme.zIndex.modal,
      position: 'fixed',
      top: TOP_BAR_LEVEL_HEIGHT,
      backgroundColor: theme.colors.background.primary,
      boxSizing: 'content-box',
      flex: '1 1 0',

      [theme.breakpoints.up('md')]: {
        right: 'unset',
        top: topPosition,
      },
    }),
    content: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      minHeight: 0,
    }),
    mobileHeader: css({
      display: 'flex',
      justifyContent: 'space-between',
      padding: theme.spacing(1, 1, 1, 2),
      borderBottom: `1px solid ${theme.colors.border.weak}`,

      [theme.breakpoints.up('md')]: {
        display: 'none',
      },
    }),
    itemList: css({
      display: 'grid',
      gridAutoRows: `minmax(${theme.spacing(6)}, auto)`,
      gridTemplateColumns: `minmax(${MENU_WIDTH}, auto)`,
      minWidth: MENU_WIDTH,
    }),
  };
};

const getAnimStyles = (theme: GrafanaTheme2, animationDuration: number) => {
  const commonTransition = {
    transitionDuration: `${animationDuration}ms`,
    transitionTimingFunction: theme.transitions.easing.easeInOut,
    [theme.breakpoints.down('md')]: {
      overflow: 'hidden',
    },
  };

  const overlayTransition = {
    ...commonTransition,
    transitionProperty: 'box-shadow, width',
    // this is needed to prevent a horizontal scrollbar during the animation on firefox
    '.scrollbar-view': {
      overflow: 'hidden !important',
    },
  };

  const backdropTransition = {
    ...commonTransition,
    transitionProperty: 'opacity',
  };

  const overlayOpen = {
    width: '100%',
    [theme.breakpoints.up('md')]: {
      boxShadow: theme.shadows.z3,
      width: MENU_WIDTH,
    },
  };

  const overlayClosed = {
    boxShadow: 'none',
    width: 0,
  };

  const backdropOpen = {
    opacity: 1,
  };

  const backdropClosed = {
    opacity: 0,
  };

  return {
    backdrop: {
      enter: css(backdropClosed),
      enterActive: css(backdropTransition, backdropOpen),
      enterDone: css(backdropOpen),
    },
    overlay: {
      enter: css(overlayClosed),
      enterActive: css(overlayTransition, overlayOpen),
      enterDone: css(overlayOpen),
    },
  };
};
