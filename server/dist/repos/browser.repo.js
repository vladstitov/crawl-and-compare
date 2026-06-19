"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserRepo = void 0;
const http_1 = require("http");
const ws_1 = require("ws");
var BrowserRepo;
(function (BrowserRepo) {
    function health() {
        return {
            ok: true,
            message: 'Browser repo namespace is ready.'
        };
    }
    BrowserRepo.health = health;
    function sendJson(socket, data) {
        socket.send(JSON.stringify(data));
    }
    function broadcastJson(bridge, data) {
        const payload = JSON.stringify(data);
        bridge.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }
    function StartSocketServer(app, port) {
        const server = (0, http_1.createServer)(app);
        const bridge = new ws_1.WebSocketServer({ server, path: '/bridge' });
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
                broadcastJson(bridge, {
                    type: 'bridge:message',
                    at: new Date().toISOString(),
                    payload: message
                });
            });
        });
        app.post('/bridge/publish', (req, res) => {
            broadcastJson(bridge, {
                type: 'bridge:message',
                at: new Date().toISOString(),
                payload: req.body
            });
            res.json({ ok: true, recipients: bridge.clients.size });
        });
        server.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
            console.log(`Bridge websocket is running on ws://localhost:${port}/bridge`);
        });
    }
    BrowserRepo.StartSocketServer = StartSocketServer;
})(BrowserRepo || (exports.BrowserRepo = BrowserRepo = {}));
//# sourceMappingURL=browser.repo.js.map