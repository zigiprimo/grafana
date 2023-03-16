import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionList, Diagnostic, Position } from 'vscode-languageserver-types';

import { createCompletionItems } from './completion/completions.js';
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
    doResolve: (item): Thenable<CompletionItem> => {
      return Promise.resolve(item);
    },
    doComplete: (document, position): Thenable<CompletionList> => {
      return new Promise((resolve) => {
        createCompletionItems(document, position).then((items: CompletionItem[]) => {
          resolve({
            isIncomplete: false,
            items,
          });
        });
      });
    },
  };
}
