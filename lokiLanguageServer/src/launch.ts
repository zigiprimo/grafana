import { createConnection } from 'vscode-languageserver/lib/node/main.js';
import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

import { JsonServer } from './jsonServer.js';

export function launch(socket: IWebSocket) {
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);
  const connection = createConnection(reader, writer);
  const server = new JsonServer(connection);

  server.start();
}
