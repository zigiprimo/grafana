import { ExtensionContext, window, workspace } from 'vscode';
import {
  CloseAction,
  ErrorAction,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/lib/node/main';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import WebSocket from 'ws';

import { FaroProvider } from './provider';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const provider = new FaroProvider(context.extensionUri);

  window.onDidChangeTextEditorSelection((evt) => {
    let fileName: string | null = null;
    let line: number | null = null;
    let column: number | null = null;

    if (evt.selections.length === 1) {
      const selection = evt.selections[0];
      fileName = evt.textEditor.document.fileName.split('/').pop() ?? null;
      line = selection.active.line + 1;
      column = selection.active.character + 1;
    }

    client.sendRequest('get-new-logs', {
      fileName,
      line,
      column,
    });
  });

  const webSocket = new WebSocket('ws://localhost:3001/lokiLanguageServer');

  webSocket.onopen = () => {
    const socket = toSocket(webSocket);
    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);

    client = new LanguageClient(
      'logqlLanguageServer',
      'LogQL',
      () =>
        Promise.resolve({
          reader,
          writer,
        }),
      {
        documentSelector: [{ language: '*' }],
        errorHandler: {
          error: () => ({ action: ErrorAction.Continue }),
          closed: () => ({ action: CloseAction.DoNotRestart }),
        },
        synchronize: {
          fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
        },
      },
      true
    );

    client.start();

    client.onRequest('receive-new-logs', (data) => {
      provider.reload(data);
    });

    reader.onClose(() => client?.stop());
  };

  context.subscriptions.push(window.registerWebviewViewProvider(FaroProvider.viewType, provider));
}

export function deactivate() {
  return client?.stop();
}
