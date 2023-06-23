import { css, cx } from '@emotion/css';
import { useDialog } from '@react-aria/dialog';
import { FocusScope } from '@react-aria/focus';
import { useOverlay } from '@react-aria/overlays';
import React, { forwardRef, HTMLAttributes, useState, createRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';

import { useTheme2 } from '../../themes';
import { getPortalContainer } from '../Portal/Portal';

import { ToolbarButton } from './ToolbarButton';
import { useContainerOverflow } from './useContainerOverflow';
export interface Props extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  /** Determine flex-alignment of child buttons. Needed for overflow behaviour. */
  alignment?: 'left' | 'right';
}

export const ToolbarButtonRow = forwardRef<HTMLDivElement, Props>(
  ({ alignment = 'left', className, children, ...rest }, ref) => {
    const [showOverflowItems, setShowOverflowItems] = useState(false);
    const { containerProps, visibleChildren, overflowProps, overflowingChildren } = useContainerOverflow(children);
    const overflowItemsRef = createRef<HTMLDivElement>();
    const { overlayProps } = useOverlay(
      {
        onClose: () => setShowOverflowItems(false),
        isDismissable: true,
        isOpen: showOverflowItems,
        shouldCloseOnInteractOutside: (element: Element) => {
          const portalContainer = getPortalContainer();
          return !overflowProps.ref.current?.contains(element) && !portalContainer.contains(element);
        },
      },
      overflowItemsRef
    );
    const { dialogProps } = useDialog({}, overflowItemsRef);
    const theme = useTheme2();
    const styles = getStyles(theme, alignment);

    return (
      <div className={styles.wrapper}>
        <div className={cx(styles.container, className)} {...rest} {...containerProps}>
          {visibleChildren}
          {overflowingChildren.length > 0 && (
            <div className={styles.overflowButton} {...overflowProps}>
              <ToolbarButton
                variant={showOverflowItems ? 'active' : 'default'}
                tooltip="Show more items"
                onClick={() => setShowOverflowItems(!showOverflowItems)}
                icon="ellipsis-v"
                iconOnly
                narrow
              />
              {showOverflowItems && (
                <FocusScope contain autoFocus>
                  <div className={styles.overflowItems} ref={overflowItemsRef} {...overlayProps} {...dialogProps}>
                    {overflowingChildren}
                  </div>
                </FocusScope>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ToolbarButtonRow.displayName = 'ToolbarButtonRow';

const getStyles = (theme: GrafanaTheme2, alignment: Props['alignment']) => ({
  wrapper: css({
    display: 'flex',
    justifyContent: alignment === 'left' ? 'flex-start' : 'flex-end',
  }),
  overflowButton: css({
    position: 'relative',
  }),
  overflowItems: css`
    align-items: center;
    background-color: ${theme.colors.background.primary};
    border-radius: ${theme.shape.borderRadius()};
    box-shadow: ${theme.shadows.z3};
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing(1)};
    margin-top: ${theme.spacing(1)};
    max-width: 80vw;
    padding: ${theme.spacing(0.5, 1)};
    position: absolute;
    right: 0;
    top: 100%;
    width: max-content;
    z-index: ${theme.zIndex.sidemenu};
  `,
  container: css`
    align-items: center;
    display: flex;
    gap: ${theme.spacing(1)};
  `,
  childWrapper: css`
    align-items: center;
    display: flex;
    gap: ${theme.spacing(1)};
  `,
});
