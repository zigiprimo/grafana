import { workspace } from 'vscode';
import { CloseAction, ErrorAction, LanguageClient } from 'vscode-languageclient/lib/node/main';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import WebSocket from 'ws';

export function createLanguageClient(webSocket: WebSocket): LanguageClient {
  const socket = toSocket(webSocket);
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);

  const client = new LanguageClient(
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

  reader.onClose(() => client?.stop());

  client.start();

  return client;
}
