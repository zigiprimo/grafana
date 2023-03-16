import { readFile } from 'fs';
import fetch from 'node-fetch';
import requestLight from 'request-light';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionList, CompletionItem } from 'vscode-languageserver-types';
import { _Connection, Diagnostic, TextDocuments, TextDocumentSyncKind } from 'vscode-languageserver/lib/node/main';
import { URI } from 'vscode-uri';

import { getLanguageService, LanguageService } from './languageService.js';

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
      if (method === 'get-new-logs') {
        this.getNewLogs((params ?? null) as { fileName: string; line: number; column: number });
      }
    });

    this.documents.onDidChangeContent((change) => this.validate(change.document));

    this.connection.onCompletion((params) => this.completion(params));
    this.connection.onCompletionResolve((item) => this.resolveCompletion(item));
  }

  start() {
    this.connection.listen();
  }

  protected async getNewLogs(params: { fileName: string; line: number; column: number } | null) {
    let entries: string[] | null = null;

    if (params) {
      try {
        const to = new Date();
        const toString = to.toISOString();
        const toTs = to.getTime();
        const from = new Date(toTs - 1000 * 60 * 60 * 6);
        const fromString = from.toISOString();
        const fromTs = from.getTime();

        const res = await fetch('http://localhost:3000/api/ds/query', {
          headers: {
            accept: 'application/json, text/plain, */*',
            cookie: 'grafana_session=9d4bd493ac96997f121fbedf10ae677a',
            'content-type': 'application/json',
            'x-datasource-uid': 'Loki',
            'x-grafana-org-id': '1',
            'x-panel-id': 'Q-ae013846-f4f0-4218-aeec-7abacc329e9d-0',
            'x-plugin-id': 'loki',
          },
          referrer: 'http://localhost:3000/',
          referrerPolicy: 'strict-origin-when-cross-origin',
          body: JSON.stringify({
            queries: [
              {
                refId: 'A',
                datasource: {
                  type: 'loki',
                  uid: 'Loki',
                },
                editorMode: 'code',
                expr: `{app="auth-app-production", kind="exception"} |= \`${params.fileName}:${params.line}\``,
                queryType: 'range',
                key: 'Q-ae013846-f4f0-4218-aeec-7abacc329e9d-0',
                maxLines: 1000,
                legendFormat: '',
                datasourceId: 1,
                intervalMs: 10000,
                maxDataPoints: 1991,
              },
            ],
            range: {
              from: fromString,
              to: toString,
              raw: {
                from: 'now-1h',
                to: 'now',
              },
            },
            from: fromTs.toString(),
            to: toTs.toString(),
          }),
          method: 'POST',
        });

        const body = (await res.json()) as any;

        entries = body?.results?.A?.frames?.[0]?.data?.values?.[2] ?? null;
      } catch (err) {
        console.error(err);
      }
    }

    this.connection.sendRequest('receive-new-logs', entries);
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
