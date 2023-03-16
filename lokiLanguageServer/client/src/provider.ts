import { Uri, WebviewView, WebviewViewResolveContext, CancellationToken, WebviewViewProvider } from 'vscode';

import { getNonce } from './getNonce';
import { logfmt } from './logfmt';

export class FaroProvider implements WebviewViewProvider {
  static readonly viewType = 'faro-exceptions';

  private webviewView: WebviewView | null = null;

  constructor(private extensionUri: Uri) {}

  async resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext, _token: CancellationToken) {
    this.webviewView = webviewView;

    this.webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    await this.reload(null);
  }

  async reload(logs: string[] | null) {
    if (this.webviewView) {
      this.webviewView.webview.html = await this.getHtmlForWebview(logs);
    }
  }

  private wrapInHtml(html: string) {
    const webview = this.webviewView!.webview;

    const styleResetPath = Uri.joinPath(this.extensionUri, 'media', 'reset.css');
    const stylesPathMainPath = Uri.joinPath(this.extensionUri, 'media', 'vscode.css');

    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<link href="${stylesResetUri}" rel="stylesheet">
		<link href="${stylesMainUri}" rel="stylesheet">
		<title>Faro Exceptions</title>
	</head>
	<body>
${html}
	</body>
</html>`;
  }

  private async getHtmlForWebview(logs: string[] | null) {
    if (logs === null) {
      return this.wrapInHtml(`		<p>There was an error fetching the data.</p>`);
    }

    if (logs.length === 0) {
      return this.wrapInHtml(`		<p>No exceptions found.</p>`);
    }

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
${logs
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
}
