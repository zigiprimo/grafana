// eslint-disable-next-line lodash/import-scope
import _ from 'lodash';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, Position } from 'vscode-languageserver-types';

import { Identifier, LabelFilter, Matcher, parser } from '@grafana/lezer-logql';

import { getLabelNames, getLabelNamesIfOtherLabels, getLabelValues, getSamples, getStats } from './fetch';
import {
  AGGREGATION_COMPLETIONS,
  BUILT_IN_FUNCTIONS_COMPLETIONS,
  DURATION_COMPLETIONS,
  FUNCTION_COMPLETIONS,
  getLineFilterCompletions,
  LOG_COMPLETIONS,
} from './operations';
import { isQueryWithParser } from './queryUtils';
import { getSituation, Situation } from './situation';

export async function createCompletionItems(document: TextDocument, position: Position): Promise<CompletionItem[]> {
  const situation = getSituation(document.getText(), position.character);
  return situation != null ? await getCompletions(situation) : await Promise.resolve([]);
}

async function getCompletions(situation: Situation): Promise<CompletionItem[]> {
  switch (situation.type) {
    case 'EMPTY':
    case 'AT_ROOT':
      return [
        ...LOG_COMPLETIONS,
        ...AGGREGATION_COMPLETIONS,
        ...BUILT_IN_FUNCTIONS_COMPLETIONS,
        ...FUNCTION_COMPLETIONS,
      ];
    case 'IN_RANGE':
      return DURATION_COMPLETIONS;
    case 'IN_LABEL_SELECTOR_NO_LABEL_NAME':
      return getLabelNamesCompletions(situation.otherLabels);
    case 'IN_LABEL_SELECTOR_WITH_LABEL_NAME':
      return getLabelValuesCompletions(situation.labelName, situation.betweenQuotes, situation.otherLabels);
    case 'AFTER_SELECTOR':
      return getAfterSelectorCompletions(situation.logQuery, situation.afterPipe, situation.hasSpace);
    case 'IN_AGGREGATION':
      return [...FUNCTION_COMPLETIONS, ...AGGREGATION_COMPLETIONS];
    case 'IN_LABEL_FILTER_MATCHER':
      return getLabelFilterMatcherCompletions(situation.logQuery);
    default:
      return [];
  }
}

export type LabelOperator = '=' | '!=' | '=~' | '!~';

export type Label = {
  name: string;
  value: string;
  op: LabelOperator;
};

async function getLabelNamesCompletions(otherLabels: Label[]) {
  const names = await getLabelNames();
  if (!otherLabels.length) {
    return names.map((name) => ({
      label: name,
      insertText: `${name}=`,
      documentation: undefined,
    }));
  }
  const expr = `{${otherLabels.map((label) => `${label.name}${label.op}"${label.value}"`).join(',')}}`;
  const currentBytes = await getStats(expr);

  let bytesPerLabelName: { [key: string]: number } = {};

  if (currentBytes) {
    bytesPerLabelName = await getStatsForLabelNames(otherLabels);
  }

  const completionItems = Object.keys(bytesPerLabelName).map((name) => {
    const completionItem: CompletionItem = {
      label: name,
      insertText: `${name}=`,
    };

    if (currentBytes !== undefined && bytesPerLabelName[name] !== undefined) {
      const text = humanFileSize(bytesPerLabelName[name]);
      const currText = humanFileSize(currentBytes);
      completionItem.detail = `"${name}" label is present in ~${text}/${currText} logs.`;
    }

    return completionItem;
  });
  return completionItems;
}

const getStatsForLabelValues = async (
  otherLabels: Label[],
  labelName: string,
  labelValues: string[]
): Promise<{ [key: string]: number }> => {
  const bytesForLabel: { [key: string]: number } = {};
  const expr = `${otherLabels.map((label) => `${label.name}${label.op}"${label.value}"`).join(',')}`;

  for (const value of labelValues) {
    const newQuery = `{${expr},${labelName}="${value}"}`;
    const bytes = await getStats(newQuery);
    if (bytes !== undefined) {
      bytesForLabel[value] = bytes;
    }
  }
  return bytesForLabel;
};

const getStatsForLabelNames = async (selectedLabels: Label[] = []): Promise<{ [key: string]: number }> => {
  const bytesForLabel: { [key: string]: number } = {};
  const expr = selectedLabels.map((label) => `${label.name}${label.op}"${label.value}"`).join(',');
  const labelNames = await getLabelNamesIfOtherLabels(selectedLabels);

  for (const labelName of labelNames) {
    // This should be ~".+" but it does not work so we are hacking it with ~".*" for now.
    const newQuery = `{${expr},${labelName}=~".*"}`;
    const bytes = await getStats(newQuery);
    if (bytes !== undefined) {
      bytesForLabel[labelName] = bytes;
    }
  }
  return bytesForLabel;
};

