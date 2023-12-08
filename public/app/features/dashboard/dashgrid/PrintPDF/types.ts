export enum Layout {
  Grid = 'grid',
  Simple = 'simple',
}

export enum Orientation {
  Portrait = 'portrait',
  Landscape = 'landscape',
}

export enum Mode {
  Preview = 'preview',
  Print = 'print',
}

export interface PrintOptions {
  layout?: Layout;
  orientation?: Orientation;
  mode?: Mode;
  scaleFactor?: number;
  pageBreaks?: boolean;
}
