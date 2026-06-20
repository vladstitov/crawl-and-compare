"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserRepo = void 0;
const ws_1 = require("ws");
var BrowserRepo;
(function (BrowserRepo) {
    let extensionSocket = null;
    let webSocketServer = null;
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
        return sendCommand({ command: 'NAVIGATE', url, waitForLoad: true });
    }
    BrowserRepo.goToUrl = goToUrl;
    function grabHtmlBody() {
        return sendCommand({ command: 'SCRAPE_PAGE' });
    }
    BrowserRepo.grabHtmlBody = grabHtmlBody;
    function clickElement(selector) {
        return sendCommand({ command: 'CLICK_ELEMENT', selector });
    }
    BrowserRepo.clickElement = clickElement;
    function getElementContent(selector) {
        return {
            ok: false,
            message: `Unsupported simplified command: getElementContent for selector ${selector}.`
        };
    }
    BrowserRepo.getElementContent = getElementContent;
    function logBridgeStatus(port) {
        console.log(`HTML upload endpoint is running on http://localhost:${port}/api/upload-html`);
        console.log('WebSocket command bridge is running on ws://localhost:8080');
    }
    BrowserRepo.logBridgeStatus = logBridgeStatus;
    function analyzeAndProceed(url, _html) {
        if (url.includes('/in/')) {
            console.log('Target profile HTML received. Ready for analysis.');
            return;
        }
        const response = sendCommand({
            command: 'CLICK_ELEMENT',
            selector: "button[aria-label*='About']"
        });
        if (!response.ok) {
            console.error(response.message);
        }
    }
    function StartBridgeServer(app) {
        app.post('/api/upload-html', (req, res) => {
            const { url, html } = req.body;
            console.log(`Received HTML from: ${url} (${(html.length / 1024).toFixed(2)} KB)`);
            analyzeAndProceed(url, html);
            res.json({ status: 'processing' });
        });
        if (!webSocketServer) {
            webSocketServer = new ws_1.WebSocketServer({ port: 8080 });
            webSocketServer.on('connection', (socket) => {
                console.log('Extension connected via WebSocket.');
                extensionSocket = socket;
                socket.on('message', (message) => {
                    try {
                        const response = JSON.parse(message.toString());
                        console.log('Extension response:', response);
                    }
                    catch {
                        console.log('Extension sent a non-JSON message:', message.toString());
                    }
                });
                socket.on('close', () => {
                    if (extensionSocket === socket) {
                        extensionSocket = null;
                    }
                    console.log('Extension WebSocket disconnected.');
                });
            });
        }
    }
    BrowserRepo.StartBridgeServer = StartBridgeServer;
})(BrowserRepo || (exports.BrowserRepo = BrowserRepo = {}));
//# sourceMappingURL=browser.repo.js.map