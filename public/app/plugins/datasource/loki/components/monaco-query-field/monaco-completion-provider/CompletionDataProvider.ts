import { chain } from 'lodash';

import { HistoryItem } from '@grafana/data';
import { escapeLabelValueInExactSelector } from 'app/plugins/datasource/prometheus/language_utils';

import LanguageProvider from '../../../LanguageProvider';
import { LokiDatasource } from '../../../datasource';
import { LokiQuery } from '../../../types';

import { Label } from './situation';

interface HistoryRef {
  current: Array<HistoryItem<LokiQuery>>;
}

export class CompletionDataProvider {
  constructor(
    private datasource: LokiDatasource,
    private languageProvider: LanguageProvider,
    private historyRef: HistoryRef = { current: [] }
  ) {}

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
      const newQuery = `{${expr}, ${labelName}=~".*"}`;
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
