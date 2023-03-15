import { readFile } from 'fs';
import requestLight from 'request-light';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionList, CompletionItem } from 'vscode-languageserver-types';
import { _Connection, Diagnostic, TextDocuments } from 'vscode-languageserver/lib/node/main.js';
import URI from 'vscode-uri';

import { getLanguageService, LanguageService } from './languageService.js';

export class LogQLServer {
  protected workspaceRoot: URI.URI | undefined;

  protected readonly documents = new TextDocuments(TextDocument);

  protected readonly logqlService: LanguageService = getLanguageService();

  protected readonly pendingValidationRequests = new Map<string, NodeJS.Timeout>();

  constructor(protected readonly connection: _Connection) {
    this.documents.listen(this.connection);

    this.documents.onDidChangeContent((change) => this.validate(change.document));

    this.connection.onCompletion((params) => this.completion(params));
    this.connection.onCompletionResolve((item) => this.resolveCompletion(item));
  }

  start() {
    this.connection.listen();
  }

  protected async resolveSchema(url: string): Promise<string> {
    const uri = URI.URI.parse(url);

    if (uri.scheme === 'file') {
      return new Promise<string>((resolve, reject) => {
        readFile(uri.fsPath, { encoding: 'utf8' }, (err, result) => {
          err ? reject(err) : resolve(result.toString());
        });
      });
    }

    try {
      const response = await requestLight.xhr({ url, followRedirects: 5 });

      return response.responseText;
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;

      return Promise.reject(
        err.responseText || requestLight.getErrorStatusDescription(err.status as number) || err.toString()
      );
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