async function getLabelValuesCompletions(
  labelName: string,
  betweenQuotes: boolean,
  otherLabels: Label[]
): Promise<CompletionItem[]> {
  const values = await getLabelValues(labelName);
  if (!otherLabels.length) {
    return values.map((value) => ({
      label: value,
      insertText: betweenQuotes ? value : `"${value}"`,
      documentation: undefined,
    }));
  }

  const expr = `{${otherLabels.map((label) => `${label.name}${label.op}"${label.value}"`).join(',')}}`;
  const currentBytes = await getStats(expr);

  let bytesPerLabel: { [key: string]: number } = {};

  if (currentBytes) {
    bytesPerLabel = await getStatsForLabelValues(otherLabels, labelName, values);
  }

  const completionItems = Object.keys(bytesPerLabel).map((name) => {
    const completionItem: CompletionItem = {
      label: name,
      insertText: betweenQuotes ? name : `"${name}"`,
    };

    if (currentBytes !== undefined && bytesPerLabel[name] !== undefined) {
      const text = humanFileSize(bytesPerLabel[name]);
      const currText = humanFileSize(currentBytes);
      completionItem.detail = `"${name}" label is present in ~${text}/${currText} logs.`;
    }

    return completionItem;
  });
  return completionItems;
}

async function getAfterSelectorCompletions(
  logQuery: string,
  afterPipe: boolean,
  hasSpace: boolean
): Promise<CompletionItem[]> {
  const { extractedLabelKeys } = await getLabelKeys(logQuery);
  const queryWithParser = isQueryWithParser(logQuery).queryWithParser;

  const prefix = `${hasSpace ? '' : ' '}${afterPipe ? '' : '| '}`;
  const completions: CompletionItem[] = await getParserCompletions(prefix);

  if (queryWithParser) {
    extractedLabelKeys.forEach((key) => {
      completions.push({
        label: `${key} (detected)`,
        insertText: `${prefix} ${key}`,
        documentation: `${key} label was detected from sampled log lines.`,
      });
    });
  }

  completions.push({
    label: 'unwrap',
    insertText: `${prefix}unwrap`,
    documentation: "Unwrap a log line's JSON object into a set of labels",
  });

  completions.push({
    label: 'line_format',
    insertText: `${prefix}line_format "{{.}}"`,
    documentation: 'Format a log line',
  });

  completions.push({
    label: 'label_format',
    insertText: `${prefix}label_format`,
    documentation: "Format a log line's labels",
  });

  if (queryWithParser) {
    return [...completions];
  }

  // With a space between the pipe and the cursor, we omit line filters
  // E.g. `{label="value"} | `
  const lineFilters = afterPipe && hasSpace ? [] : getLineFilterCompletions(afterPipe);

  return [...lineFilters, ...completions];
}

async function getParserCompletions(prefix: string) {
  const PARSERS = ['json', 'logfmt', 'pattern', 'regexp', 'unpack'];
  const completions: CompletionItem[] = [];

  const remainingParsers = Array.from(PARSERS).sort();
  remainingParsers.forEach((parser) => {
    completions.push({
      label: parser,
      insertText: `${prefix}${parser}`,
      documentation: 'Parse content using the Loki parser',
    });
  });

  return completions;
}

export function humanFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + ' ' + units[u];
}

async function getLabelKeys(logQuery: string): Promise<{ extractedLabelKeys: string[] }> {
  const series = await getSamples(_.trimEnd(logQuery, '| '));
  if (!series.length) {
    return { extractedLabelKeys: [] };
  }

  return {
    extractedLabelKeys: extractLabelKeysFromDataFrame(series[0]),
  };
}

export function extractLabelKeysFromDataFrame(frame: any): string[] {
  const labelsArray = frame?.data.values[0];

  if (!labelsArray?.length) {
    return [];
  }

  return Object.keys(labelsArray[0]);
}

export function extractLabelValuesFromDataFrame(frame: any, label: string): string[] {
  const logLabelsArray = frame?.data.values[0];
  const values = new Set<string>();

  for (const logLabels of logLabelsArray) {
    if (logLabels[label]) {
      values.add(logLabels[label]);
    }
  }

  return [...values];
}

async function getParsedLabelValues(query: string, label: string): Promise<string[]> {
  const series = await getSamples(query);

  if (!series.length) {
    return [];
  }

  return extractLabelValuesFromDataFrame(series[0], label);
}

async function getLabelFilterMatcherCompletions(logsQuery: string): Promise<CompletionItem[]> {
  const { query, label } = getQueryWithoutTrailingLabelFilter(logsQuery);
  const result = await getParsedLabelValues(_.trimEnd(query, '| '), label);
  return result.map((text) => ({
    label: `${text} (detected)`,
    insertText: `\`${text}\``,
    documentation: `${text} value was detected from sampled log lines.`,
  }));
}

export function getQueryWithoutTrailingLabelFilter(query: string): { query: string; label: string } {
  let finalQuery = query;
  let finalLabel = '';
  // TODO: This is quite hacky, it can be done easier probably
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ node, type, from, to }): false | void => {
      if (type.id === LabelFilter) {
        const hasError = node.getChild(Matcher)?.getChild(0);
        if (hasError) {
          const labelFilterEndsWithEquals = query.substring(from, to).trim();
          if (labelFilterEndsWithEquals[labelFilterEndsWithEquals.length - 1] === '=') {
            const labelNameNode = node.getChild(Matcher)?.getChild(Identifier);
            if (labelNameNode) {
              // We set these only if we know that last character is "=" and we have a label name
              finalQuery = query.substring(0, from) + query.substring(to, query.length);
              finalLabel = query.substring(labelNameNode.from, labelNameNode.to);
            }
          }
        }
      }
    },
  });
  return { query: finalQuery, label: finalLabel };
}
