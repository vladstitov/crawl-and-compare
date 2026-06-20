"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserRepo = void 0;
const ws_1 = require("ws");
const analizer_repo_1 = require("./analizer.repo");
var BrowserRepo;
(function (BrowserRepo) {
    let extensionSocket = null;
    let webSocketServer = null;
    let lastHeartbeatAt = null;
    function isEventLog(value) {
        if (!value || typeof value !== 'object') {
            return false;
        }
        return ((value.from === 'background' || value.from === 'content_script'));
    }
    function isHeartbeatMessage(value) {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const payload = value;
        return payload.type === 'HEARTBEAT' && typeof payload.timestamp === 'number';
    }
    function health() {
        return {
            ok: true,
            message: extensionSocket?.readyState === ws_1.WebSocket.OPEN ? 'Extension connected.' : 'Waiting for extension connection.'
        };
    }
    BrowserRepo.health = health;
    function sendCommand(command) {
        if (!extensionSocket || extensionSocket.readyState !== ws_1.WebSocket.OPEN) {
            return {
                ok: false,
                message: 'No extension connected via WebSocket.'
            };
        }
        extensionSocket.send(JSON.stringify(command));
        return {
            ok: true,
            message: `Sent ${command.command} command to extension.`
        };
    }
    function goToUrl(url) {
        return sendCommand({
            id: crypto.randomUUID(),
            command: 'NAVIGATE',
            url,
            waitForLoad: true
        });
    }
    BrowserRepo.goToUrl = goToUrl;
    function grabHtmlBody() {
        return sendCommand({
            id: crypto.randomUUID(),
            command: 'SCRAPE_PAGE'
        });
    }
    BrowserRepo.grabHtmlBody = grabHtmlBody;
    function clickElement(selector) {
        return sendCommand({
            id: crypto.randomUUID(),
            command: 'CLICK_ELEMENT',
            selector
        });
    }
    BrowserRepo.clickElement = clickElement;
    function getElementContent(selector) {
        return {
            ok: false,
            message: `Unsupported simplified command: getElementContent for selector ${selector}.`
        };
    }
    BrowserRepo.getElementContent = getElementContent;
    async function analyzeAndProceed(url, _html) {
        const analysis = await analizer_repo_1.AnalizerRepo.AnalizePage(url, _html);
        if (analysis.isLinkedInProfile) {
            console.log('Target profile HTML received. Ready for analysis.');
            return;
        }
        const response = sendCommand({
            id: crypto.randomUUID(),
            command: 'CLICK_ELEMENT',
            selector: "button[aria-label*='About']"
        });
        if (!response.ok) {
            console.error(response.message);
        }
    }
    function StartBridgeServer(app, PORT) {
        app.post('/api/upload-html', async (req, res) => {
            const { url, html } = req.body;
            console.log(`Received HTML from: ${url} (${(html.length / 1024).toFixed(2)} KB)`);
            await analyzeAndProceed(url, html);
            res.json({ status: 'processing' });
        });
        console.log(`HTML upload endpoint on http://localhost:${PORT}/api/upload-html`);
        if (!webSocketServer) {
            webSocketServer = new ws_1.WebSocketServer({ port: 8080 });
            console.log('WebSocket command bridge  on ws://localhost:8080');
            webSocketServer.on('connection', (socket) => {
                console.log('Extension connected via WebSocket.');
                extensionSocket = socket;
                socket.on('message', (message) => {
                    try {
                        const payload = JSON.parse(message.toString());
                        if (isHeartbeatMessage(payload)) {
                            lastHeartbeatAt = payload.timestamp;
                            return;
                        }
                        console.log('Extension response:', payload);
                    }
                    catch {
                        console.log('Extension sent a non-JSON message:', message.toString());
                    }
                });
                socket.on('close', (code, reasonBuffer) => {
                    if (extensionSocket === socket) {
                        extensionSocket = null;
                    }
                    const reason = reasonBuffer?.toString() || '';
                    console.log(`Extension WebSocket disconnected (code ${code})${reason ? `: ${reason}` : '.'}`);
                });
                socket.on('error', (error) => {
                    console.error('Extension WebSocket error:', error.message);
                });
            });
            webSocketServer.on('error', (error) => {
                console.error('WebSocket bridge server error:', error.message);
            });
        }
    }
    BrowserRepo.StartBridgeServer = StartBridgeServer;
})(BrowserRepo || (exports.BrowserRepo = BrowserRepo = {}));
//# sourceMappingURL=browser.repo.js.map