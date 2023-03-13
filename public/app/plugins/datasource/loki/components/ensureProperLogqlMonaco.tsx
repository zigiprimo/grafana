import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickInput/standaloneQuickInputService.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js';

import { buildWorkerDefinition } from 'monaco-editor-workers';
import { MonacoLanguageClient, MonacoServices } from 'monaco-languageclient';
import { CloseAction, ErrorAction } from 'vscode-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import getDialogServiceOverride from 'vscode/service-override/dialogs';
import { StandaloneServices } from 'vscode/services';

buildWorkerDefinition('./workers/', '/public/img/', false);

StandaloneServices.initialize(getDialogServiceOverride());

function createWebSocket(url: string) {
  const webSocket = new WebSocket(url);

  webSocket.onopen = () => {
    const socket = toSocket(webSocket);
    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);

    const languageClient = new MonacoLanguageClient({
      name: 'LogQL Language Client',
      clientOptions: {
        documentSelector: ['logql'],
        errorHandler: {
          error: () => ({ action: ErrorAction.Continue }),
          closed: () => ({ action: CloseAction.DoNotRestart }),
        },
      },
      connectionProvider: {
        get: () => {
          return Promise.resolve({
            reader,
            writer,
          });
        },
      },
    });

    languageClient.start();

    reader.onClose(() => languageClient.stop());
  };

  return webSocket;
}

MonacoServices.install();

const lspWebSocket = createWebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://localhost:3001/sampleServer`);

window.onbeforeunload = () => {
  lspWebSocket?.close();
};
