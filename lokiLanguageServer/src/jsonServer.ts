import { readFile } from 'fs';
import requestLight from 'request-light';
import { getLanguageService, LanguageService, JSONDocument } from 'vscode-json-languageservice';
import { TextDocumentPositionParams, TextDocumentSyncKind } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionList, CompletionItem } from 'vscode-languageserver-types';
import { _Connection, TextDocuments } from 'vscode-languageserver/lib/node/main.js';
import URI from 'vscode-uri';

export class JsonServer {
  protected workspaceRoot: URI.URI | undefined;

  protected readonly documents = new TextDocuments(TextDocument);

  protected readonly jsonService: LanguageService = getLanguageService({
    schemaRequestService: this.resolveSchema.bind(this),
  });

  protected readonly pendingValidationRequests = new Map<string, NodeJS.Timeout>();

  constructor(protected readonly connection: _Connection) {
    this.documents.listen(this.connection);

    this.connection.onInitialize((params) => {
      if (params.rootPath) {
        this.workspaceRoot = URI.URI.file(params.rootPath);
      } else if (params.rootUri) {
        this.workspaceRoot = URI.URI.parse(params.rootUri);
      }

      return {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          codeActionProvider: true,
          completionProvider: {
            resolveProvider: true,
            triggerCharacters: ['"', ':'],
          },
          hoverProvider: true,
          documentSymbolProvider: true,
          documentRangeFormattingProvider: true,
          executeCommandProvider: {
            commands: ['json.documentUpper'],
          },
          colorProvider: true,
          foldingRangeProvider: true,
        },
      };
    });

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
    return this.jsonService.doResolve(item);
  }

  protected completion(params: TextDocumentPositionParams): Thenable<CompletionList | null> {
    const document = this.documents.get(params.textDocument.uri);

    if (!document) {
      return Promise.resolve(null);
    }

    const jsonDocument = this.getJSONDocument(document);

    return this.jsonService.doComplete(document, params.position, jsonDocument);
  }

  protected getJSONDocument(document: TextDocument): JSONDocument {
    return this.jsonService.parseJSONDocument(document);
  }
}
