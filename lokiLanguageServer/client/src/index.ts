import { ExtensionContext, window, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/lib/node/main';
import { URI } from 'vscode-uri';
import WebSocket from 'ws';

import { createLanguageClient } from './languageClient';
import { FaroProvider } from './provider';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const configuration = workspace.getConfiguration('grafana');
  const websocketUrl = configuration.get<string>('faro.websocketUrl') ?? '';
  const lokiDatasourceId = configuration.get<string>('faro.lokiDatasourceId') ?? '';
  const grafanaApiKey = configuration.get<string>('faro.grafanaApiKey') ?? '';
  const appName = configuration.get<string>('faro.appName') ?? '';
  const projectRoot = configuration.get<string>('faro.projectRoot') ?? '';

  const provider = new FaroProvider(
    context.extensionUri,
    window.activeTextEditor?.document.fileName ?? null,
    window.activeTextEditor?.selection.active.line ?? null,
    websocketUrl,
    lokiDatasourceId,
    grafanaApiKey,
    appName,
    projectRoot
  );

  if (websocketUrl && lokiDatasourceId && grafanaApiKey && appName) {
    window.onDidChangeTextEditorSelection((evt) => {
      provider.setFilePathAndLine(evt.textEditor.document.fileName, evt.textEditor.selection.active.line);
    });

    const webSocket = new WebSocket(websocketUrl);

    webSocket.onopen = () => {
      client = createLanguageClient(webSocket);

      provider.setClient(client);
    };
  }

  context.subscriptions.push(window.registerWebviewViewProvider(FaroProvider.viewType, provider));
}

export function deactivate() {
  return client?.stop();
}
