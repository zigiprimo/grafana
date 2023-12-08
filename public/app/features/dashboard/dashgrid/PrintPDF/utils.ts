import { locationService } from '@grafana/runtime';

import { Layout, Mode, Orientation, PrintOptions } from './types';

export function getPrintOptions(): PrintOptions {
  const params = locationService.getSearchObject();
  return {
    orientation: params.orientation as Orientation,
    layout: params.layout as Layout,
    mode: params.mode as Mode,
    scaleFactor: params.scaleFactor as number,
    pageBreaks: params.pageBreaks as boolean,
  };
}
