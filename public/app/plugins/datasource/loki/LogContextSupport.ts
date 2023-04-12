import { FieldCache, FieldType, LogRowModel, TimeRange, toUtc } from '@grafana/data';
import { DataQuery } from '@grafana/schema';
import { LokiContextUi } from './components/LokiContextUi';
import LanguageProvider from './LanguageProvider';
import { escapeLabelValueInExactSelector } from './languageUtils';
import { addLabelToQuery, addParserToQuery } from './modifyQuery';
import { getParserFromQuery } from './queryUtils';
import { ContextFilter, LokiQuery, LokiQueryDirection, LokiQueryType } from './types';

export const REF_ID_STARTER_LOG_ROW_CONTEXT = 'log-row-context-query-';

export class LogContextSupport {
  languageProvider: LanguageProvider;
  contextFilters: { [key: string]: ContextFilter[] };
  onContextClose: (() => void) | undefined;

  constructor(languageProvider: LanguageProvider) {
    this.languageProvider = languageProvider;
    this.contextFilters = {};
  }

  private async prepareContextExpr(row: LogRowModel, origQuery?: DataQuery): Promise<string> {
    await this.languageProvider.start();
    const labelKeys = this.languageProvider.getLabelKeys();

    if (this.contextFilters[row.uid]) {
      let expr = this.contextFilters[row.uid]
        .map((filter) => {
          const label = filter.label;
          if (filter && !filter.fromParser && filter.enabled) {
            // escape backslashes in label as users can't escape them by themselves
            return `${label}="${escapeLabelValueInExactSelector(filter.value)}"`;
          }
          return '';
        })
        // Filter empty strings
        .filter((label) => !!label)
        .join(',');

      expr = `{${expr}}`;

      const parserContextFilters = this.contextFilters[row.uid].filter((filter) => filter.fromParser && filter.enabled);
      if (parserContextFilters.length) {
        // we should also filter for labels from parsers, let's find the right parser
        if (origQuery) {
          const parser = getParserFromQuery((origQuery as LokiQuery).expr);
          if (parser) {
            expr = addParserToQuery(expr, parser);
          }
        }
        for (const filter of parserContextFilters) {
          if (filter.enabled) {
            expr = addLabelToQuery(expr, filter.label, '=', filter.value);
          }
        }
      }
      return expr;
    } else {
      const labelFilters = Object.keys(row.labels)
        .map((label: string) => {
          if (labelKeys.includes(label)) {
            // escape backslashes in label as users can't escape them by themselves
            return `${label}="${escapeLabelValueInExactSelector(row.labels[label])}"`;
          }
          return '';
        })
        .filter((label) => !!label)
        .join(',');

      let expr = `{${labelFilters}}`;

      if (origQuery) {
        const parser = getParserFromQuery((origQuery as LokiQuery).expr);
        if (parser) {
          expr = addParserToQuery(expr, parser);
        }
      }
      return expr;
    }
  }

  getLogRowContextUi(row: LogRowModel, runContextQuery: () => void): React.ReactNode {
    const updateFilter = (contextFilters: ContextFilter[]) => {
      this.contextFilters[row.uid] = contextFilters;
      if (runContextQuery) {
        runContextQuery();
      }
    };

    // we need to cache this function so that it doesn't get recreated on every render
    this.onContextClose =
      this.onContextClose ??
      (() => {
        delete this.contextFilters[row.uid];
      });

    return LokiContextUi({
      row,
      updateFilter,
      languageProvider: this.languageProvider,
      onClose: this.onContextClose,
    });
  }

  prepareLogRowContextQueryTarget = async (
    row: LogRowModel,
    limit: number,
    direction: 'BACKWARD' | 'FORWARD',
    origQuery?: DataQuery
  ): Promise<{ query: LokiQuery; range: TimeRange }> => {
    let expr = await this.prepareContextExpr(row, origQuery);

    const contextTimeBuffer = 2 * 60 * 60 * 1000; // 2h buffer

    const queryDirection = direction === 'FORWARD' ? LokiQueryDirection.Forward : LokiQueryDirection.Backward;

    const query: LokiQuery = {
      expr,
      queryType: LokiQueryType.Range,
      refId: `${REF_ID_STARTER_LOG_ROW_CONTEXT}${row.dataFrame.refId || ''}`,
      maxLines: limit,
      direction: queryDirection,
    };

    const fieldCache = new FieldCache(row.dataFrame);
    const tsField = fieldCache.getFirstFieldOfType(FieldType.time);
    if (tsField === undefined) {
      throw new Error('loki: data frame missing time-field, should never happen');
    }
    const tsValue = tsField.values.get(row.rowIndex);
    const timestamp = toUtc(tsValue);

    const range =
      queryDirection === LokiQueryDirection.Forward
        ? {
            // start param in Loki API is inclusive so we'll have to filter out the row that this request is based from
            // and any other that were logged in the same ns but before the row. Right now these rows will be lost
            // because the are before but came it he response that should return only rows after.
            from: timestamp,
            // convert to ns, we lose some precision here but it is not that important at the far points of the context
            to: toUtc(row.timeEpochMs + contextTimeBuffer),
          }
        : {
            // convert to ns, we lose some precision here but it is not that important at the far points of the context
            from: toUtc(row.timeEpochMs - contextTimeBuffer),
            to: timestamp,
          };

    return {
      query,
      range: {
        from: range.from,
        to: range.to,
        raw: range,
      },
    };
  };
}
