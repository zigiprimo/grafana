import { css, cx } from '@emotion/css';
import { useKBar, VisualState } from 'kbar';
import React, { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { getInputStyles, Icon, ToolbarButton, useStyles2, useTheme2 } from '@grafana/ui';
import { focusCss } from '@grafana/ui/src/themes/mixins';
import { useMediaQueryChange } from 'app/core/hooks/useMediaQueryChange';
import { t } from 'app/core/internationalization';

export function TopSearchBarCommandPaletteTrigger() {
  const theme = useTheme2();
  const { query: kbar } = useKBar((kbarState) => ({
    kbarSearchQuery: kbarState.searchQuery,
    kbarIsOpen: kbarState.visualState === VisualState.showing,
  }));

  const breakpoint = theme.breakpoints.values.sm;

  const [isSmallScreen, setIsSmallScreen] = useState(!window.matchMedia(`(min-width: ${breakpoint}px)`).matches);

  useMediaQueryChange({
    breakpoint,
    onChange: (e) => {
      setIsSmallScreen(!e.matches);
    },
  });

  const onOpenSearch = () => {
    kbar.toggle();
  };

  if (isSmallScreen) {
    return (
      <ToolbarButton
        iconOnly
        icon="search"
        aria-label={t('nav.search.placeholderCommandPalette', 'Search or jump to...')}
        onClick={onOpenSearch}
      />
    );
  }

  return <PretendTextInput onClick={onOpenSearch} />;
}

interface PretendTextInputProps {
  onClick: () => void;
}

function PretendTextInput({ onClick }: PretendTextInputProps) {
  const styles = useStyles2(getStyles);
  //const modKey = useMemo(() => getModKey(), []);

  // We want the desktop command palette trigger to look like a search box,
  // but it actually behaves like a button - you active it and it performs an
  // action. You don't actually type into it.

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputWrapper}>
        <div className={styles.prefix}>
          <Icon name="search" size="sm" />
        </div>

        <button className={styles.fakeInput} onClick={onClick}>
          Search...
        </button>

        {/* <div className={styles.suffix}>
          <Icon name="keyboard" />
          <span className={styles.shortcut}>{modKey}+k</span>
        </div> */}
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  const baseStyles = getInputStyles({ theme });

  return {
    wrapper: cx(
      baseStyles.wrapper,
      css({
        height: 26,
        width: 'auto',
        flexGrow: 1,
        fontSize: theme.typography.bodySmall.fontSize,
      })
    ),
    inputWrapper: cx(
      baseStyles.inputWrapper,
      css({
        width: 'auto',
        display: 'flex',
      })
    ),
    prefix: cx(
      baseStyles.prefix,
      css({
        padding: 0,
      })
    ),
    suffix: css([
      baseStyles.suffix,
      {
        display: 'flex',
        gap: theme.spacing(0.5),
      },
    ]),
    shortcut: css({
      fontSize: theme.typography.bodySmall.fontSize,
    }),
    fakeInput: css([
      baseStyles.input,
      {
        width: 'auto',
        textAlign: 'left',
        paddingLeft: 28,
        color: theme.colors.text.disabled,

        // We want the focus styles to appear only when tabbing through, not when clicking the button
        // (and when focus is restored after command palette closes)
        '&:focus': {
          outline: 'unset',
          boxShadow: 'unset',
        },

        '&:focus-visible': css`
          ${focusCss(theme)}
        `,
      },
    ]),

    button: css({
      // height: 32,
      width: '100%',
      textAlign: 'center',

      '> *': {
        width: '100%',
        textAlign: 'center',
        justifyContent: 'center',
        gap: '1ch',
      },
    }),
  };
};
