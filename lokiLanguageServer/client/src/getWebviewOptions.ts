import { Uri, WebviewOptions } from 'vscode';

export function getWebviewOptions(extensionUri: Uri): WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [Uri.joinPath(extensionUri, 'media')],
  };
}
