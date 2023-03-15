import { SyntaxNode } from '@lezer/common';

import {
  parser,
  LineFilter,
  LabelFormatExpr,
  Selector,
  PipelineExpr,
  LabelParser,
  JsonExpressionParser,
  LabelFilter,
  MetricExpr,
  Matcher,
  Identifier,
  PipelineStage,
} from '@grafana/lezer-logql';

const ErrorId = 0;

export function formatQuery(selector: string | undefined): string {
  return `${selector || ''}`.trim();
}

export function parseToNodeNamesArray(query: string): string[] {
  const queryParts: string[] = [];
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ name }): false | void => {
      queryParts.push(name);
    },
  });
  return queryParts;
}

export function isValidQuery(query: string): boolean {
  let isValid = true;
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ type }): false | void => {
      if (type.id === ErrorId) {
        isValid = false;
      }
    },
  });
  return isValid;
}

export function isLogsQuery(query: string): boolean {
  let isLogsQuery = true;
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ type }): false | void => {
      if (type.id === MetricExpr) {
        isLogsQuery = false;
      }
    },
  });
  return isLogsQuery;
}

export function isQueryWithParser(query: string): { queryWithParser: boolean; parserCount: number } {
  let parserCount = 0;
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ type }): false | void => {
      if (type.id === LabelParser || type.id === JsonExpressionParser) {
        parserCount++;
      }
    },
  });
  return { queryWithParser: parserCount > 0, parserCount };
}

export function getParserFromQuery(query: string) {
  const tree = parser.parse(query);
  let logParser;
  tree.iterate({
    enter: (node: SyntaxNode): false | void => {
      if (node.type.id === LabelParser || node.type.id === JsonExpressionParser) {
        logParser = query.substring(node.from, node.to).trim();
        return false;
      }
    },
  });

  return logParser;
}

export function isQueryPipelineErrorFiltering(query: string): boolean {
  let isQueryPipelineErrorFiltering = false;
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ type, node }): false | void => {
      if (type.id === LabelFilter) {
        const label = node.getChild(Matcher)?.getChild(Identifier);
        if (label) {
          const labelName = query.substring(label.from, label.to);
          if (labelName === '__error__') {
            isQueryPipelineErrorFiltering = true;
          }
        }
      }
    },
  });

  return isQueryPipelineErrorFiltering;
}

export function isQueryWithLabelFormat(query: string): boolean {
  let queryWithLabelFormat = false;
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ type }): false | void => {
      if (type.id === LabelFormatExpr) {
        queryWithLabelFormat = true;
      }
    },
  });
  return queryWithLabelFormat;
}

export function removeTrailingPipeline(query: string): string {
  let finalQuery = query;
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ node, type, from, to }): false | void => {
      if (type.id === PipelineStage) {
        const pipelineExpr = query.substring(from, to).trim();
        if (pipelineExpr === '|') {
          finalQuery = query.substring(0, from - 1) + query.substring(to, query.length);
        }
      }
    },
  });
  return finalQuery;
}

export function getQueryWithoutTrailingLabelFilter(query: string): { query: string; label: string } {
  let finalQuery = query;
  let finalLabel = '';
  // TODO: This is quite hacky, it can be done easier probably
  const tree = parser.parse(query);
  tree.iterate({
    enter: ({ node, type, from, to }): false | void => {
      if (type.id === LabelFilter) {
        const hasError = node.getChild(Matcher)?.getChild(ErrorId);
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

export function getLogQueryFromMetricsQuery(query: string): string {
  if (isLogsQuery(query)) {
    return query;
  }

  const tree = parser.parse(query);

  // Log query in metrics query composes of Selector & PipelineExpr
  let selector = '';
  tree.iterate({
    enter: ({ type, from, to }): false | void => {
      if (type.id === Selector) {
        selector = query.substring(from, to);
        return false;
      }
    },
  });

  let pipelineExpr = '';
  tree.iterate({
    enter: ({ type, from, to }): false | void => {
      if (type.id === PipelineExpr) {
        pipelineExpr = query.substring(from, to);
        return false;
      }
    },
  });

  return selector + pipelineExpr;
}

export function isQueryWithLabelFilter(query: string): boolean {
  const tree = parser.parse(query);
  let hasLabelFilter = false;

  tree.iterate({
    enter: ({ type, node }): false | void => {
      if (type.id === LabelFilter) {
        hasLabelFilter = true;
        return;
      }
    },
  });

  return hasLabelFilter;
}

export function isQueryWithLineFilter(query: string): boolean {
  const tree = parser.parse(query);
  let queryWithLineFilter = false;

  tree.iterate({
    enter: ({ type }): false | void => {
      if (type.id === LineFilter) {
        queryWithLineFilter = true;
        return;
      }
    },
  });

  return queryWithLineFilter;
}

export function getStreamSelectorsFromQuery(query: string): string[] {
  const labelMatcherPositions = getStreamSelectorPositions(query);

  const labelMatchers = labelMatcherPositions.map((labelMatcher) => {
    return query.slice(labelMatcher.from, labelMatcher.to);
  });

  return labelMatchers;
}

export function getStreamSelectorPositions(query: string): Position[] {
  const tree = parser.parse(query);
  const positions: Position[] = [];
  tree.iterate({
    enter: ({ type, from, to }): false | void => {
      if (type.id === Selector) {
        positions.push({ from, to });
        return false;
      }
    },
  });
  return positions;
}

type Position = { from: number; to: number };
