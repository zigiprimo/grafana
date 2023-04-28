import React, { AnchorHTMLAttributes, forwardRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { GrafanaTheme2, locationUtil, textUtil } from '@grafana/data';

export interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Override the default weight for the used variant */
  weight?: 'regular' | 'medium';

  /**
   * Defaults to link color
   */
  color?: keyof GrafanaTheme2['colors']['text'];
}

/**
 * @alpha
 */
export const Link = forwardRef<HTMLAnchorElement, Props>(({ href, color, weight, children, ...rest }, ref) => {
  const validUrl = locationUtil.stripBaseFromUrl(textUtil.sanitizeUrl(href ?? ''));

  return (
    <RouterLink ref={ref} to={validUrl} {...rest}>
      {children}
    </RouterLink>
  );
});

Link.displayName = 'Link';
