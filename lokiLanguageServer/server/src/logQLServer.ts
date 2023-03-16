import { readFile } from 'fs';
import fetch from 'node-fetch';
import requestLight from 'request-light';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionList, CompletionItem } from 'vscode-languageserver-types';
import { _Connection, Diagnostic, TextDocuments, TextDocumentSyncKind } from 'vscode-languageserver/lib/node/main';
import { URI } from 'vscode-uri';

import { getLogs, getEvents, getExceptionsForFile } from './completion/fetch';
import { getLanguageService, LanguageService } from './languageService';

export class LogQLServer {
  protected workspaceRoot: URI | undefined;

  protected readonly documents = new TextDocuments(TextDocument);

  protected readonly logqlService: LanguageService = getLanguageService();

  protected readonly pendingValidationRequests = new Map<string, NodeJS.Timeout>();

  constructor(protected readonly connection: _Connection) {
    this.documents.listen(this.connection);

    this.connection.onInitialize((params) => {
      if (params.rootPath) {
        this.workspaceRoot = URI.file(params.rootPath);
      } else if (params.rootUri) {
        this.workspaceRoot = URI.parse(params.rootUri);
      }

      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          completionProvider: {
            resolveProvider: true,
            triggerCharacters: ['"', ':'],
          },
        },
      };
    });

    this.connection.onRequest((method, params, token) => {
      if ((params as Record<string, any>)?.mode) {
        switch (method) {
          case 'get-new-logs':
            this.getNewLogs({
              filePath: (params as Record<string, any>).filePath ?? null,
              mode: (params as Record<string, any>).mode,
              lokiDatasourceId: (params as Record<string, any>).lokiDatasourceId ?? null,
              grafanaApiKey: (params as Record<string, any>).grafanaApiKey ?? null,
              appName: (params as Record<string, any>).appName ?? null,
            } as {
              filePath: string;
              mode: 'exceptions' | 'events' | 'logs';
              lokiDatasourceId: string;
              grafanaApiKey: string;
              appName: string;
            });
            break;
        }
      }
    });

    this.documents.onDidChangeContent((change) => this.validate(change.document));
    this.connection.onCompletion((params) => this.completion(params));
    this.connection.onCompletionResolve((item) => this.resolveCompletion(item));
  }

  start() {
    this.connection.listen();
  }

  protected async getNewLogs(params: {
    filePath: string | null;
    mode: 'exceptions' | 'events' | 'logs';
    lokiDatasourceId: string;
    grafanaApiKey: string;
    appName: string;
  }) {
    let entries: string[] | null = null;

    try {
      switch (params.mode) {
        case 'exceptions':
          if (params.filePath !== null) {
            entries =
              (await getExceptionsForFile(
                params.filePath,
                params.lokiDatasourceId,
                params.grafanaApiKey,
                params.appName
              )) ?? null;
          }
          break;

        case 'events':
          entries = (await getEvents(params.lokiDatasourceId, params.grafanaApiKey, params.appName)) ?? null;
          break;

        case 'logs':
          entries = (await getLogs(params.lokiDatasourceId, params.grafanaApiKey, params.appName)) ?? null;
          break;
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.connection.sendRequest('receive-new-logs', entries);
    }
  }

  protected resolveCompletion(item: CompletionItem): Thenable<CompletionItem> {
    return this.logqlService.doResolve(item);
  }

  protected completion(params: TextDocumentPositionParams): Thenable<CompletionList | null> {
    const document = this.documents.get(params.textDocument.uri);

    if (!document) {
      return Promise.resolve(null);
    }

    return this.logqlService.doComplete(document, params.position);
  }

  protected validate(document: TextDocument): void {
    if (document.getText().length === 0) {
      return;
    }

    this.logqlService.doValidation(document).then((diagnostics) => this.sendDiagnostics(document, diagnostics));
  }

  protected cleanDiagnostics(document: TextDocument): void {
    this.sendDiagnostics(document, []);
  }

  protected sendDiagnostics(document: TextDocument, diagnostics: Diagnostic[]): void {
    this.connection.sendDiagnostics({
      uri: document.uri,
      diagnostics,
    });
  }
}
