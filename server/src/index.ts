import express, { Request, Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { RawData, WebSocketServer, WebSocket } from 'ws';
import './core/database';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server is running!' });
});

const server = createServer(app);
const bridge = new WebSocketServer({ server, path: '/bridge' });

function sendJson(socket: WebSocket, data: unknown): void {
  socket.send(JSON.stringify(data));
}

function broadcastJson(data: unknown): void {
  const payload = JSON.stringify(data);

  bridge.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

bridge.on('connection', (socket: WebSocket) => {
  sendJson(socket, {
    type: 'bridge:welcome',
    at: new Date().toISOString(),
    clients: bridge.clients.size
  });

  socket.on('message', (raw: RawData) => {
    const text = raw.toString();

    console.log('Received message from bridge client:', text);
    let message: unknown;
    try {
      message = JSON.parse(text);
    } catch {
      sendJson(socket, {
        type: 'bridge:error',
        error: 'Invalid JSON message received.'
      });
      return;
    }

    broadcastJson({
      type: 'bridge:message',
      at: new Date().toISOString(),
      payload: message
    });
  });
});

app.post('/bridge/publish', (req: Request, res: Response) => {
  broadcastJson({
    type: 'bridge:message',
    at: new Date().toISOString(),
    payload: req.body
  });

  res.json({ ok: true, recipients: bridge.clients.size });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Bridge websocket is running on ws://localhost:${PORT}/bridge`);
});
