import appEvents from 'app/core/app_events';

import {
  ExportPanelPayload,
  PanelExportEvent,
} from '../../types/events';

export class PanelExporterService {
  init() {
    appEvents.subscribe(PanelExportEvent, (e) => this.exportPNG(e.payload));
  }

  exportPNG(e: ExportPanelPayload) {
    console.log('exportPNG', e);
    //todo avoid as
    const canvas =  e.htmlElement as HTMLCanvasElement;

    //TODO FIX
    const link = document.createElement('a');
    link.download = 'asdasd.png';
    canvas.toBlob((blob) => {
      link.href = URL.createObjectURL(blob!);
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'image/png');
  }
}
