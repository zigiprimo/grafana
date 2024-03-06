import { css, cx } from '@emotion/css';
import React, { useEffect, useRef } from 'react';

import { config } from '@grafana/runtime';
import { CustomScrollbar, useStyles2 } from '@grafana/ui';

type FlaggedScrollerProps = Parameters<typeof CustomScrollbar>[0];

export default function FlaggedScrollbar(props: FlaggedScrollerProps) {
  if (config.featureToggles.betterPageScrolling) {
    return <NativeScrollbar {...props}>{props.children}</NativeScrollbar>;
  }

  return <CustomScrollbar {...props} />;
}

// Shim to provide API-compatibility for Page's scroll-related props
function NativeScrollbar({ children, scrollRefCallback, scrollTop }: FlaggedScrollerProps) {
  const styles = useStyles2(getStyles);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && scrollRefCallback) {
      console.warn('TODO: the body element now scrolls instead');
      scrollRefCallback(ref.current);
    }
  }, [ref, scrollRefCallback]);

  useEffect(() => {
    if (ref.current && scrollTop != null) {
      console.warn('TODO: the body element now scrolls instead');
      ref.current?.scrollTo(0, scrollTop);
    }
  }, [scrollTop]);

  return (
    <div ref={ref} className={cx(styles.nativeScrollbars, 'scrollbar-view')}>
      {children}
    </div>
  );
}

function getStyles() {
  return {
    nativeScrollbars: css({
      label: 'native-scroll-container',
    }),
  };
}
