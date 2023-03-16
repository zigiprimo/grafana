import { Uri, WebviewView, WebviewViewResolveContext, CancellationToken, WebviewViewProvider } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/lib/node/main';

import { getNonce } from './getNonce';
import { logfmt } from './logfmt';

export class FaroProvider implements WebviewViewProvider {
  static readonly viewType = 'faro-data';

  filePath: string | null = null;

  lineNumber: number | null = null;

  logs: string[] | null = [];

  mode: 'exceptions' | 'events' | 'logs' = 'logs';

  client: LanguageClient | undefined;

  private webviewView: WebviewView | null = null;

  constructor(private extensionUri: Uri) {}

  async resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext, _token: CancellationToken) {
    this.webviewView = webviewView;

    this.webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage(({ type, value }) => {
      switch (type) {
        case 'changeMode': {
          this.changeMode(value);
          break;
        }
      }
    });

    await this.reload();
  }

  async reload() {
    if (this.webviewView) {
      const explodedTitle = this.mode.split('');

      if (explodedTitle[0]) {
        explodedTitle[0] = explodedTitle[0].toUpperCase();
      }

      this.webviewView.title = explodedTitle.join('');
      this.webviewView.webview.html = await this.getHtmlForWebview();
    }
  }

  private changeMode(mode: 'exceptions' | 'events' | 'logs') {
    this.mode = mode;

    this.logs = [];

    this.reload();

    this.client?.sendRequest('get-new-logs', {
      filePath: this.filePath,
      mode,
    });
  }

  private getUriToMedia(fileName: string) {
    return this.webviewView!.webview.asWebviewUri(Uri.joinPath(this.extensionUri, 'media', fileName));
  }

  private wrapInHtml(html: string) {
    const cspSource = this.webviewView!.webview.cspSource;

    const nonce = getNonce();

    return `<!DOCTYPE html>
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
${html}
	<script nonce="${nonce}" src="${this.getUriToMedia('main.js')}"></script>
	</body>
</html>`;
  }

  private renderExceptions() {
    return this.wrapInHtml(`		<table>
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
		</table>`);
  }

  private renderData() {
    return this.wrapInHtml(`		<table>
			<tbody>
${this.logs!.map(
  (line) => `				<tr>
					<td>${line}</td>
				</tr>`
).join('')}
			</tbody>
		</table>`);
  }

  private async getHtmlForWebview() {
    if (this.logs === null) {
      return this.wrapInHtml(`		<p>There was an error fetching the data.</p>`);
    }

    if (this.logs.length === 0) {
      return this.wrapInHtml(`		<p>No logs found.</p>`);
    }

    switch (this.mode) {
      case 'exceptions':
        return this.renderExceptions();

      case 'events':
      case 'logs':
        return this.renderData();

      default:
        return this.wrapInHtml(`		<p>Unknown error</p>`);
    }
  }
}
