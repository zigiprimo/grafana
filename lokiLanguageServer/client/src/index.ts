import { ExtensionContext, window, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/lib/node/main';
import { URI } from 'vscode-uri';
import WebSocket from 'ws';

import { createLanguageClient } from './languageClient';
import { FaroProvider } from './provider';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const provider = new FaroProvider(
    context.extensionUri,
    window.activeTextEditor?.document.fileName ?? null,
    window.activeTextEditor?.selection.active.line ?? null
  );

  window.onDidChangeTextEditorSelection((evt) => {
    provider.setFilePathAndLine(evt.textEditor.document.fileName, evt.textEditor.selection.active.line);
  });

  const webSocket = new WebSocket('ws://localhost:3001/lokiLanguageServer');

  webSocket.onopen = () => {
    client = createLanguageClient(webSocket);

    provider.setClient(client);
  };

  context.subscriptions.push(window.registerWebviewViewProvider(FaroProvider.viewType, provider));
}

export function deactivate() {
  return client?.stop();
}
