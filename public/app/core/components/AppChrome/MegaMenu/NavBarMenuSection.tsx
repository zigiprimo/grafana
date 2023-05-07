import { css, cx } from '@emotion/css';
import React from 'react';
import { useLocalStorage } from 'react-use';

import { GrafanaTheme2, NavModelItem } from '@grafana/data';
import { Button, Icon, useStyles2 } from '@grafana/ui';

import { NavBarItemIcon } from './NavBarItemIcon';
import { NavBarMenuItem } from './NavBarMenuItem';
import { NavFeatureHighlight } from './NavFeatureHighlight';
import { hasChildMatch } from './utils';

export function NavBarMenuSection({
  link,
  activeItem,
  className,
  onClose,
  depth = 0,
}: {
  link: NavModelItem;
  activeItem?: NavModelItem;
  className?: string;
  onClose?: () => void;
  depth?: number;
}) {
  const styles = useStyles2(getStyles);
  const FeatureHighlightWrapper = link.highlightText ? NavFeatureHighlight : React.Fragment;
  const isActive = link === activeItem;
  const hasActiveChild = hasChildMatch(link, activeItem);
  const [sectionExpanded, setSectionExpanded] =
    useLocalStorage(`grafana.navigation.expanded[${link.text}]`, false) ?? Boolean(hasActiveChild);

  return (
    <>
      <div className={cx(styles.collapsibleSectionWrapper, className)}>
        <NavBarMenuItem
          isActive={link === activeItem}
          onClick={() => {
            link.onClick?.();
            onClose?.();
          }}
          target={link.target}
          url={link.url}
        >
          <div
            className={cx(styles.labelWrapper, {
              [styles.isActive]: isActive,
              [styles.hasActiveChild]: hasActiveChild,
            })}
          >
            {depth < 2 && (
              <FeatureHighlightWrapper>
                <NavBarItemIcon link={link} />
              </FeatureHighlightWrapper>
            )}
            {link.text}
          </div>
        </NavBarMenuItem>
        {linkHasChildren(link) && (
          <Button
            aria-label={`${sectionExpanded ? 'Collapse' : 'Expand'} section`}
            variant="secondary"
            fill="text"
            className={styles.collapseButton}
            onClick={() => setSectionExpanded(!sectionExpanded)}
          >
            <Icon name={sectionExpanded ? 'angle-up' : 'angle-down'} size="md" />
          </Button>
        )}
      </div>
      {sectionExpanded && linkHasChildren(link) && (
        <ul className={cx(styles.children, depth > 0 && styles.deepChildren)}>
          {link.children!.map((childLink) => {
            return (
              !childLink.isCreateAction && (
                <NavBarMenuSection
                  key={`${link.text}-${childLink.text}`}
                  activeItem={activeItem}
                  link={childLink}
                  onClose={onClose}
                  depth={depth + 1}
                />
              )
            );
          })}
        </ul>
      )}
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  collapsibleSectionWrapper: css({
    alignItems: 'center',
    display: 'flex',
  }),
  collapseButton: css({
    color: theme.colors.text.disabled,
    padding: theme.spacing(0, 0.5),
    marginRight: theme.spacing(1),
  }),
  collapseWrapperActive: css({
    backgroundColor: theme.colors.action.disabledBackground,
  }),
  collapseContent: css({
    padding: 0,
  }),
  labelWrapper: css({
    display: 'flex',
    gap: theme.spacing(1),
    fontSize: theme.typography.pxToRem(14),
    fontWeight: theme.typography.fontWeightMedium,
    alignItems: 'center',
  }),
  isActive: css({
    color: theme.colors.text.primary,
  }),
  hasActiveChild: css({
    color: theme.colors.text.primary,
  }),
  children: css({
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: theme.spacing(2),
  }),
  deepChildren: css({
    paddingLeft: theme.spacing(3),
    position: 'relative',
    '&::before': {
      content: '""',
      height: '100%',
      position: 'absolute',
      width: 1,
      left: 16,
      borderLeft: `1px solid ${theme.colors.border.weak}`,
    },
  }),
});

function linkHasChildren(link: NavModelItem): link is NavModelItem & { children: NavModelItem[] } {
  return Boolean(link.children && link.children.length > 0);
}
