import { SyntaxNode } from '@lezer/common';
import { Diagnostic } from 'vscode-languageserver-types';

import { parser } from '@grafana/lezer-logql';

interface ParserErrorBoundary {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  error: string;
}

interface ParseError {
  text: string;
  node: SyntaxNode;
}

export function validateQuery(query: string): Diagnostic[] {
  /**
   * To provide support to variable interpolation in query validation, we run the parser in the interpolated
   * query. If there are errors there, we trace them back to the original unparsed query, so we can more
   * accurately highlight the error in the query, since it's likely that the variable name and variable value
   * have different lengths. With this, we also exclude irrelevant parser errors that are produced by
   * lezer not understanding $variables and $__variables, which usually generate 2 or 3 error SyntaxNode.
   */

  return parseQuery(query)
    .map((parseError) => findErrorBoundary(query, [query], parseError))
    .filter(isErrorBoundary)
    .map((parseError) => ({
      message: parseError.error,
      range: {
        start: {
          line: parseError.startLineNumber + 1,
          character: parseError.startColumn + 1,
        },
        end: {
          line: parseError.endLineNumber + 1,
          character: parseError.endColumn + 1,
        },
      },
    }));
}

function parseQuery(query: string) {
  const parseErrors: ParseError[] = [];
  const tree = parser.parse(query);
  tree.iterate({
    enter: (nodeRef): false | void => {
      if (nodeRef.type.id === 0) {
        const node = nodeRef.node;
        parseErrors.push({
          node: node,
          text: query.substring(node.from, node.to),
        });
      }
    },
  });
  return parseErrors;
}

function findErrorBoundary(query: string, queryLines: string[], parseError: ParseError): ParserErrorBoundary | null {
  if (queryLines.length === 1) {
    const isEmptyString = parseError.node.from === parseError.node.to;
    const errorNode = isEmptyString && parseError.node.parent ? parseError.node.parent : parseError.node;
    const error = isEmptyString ? query.substring(errorNode.from, errorNode.to) : parseError.text;
    return {
      startLineNumber: 1,
      startColumn: errorNode.from + 1,
      endLineNumber: 1,
      endColumn: errorNode.to + 1,
      error,
    };
  }

  let startPos = 0,
    endPos = 0;
  for (let line = 0; line < queryLines.length; line++) {
    endPos = startPos + queryLines[line].length;

    if (parseError.node.from > endPos) {
      startPos += queryLines[line].length + 1;
      continue;
    }

    return {
      startLineNumber: line + 1,
      startColumn: parseError.node.from - startPos + 1,
      endLineNumber: line + 1,
      endColumn: parseError.node.to - startPos + 1,
      error: parseError.text,
    };
  }

  return null;
}

function isErrorBoundary(boundary: ParserErrorBoundary | null): boundary is ParserErrorBoundary {
  return boundary !== null;
}

export const placeHolderScopedVars = {
  __interval: { text: '1s', value: '1s' },
  __interval_ms: { text: '1000', value: 1000 },
  __range_ms: { text: '1000', value: 1000 },
  __range_s: { text: '1', value: 1 },
  __range: { text: '1s', value: '1s' },
};
