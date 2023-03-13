import { chain } from 'lodash';

import { HistoryItem } from '@grafana/data';
import type { monacoTypes } from '@grafana/ui';
import { escapeLabelValueInExactSelector } from 'app/plugins/datasource/prometheus/language_utils';

import LanguageProvider from '../../../LanguageProvider';
import { LokiQuery } from '../../../types';

import { Label } from './situation';

interface HistoryRef {
  current: Array<HistoryItem<LokiQuery>>;
}

export class CompletionDataProvider {
  private webSocket;

  webSocketId = 0;

  constructor(
    private languageProvider: LanguageProvider,
    private historyRef: HistoryRef = { current: [] },
    initialValue: string
  ) {
    this.webSocket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://localhost:3001/sampleServer`);

    this.webSocket.addEventListener('open', () => {
      this.webSocket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'textDocument/didOpen',
          params: {
            textDocument: {
              languageId: 'json',
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
      if (!this.webSocket) {
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

      if (webSocket.OPEN && !webSocket.CONNECTING && !webSocket.CLOSING) {
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
      }
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
