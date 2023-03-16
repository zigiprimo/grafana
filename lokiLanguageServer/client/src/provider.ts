import { Uri, WebviewView, WebviewViewResolveContext, CancellationToken, WebviewViewProvider, workspace } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/lib/node/main';
import { URI } from 'vscode-uri';

import { getNonce } from './getNonce';
import { logfmt } from './logfmt';

export class FaroProvider implements WebviewViewProvider {
  static readonly viewType = 'faro-data';

  client: LanguageClient | undefined;

  private mode: 'exceptions' | 'events' | 'logs' = 'logs';

  private logs: string[] | null = [];

  private webviewView: WebviewView | null = null;

  constructor(private extensionUri: Uri, private filePath: string | null, private lineNumber: number | null) {}

  async resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext, _token: CancellationToken) {
    this.webviewView = webviewView;

    this.webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage(this.handleMessage.bind(this));

    await this.paint();
  }

  setClient(value: LanguageClient | undefined) {
    this.client = value;

    this.client?.onRequest('receive-new-logs', this.setLogs.bind(this));

    this.getNewLogs();
  }

  setFilePathAndLine(filePath: string | null, lineNumber: number | null) {
    const workspaceFolder = workspace.getWorkspaceFolder(URI.file(filePath ?? ''));

    const oldFilePath = this.filePath;
    const oldLineNumber = this.lineNumber;

    this.filePath = !workspaceFolder
      ? null
      : filePath === null
      ? null
      : filePath.replace(workspaceFolder?.uri.fsPath, '').replace('/src', '');

    this.lineNumber = typeof lineNumber === 'number' ? lineNumber + 1 : null;

    if (this.filePath !== oldFilePath) {
      this.getNewLogs();
    } else if (this.lineNumber !== oldLineNumber) {
      this.paint();
    }
  }

  private handleMessage({ type, value }: { type: string; value: any }) {
    switch (type) {
      case 'changeMode': {
        this.setMode(value);
        break;
      }
    }
  }

  private setMode(value: 'exceptions' | 'events' | 'logs') {
    this.mode = value;

    this.getNewLogs();
  }

  private setLogs(value: string[] | null = null) {
    this.logs = value;

    this.paint();
  }

  private getNewLogs() {
    this.setLogs([]);

    this.client?.sendRequest('get-new-logs', {
      filePath: this.filePath,
      mode: this.mode,
    });
  }

  private paint() {
    this.setTitle();
    this.setContent();
  }

  private setTitle() {
    if (this.webviewView) {
      const explodedTitle = this.mode.split('');

      if (explodedTitle[0]) {
        explodedTitle[0] = explodedTitle[0].toUpperCase();
      }

      this.webviewView.title = explodedTitle.join('');
    }
  }

  private getExceptionsContent() {
    return `		<table>
			<thead>
				<tr>
					<th>Timestamp</th>
					<th>Environment</th>
					<th>Version</th>
					<th>Browser</th>
					<th>OS</th>
					<th>URL</th>
					<th>Message</th>
					<th>Stacktrace</th>
				</tr>
			</thead>
			<tbody>
${this.logs!.filter((line) => line.includes(`${this.filePath}:${this.lineNumber}`))
  .map((line) => {
    const parsed = logfmt((line as string).replaceAll('\\n', 'splitwithmenow'));

    return `				<tr>
					<td>${parsed.timestamp}</td>
					<td>${parsed.app_environment}</td>
					<td>${parsed.app_version}</td>
					<td>${parsed.browser_name} ${parsed.browser_version}</td>
					<td>${parsed.browser_os}</td>
					<td>${parsed.page_url}</td>
					<td>${parsed.value}</td>
					<td>
${(parsed.stacktrace ?? '')
  .toString()
  .split('splitwithmenow')
  .map((stacktraceLine) => `						<p>${stacktraceLine}</p>`)
  .join('')}
					</td>
				</tr>`;
  })
  .join('')}
			</tbody>
		</table>`;
  }

  private getLogsContent() {
    return `		<table>
			<tbody>
${this.logs!.map(
  (line) => `				<tr>
					<td>${line}</td>
				</tr>`
).join('')}
			</tbody>
		</table>`;
  }

  private getUriToMedia(fileName: string) {
    return this.webviewView!.webview.asWebviewUri(Uri.joinPath(this.extensionUri, 'media', fileName));
  }

  private setContent() {
    if (this.webviewView) {
      let content: string;

      if (this.logs === null) {
        content = `		<p>There was an error fetching the data.</p>`;
      } else if (this.logs?.length === 0) {
        content = `		<p>No logs found.</p>`;
      } else {
        switch (this.mode) {
          case 'exceptions':
            content = this.getExceptionsContent();
            break;

          case 'events':
          case 'logs':
            content = this.getLogsContent();
            break;

          default:
            content = `		<p>Unknown error.</p>`;
        }
      }

      const cspSource = this.webviewView!.webview.cspSource;

      const nonce = getNonce();

      this.webviewView.webview.html = `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; img-src ${cspSource} https:; script-src 'nonce-${nonce}';">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<link href="${this.getUriToMedia('reset.css')}" rel="stylesheet">
		<link href="${this.getUriToMedia('vscode.css')}" rel="stylesheet">
		<title>Faro ${this.webviewView?.title ?? ''}</title>
	</head>
	<body>
		<div>
			<button id="logs" class="${this.mode === 'logs' ? 'active' : ''}">Logs</button>
			<button id="exceptions" class="${this.mode === 'exceptions' ? 'active' : ''}">Exceptions</button>
			<button id="events" class="${this.mode === 'events' ? 'active' : ''}">Events</button>
		</div>
${content}
	<script nonce="${nonce}" src="${this.getUriToMedia('main.js')}"></script>
	</body>
</html>`;
    }
  }
}
