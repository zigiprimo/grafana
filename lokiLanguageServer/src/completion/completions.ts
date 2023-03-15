import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, Position } from 'vscode-languageserver-types';

import { getLabelNames, getLabelValues } from './fetch.js';
import {
  AGGREGATION_COMPLETIONS,
  BUILT_IN_FUNCTIONS_COMPLETIONS,
  DURATION_COMPLETIONS,
  FUNCTION_COMPLETIONS,
  getLineFilterCompletions,
  LOG_COMPLETIONS,
} from './operations.js';
import { isQueryWithParser } from './queryUtils.js';
import { getSituation, Situation } from './situation.js';

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
      const options = await getLabelNames();
      return options.map((name) => ({
        label: name,
        insertText: `${name}=`,
        documentation: 'from LSP',
      }));
    case 'IN_LABEL_SELECTOR_WITH_LABEL_NAME':
      return getLabelValuesForMetricCompletions(situation.labelName, situation.betweenQuotes, situation.otherLabels);
    case 'AFTER_SELECTOR':
      return getAfterSelectorCompletions(situation.logQuery, situation.afterPipe, situation.hasSpace);
    case 'IN_AGGREGATION':
      return [...FUNCTION_COMPLETIONS, ...AGGREGATION_COMPLETIONS];
    // case 'IN_LABEL_FILTER_MATCHER':
    //   return getLabelFilterMatcherCompletions(situation.logQuery, dataProvider);
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

async function getLabelValuesForMetricCompletions(
  labelName: string,
  betweenQuotes: boolean,
  otherLabels: Label[]
): Promise<CompletionItem[]> {
  const values = await getLabelValues(labelName);

  const completionItems = values.map((value) => {
    const completionItem: CompletionItem = {
      label: value,
      insertText: betweenQuotes ? value : `"${value}"`,
      documentation: undefined,
    };
    return completionItem;
  });

  return completionItems;
}

async function getAfterSelectorCompletions(
  logQuery: string,
  afterPipe: boolean,
  hasSpace: boolean
): Promise<CompletionItem[]> {
  const completions: CompletionItem[] = [];
  // const { extractedLabelKeys, hasJSON, hasLogfmt } = await dataProvider.getParserAndLabelKeys(logQuery);
  const queryWithParser = isQueryWithParser(logQuery).queryWithParser;

  const prefix = `${hasSpace ? '' : ' '}${afterPipe ? '' : '| '}`;
  // const completions: Completion[] = await getParserCompletions(
  //   prefix,
  //   hasJSON,
  //   hasLogfmt,
  //   extractedLabelKeys,
  //   queryWithParser
  // );

  // if (queryWithParser) {
  //   extractedLabelKeys.forEach((key) => {
  //     completions.push({
  //       type: 'LABEL_NAME',
  //       label: `${key} (detected)`,
  //       insertText: `${prefix} ${key}`,
  //       documentation: `${key} label was detected from sampled log lines.`,
  //     });
  //   });
  // }

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
