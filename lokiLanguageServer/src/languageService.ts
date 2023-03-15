import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionList, Diagnostic, Position } from 'vscode-languageserver-types';

import { validateQuery } from './validation.js';

export interface LanguageService {
  doResolve(item: CompletionItem): Thenable<CompletionItem>;
  doComplete(document: TextDocument, position: Position): Thenable<CompletionList | null>;
  doValidation(document: TextDocument): Thenable<Diagnostic[]>;
}

export function getLanguageService(): LanguageService {
  return {
    doValidation(document: TextDocument): Thenable<Diagnostic[]> {
      return Promise.resolve(validateQuery(document.getText()));
    },
    doResolve: (_item): Thenable<CompletionItem> => {
      return Promise.resolve({
        label: 'aaa',
        detail: 'detail of aaa',
      });
    },
    doComplete: (_document, _position): Thenable<CompletionList> => {
      return Promise.resolve({
        label: 'completions',
        isIncomplete: false,
        items: [
          {
            label: 'ccc',
          },
          {
            label: 'ddd',
          },
        ],
      });
    },
  };
}
