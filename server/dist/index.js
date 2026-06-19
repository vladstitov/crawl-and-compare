"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const ws_1 = require("ws");
require("./core/database");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});
const server = (0, http_1.createServer)(app);
const bridge = new ws_1.WebSocketServer({ server, path: '/bridge' });
function sendJson(socket, data) {
    socket.send(JSON.stringify(data));
}
function broadcastJson(data) {
    const payload = JSON.stringify(data);
    bridge.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(payload);
        }
    });
}
bridge.on('connection', (socket) => {
    sendJson(socket, {
        type: 'bridge:welcome',
        at: new Date().toISOString(),
        clients: bridge.clients.size
    });
    socket.on('message', (raw) => {
        const text = raw.toString();
        console.log('Received message from bridge client:', text);
        let message;
        try {
            message = JSON.parse(text);
        }
        catch {
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
app.post('/bridge/publish', (req, res) => {
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
//# sourceMappingURL=index.js.map