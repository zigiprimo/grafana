import { ExtensionContext, window, workspace } from 'vscode';
import {
  CloseAction,
  ErrorAction,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/lib/node/main';
import { URI } from 'vscode-uri';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import WebSocket from 'ws';

import { FaroProvider } from './provider';

let client: LanguageClient;

function createLanguageClient(webSocket: WebSocket) {
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

  reader.onClose(() => client?.stop());
}

export function activate(context: ExtensionContext) {
  const provider = new FaroProvider(context.extensionUri);

  const setNewFilePath = (filePath: string | null) => {
    provider.filePath = filePath;

    const workspaceFolder = workspace.getWorkspaceFolder(URI.file(filePath ?? ''));

    provider.filePath = !workspaceFolder
      ? null
      : filePath === null
      ? null
      : filePath.replace(workspaceFolder?.uri.fsPath, '').replace('/src', '');
  };

  const setNewLine = (line: number | null) => {
    provider.lineNumber = typeof line === 'number' ? line + 1 : null;
  };

  setNewLine(window.activeTextEditor?.selection.active.line ?? null);
  setNewFilePath(window.activeTextEditor?.document.fileName ?? null);
  provider.reload();

  const webSocket = new WebSocket('ws://localhost:3001/lokiLanguageServer');

  webSocket.onopen = () => {
    createLanguageClient(webSocket);

    setNewLine(window.activeTextEditor?.selection.active.line ?? null);

    provider.client = client;

    client.start();

    window.onDidChangeTextEditorSelection((evt) => {
      setNewFilePath(evt.textEditor.document.fileName);
      setNewLine(evt.textEditor.selection.active.line);

      client.sendRequest('get-new-logs', {
        filePath: provider.filePath,
        mode: provider.mode,
      });
    });

    client.onRequest('receive-new-logs', (data) => {
      provider.logs = data;

      provider.reload();
    });
  };

  context.subscriptions.push(window.registerWebviewViewProvider(FaroProvider.viewType, provider));
}

export function deactivate() {
  return client?.stop();
}
