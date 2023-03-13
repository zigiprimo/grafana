import { chain } from 'lodash';

import { HistoryItem } from '@grafana/data';
import type { monacoTypes } from '@grafana/ui';
import { escapeLabelValueInExactSelector } from 'app/plugins/datasource/prometheus/language_utils';

import LanguageProvider from '../../../LanguageProvider';
import { LokiDatasource } from '../../../datasource';
import { LokiQuery } from '../../../types';

import { Label } from './situation';

interface HistoryRef {
  current: Array<HistoryItem<LokiQuery>>;
}

export class CompletionDataProvider {
  private webSocket;

  webSocketId = 0;

  constructor(
    private datasource: LokiDatasource,
    private languageProvider: LanguageProvider,
    private historyRef: HistoryRef = { current: [] },
    initialValue: string
  ) {
    this.webSocket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://localhost:3001/sampleServer`);

    this.webSocket.addEventListener('open', () => {
      this.webSocket.send(
        JSON.stringify({
          id: this.webSocketId++,
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            processId: null,
            clientInfo: { name: 'Monaco', version: '1.69.0' },
            locale: 'en-GB',
            rootPath: null,
            rootUri: null,
            capabilities: {
              workspace: {
                applyEdit: true,
                workspaceEdit: {
                  documentChanges: true,
                  resourceOperations: ['create', 'rename', 'delete'],
                  failureHandling: 'textOnlyTransactional',
                  normalizesLineEndings: true,
                  changeAnnotationSupport: { groupsOnLabel: true },
                },
                codeLens: { refreshSupport: true },
                executeCommand: { dynamicRegistration: true },
                workspaceFolders: true,
                semanticTokens: { refreshSupport: true },
                inlayHint: { refreshSupport: true },
                diagnostics: { refreshSupport: true },
              },
              textDocument: {
                publishDiagnostics: {
                  relatedInformation: true,
                  versionSupport: false,
                  tagSupport: { valueSet: [1, 2] },
                  codeDescriptionSupport: true,
                  dataSupport: true,
                },
                synchronization: { dynamicRegistration: true },
                completion: {
                  dynamicRegistration: true,
                  contextSupport: true,
                  completionItem: {
                    snippetSupport: true,
                    commitCharactersSupport: true,
                    documentationFormat: ['markdown', 'plaintext'],
                    deprecatedSupport: true,
                    preselectSupport: true,
                    tagSupport: { valueSet: [1] },
                    insertReplaceSupport: true,
                    resolveSupport: { properties: ['documentation', 'detail', 'additionalTextEdits'] },
                    insertTextModeSupport: { valueSet: [1, 2] },
                    labelDetailsSupport: true,
                  },
                  insertTextMode: 2,
                  completionItemKind: {
                    valueSet: [
                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
                    ],
                  },
                  completionList: {
                    itemDefaults: ['commitCharacters', 'editRange', 'insertTextFormat', 'insertTextMode'],
                  },
                },
                hover: { dynamicRegistration: true, contentFormat: ['markdown', 'plaintext'] },
                signatureHelp: {
                  dynamicRegistration: true,
                  signatureInformation: {
                    documentationFormat: ['markdown', 'plaintext'],
                    parameterInformation: { labelOffsetSupport: true },
                    activeParameterSupport: true,
                  },
                  contextSupport: true,
                },
                definition: { dynamicRegistration: true, linkSupport: true },
                references: { dynamicRegistration: true },
                documentHighlight: { dynamicRegistration: true },
                documentSymbol: {
                  dynamicRegistration: true,
                  symbolKind: {
                    valueSet: [
                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
                    ],
                  },
                  hierarchicalDocumentSymbolSupport: true,
                  tagSupport: { valueSet: [1] },
                  labelSupport: true,
                },
                codeAction: {
                  dynamicRegistration: true,
                  isPreferredSupport: true,
                  disabledSupport: true,
                  dataSupport: true,
                  resolveSupport: { properties: ['edit'] },
                  codeActionLiteralSupport: {
                    codeActionKind: {
                      valueSet: [
                        '',
                        'quickfix',
                        'refactor',
                        'refactor.extract',
                        'refactor.inline',
                        'refactor.rewrite',
                        'source',
                        'source.organizeImports',
                      ],
                    },
                  },
                  honorsChangeAnnotations: false,
                },
                codeLens: { dynamicRegistration: true },
                formatting: { dynamicRegistration: true },
                rangeFormatting: { dynamicRegistration: true },
                onTypeFormatting: { dynamicRegistration: true },
                rename: {
                  dynamicRegistration: true,
                  prepareSupport: true,
                  prepareSupportDefaultBehavior: 1,
                  honorsChangeAnnotations: true,
                },
                documentLink: { dynamicRegistration: true, tooltipSupport: true },
                typeDefinition: { dynamicRegistration: true, linkSupport: true },
                implementation: { dynamicRegistration: true, linkSupport: true },
                colorProvider: { dynamicRegistration: true },
                foldingRange: {
                  dynamicRegistration: true,
                  rangeLimit: 5000,
                  lineFoldingOnly: true,
                  foldingRangeKind: { valueSet: ['comment', 'imports', 'region'] },
                  foldingRange: { collapsedText: false },
                },
                declaration: { dynamicRegistration: true, linkSupport: true },
                selectionRange: { dynamicRegistration: true },
                semanticTokens: {
                  dynamicRegistration: true,
                  tokenTypes: [
                    'namespace',
                    'type',
                    'class',
                    'enum',
                    'interface',
                    'struct',
                    'typeParameter',
                    'parameter',
                    'variable',
                    'property',
                    'enumMember',
                    'event',
                    'function',
                    'method',
                    'macro',
                    'keyword',
                    'modifier',
                    'comment',
                    'string',
                    'number',
                    'regexp',
                    'operator',
                    'decorator',
                  ],
                  tokenModifiers: [
                    'declaration',
                    'definition',
                    'readonly',
                    'static',
                    'deprecated',
                    'abstract',
                    'async',
                    'modification',
                    'documentation',
                    'defaultLibrary',
                  ],
                  formats: ['relative'],
                  requests: { range: true, full: { delta: true } },
                  multilineTokenSupport: false,
                  overlappingTokenSupport: false,
                  serverCancelSupport: true,
                  augmentsSyntaxTokens: true,
                },
                linkedEditingRange: { dynamicRegistration: true },
                inlayHint: {
                  dynamicRegistration: true,
                  resolveSupport: {
                    properties: ['tooltip', 'textEdits', 'label.tooltip', 'label.location', 'label.command'],
                  },
                },
                diagnostic: { dynamicRegistration: true, relatedDocumentSupport: false },
              },
              window: {
                showMessage: { messageActionItem: { additionalPropertiesSupport: true } },
                showDocument: { support: true },
              },
              general: {
                staleRequestSupport: {
                  cancel: true,
                  retryOnContentModified: [
                    'textDocument/semanticTokens/full',
                    'textDocument/semanticTokens/range',
                    'textDocument/semanticTokens/full/delta',
                  ],
                },
                regularExpressions: { engine: 'ECMAScript', version: 'ES2020' },
                markdown: { parser: 'marked', version: '1.1.0' },
                positionEncodings: ['utf-16'],
              },
            },
            trace: 'off',
            workspaceFolders: null,
          },
        })
      );

      this.webSocket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialized',
          params: {},
        })
      );

      this.webSocket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'textDocument/didOpen',
          params: {
            textDocument: {
              languageId: 'logql',
              text: initialValue,
              uri: 'inmemory://model.json',
              version: 1,
            },
          },
        })
      );
    });
  }

  private buildSelector(labels: Label[]): string {
    const allLabelTexts = labels.map(
      (label) => `${label.name}${label.op}"${escapeLabelValueInExactSelector(label.value)}"`
    );

    return `{${allLabelTexts.join(',')}}`;
  }

  getHistory() {
    return chain(this.historyRef.current)
      .map((history: HistoryItem<LokiQuery>) => history.query.expr)
      .filter()
      .uniq()
      .value();
  }

  async getLSCompletions(position: monacoTypes.Position): Promise<monacoTypes.languages.CompletionItem[]> {
    return new Promise((success, error) => {
      if (!this.webSocket || this.webSocket.readyState !== this.webSocket.OPEN) {
        return success([]);
      }

      const id = this.webSocketId++;

      const webSocket = this.webSocket;

      webSocket.addEventListener('message', function listener(event) {
        try {
          const response = JSON.parse(event.data);

          if (response.id && response.id === id) {
            success(response.result?.items ?? []);
          }

          webSocket.removeEventListener('message', listener);
        } catch (err) {}
      });

      webSocket.send(
        JSON.stringify({
          method: 'textDocument/completion',
          params: {
            textDocument: {
              uri: 'inmemory://model.json',
            },
            position: {
              character: position.column - 1,
              line: position.lineNumber - 1,
            },
            context: { triggerKind: 1 },
          },
          jsonrpc: '2.0',
          id: id,
        })
      );
    });
  }

  updateLs(evt: monacoTypes.editor.IModelContentChangedEvent) {
    this.webSocket.send(
      JSON.stringify({
        method: 'textDocument/didChange',
        params: {
          textDocument: {
            uri: 'inmemory://model.json',
            version: evt.versionId,
          },
          contentChanges: evt.changes.map((change) => ({
            text: change.text,
            rangeLength: change.rangeLength,
            range: {
              start: {
                character: change.range.startColumn - 1,
                line: change.range.startLineNumber - 1,
              },
              end: {
                character: change.range.endColumn - 1,
                line: change.range.endLineNumber - 1,
              },
            },
          })),
        },
        jsonrpc: '2.0',
      })
    );
  }

  async getLabelNames(otherLabels: Label[] = []) {
    if (otherLabels.length === 0) {
      // if there is no filtering, we have to use a special endpoint
      return this.languageProvider.getLabelKeys();
    }
    const data = await this.getSeriesLabels(otherLabels);
    const possibleLabelNames = Object.keys(data); // all names from datasource
    const usedLabelNames = new Set(otherLabels.map((l) => l.name)); // names used in the query
    return possibleLabelNames.filter((label) => !usedLabelNames.has(label));
  }

  getQueryBytes = async (expr: string): Promise<number | undefined> => {
    const query = { expr, refId: 'stats' + expr };
    const stats = await this.datasource.getQueryStats(query);
    if (stats.bytes !== undefined) {
      return stats.bytes;
    }
    return;
  };

  getStatsForLabelValues = async (
    selectedLabels: Label[] = [],
    labelName: string
  ): Promise<{ [key: string]: number }> => {
    const bytesForLabel: { [key: string]: number } = {};
    const expr = selectedLabels.map((label) => `${label.name}${label.op}"${label.value}"`).join(',');
    const labelValues = await this.getLabelValues(labelName, []);

    for (const labelValue of labelValues) {
      const newQuery = `{${expr}, ${labelName}="${labelValue}"}`;
      const bytes = await this.getQueryBytes(newQuery);
      if (bytes !== undefined) {
        bytesForLabel[labelValue] = bytes;
      }
    }
    return bytesForLabel;
  };

  getStatsForLabelNames = async (selectedLabels: Label[] = []): Promise<{ [key: string]: number }> => {
    const bytesForLabel: { [key: string]: number } = {};
    const expr = selectedLabels.map((label) => `${label.name}${label.op}"${label.value}"`).join(',');
    const labelNames = await this.getLabelNames(selectedLabels);

    for (const labelName of labelNames) {
      const newQuery = `{${expr}, ${labelName}=~".+"}`;
      const bytes = await this.getQueryBytes(newQuery);
      if (bytes !== undefined) {
        bytesForLabel[labelName] = bytes;
      }
    }
    return bytesForLabel;
  };

  async getLabelValues(labelName: string, otherLabels: Label[]) {
    if (otherLabels.length === 0) {
      // if there is no filtering, we have to use a special endpoint
      return await this.languageProvider.getLabelValues(labelName);
    }

    const data = await this.getSeriesLabels(otherLabels);
    return data[labelName] ?? [];
  }

  async getParserAndLabelKeys(logQuery: string) {
    return await this.languageProvider.getParserAndLabelKeys(logQuery);
  }

  async getSeriesLabels(labels: Label[]) {
    return await this.languageProvider.getSeriesLabels(this.buildSelector(labels)).then((data) => data ?? {});
  }
}
