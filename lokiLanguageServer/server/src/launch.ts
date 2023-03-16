import { createConnection } from 'vscode-languageserver/lib/node/main';
import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

import { LogQLServer } from './logQLServer.js';

export function launch(socket: IWebSocket) {
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);
  const connection = createConnection(reader, writer);
  const server = new LogQLServer(connection);

  server.start();
}
