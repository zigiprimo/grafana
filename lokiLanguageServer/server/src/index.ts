import express from 'express';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { URL } from 'url';
import { IWebSocket } from 'vscode-ws-jsonrpc';
import { WebSocketServer } from 'ws';

import { launch } from './launch.js';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception: ', err.toString());

  if (err.stack) {
    console.error(err.stack);
  }
});

const app = express();

const server = app.listen(3001, () => {
  console.log('server started');
});

const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
});

server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
  const baseURL = `http://${request.headers.host}/`;
  const pathname = request.url ? new URL(request.url, baseURL).pathname : undefined;

  if (pathname === '/lokiLanguageServer') {
    console.log('new connection');

    wss.handleUpgrade(request, socket, head, (webSocket) => {
      const socket: IWebSocket = {
        send: (content) =>
          webSocket.send(content, (error) => {
            if (error) {
              throw error;
            }
          }),
        onMessage: (cb) => webSocket.on('message', cb),
        onError: (cb) => webSocket.on('error', cb),
        onClose: (cb) => webSocket.on('close', cb),
        dispose: () => webSocket.close(),
      };

      if (webSocket.readyState === webSocket.OPEN) {
        launch(socket);
      } else {
        webSocket.on('open', () => launch(socket));
      }
    });
  }
});
