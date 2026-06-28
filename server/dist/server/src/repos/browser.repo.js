"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserRepo = void 0;
const ws_1 = require("ws");
const analizer_repo_1 = require("./analizer.repo");
const database_1 = require("../core/database");
var BrowserRepo;
(function (BrowserRepo) {
    let extensionSocket = null;
    let webSocketServer = null;
    let lastHeartbeatAt = null;
    const commandResponses = new Map();
    function isEventLog(value) {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const payload = value;
        return payload.from === 'background' || payload.from === 'content_script';
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
    function makeResponseKey(_id, command) {
        return `${_id}:${command}`;
    }
    function isCommandName(value) {
        return value === 'NAVIGATE' || value === 'SCRAPE_PAGE' || value === 'CLICK_ELEMENT';
    }
    async function setJobFailed(_id) {
        await database_1.jobsCollection.updateAsync({ _id }, {
            $set: {
                status: 'failed',
                updatedAt: new Date()
            }
        });
    }
    async function waitForDownloadedStatus(_id, timeoutMs = 120000, pollMs = 1000) {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            const doc = await database_1.jobsCollection.findOneAsync({ _id });
            if (doc?.status === 'downloaded') {
                return;
            }
            await new Promise((resolve) => {
                setTimeout(() => resolve(), pollMs);
            });
        }
        throw new Error(`Timed out waiting for command ${_id} to reach status downloaded.`);
    }
    async function waitForCommandResponse(_id, command, timeoutMs = 30000, pollMs = 100) {
        const key = makeResponseKey(_id, command);
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            const response = commandResponses.get(key);
            if (response) {
                commandResponses.delete(key);
                return response;
            }
            await new Promise((resolve) => {
                setTimeout(() => resolve(), pollMs);
            });
        }
        return null;
    }
    BrowserRepo.waitForCommandResponse = waitForCommandResponse;
    function sendNavigateCommand(command) {
        return sendCommand(command);
    }
    BrowserRepo.sendNavigateCommand = sendNavigateCommand;
    function sendScrapeCommand(command) {
        return sendCommand(command);
    }
    BrowserRepo.sendScrapeCommand = sendScrapeCommand;
    async function scrapeHtmlAndSave(_id, timeoutMs = 120000) {
        const scrapeResponse = sendScrapeCommand({
            _id,
            command: 'SCRAPE_PAGE'
        });
        if (!scrapeResponse.ok) {
            await setJobFailed(_id);
            return { ok: false, message: scrapeResponse.message };
        }
        const scrapeAck = await waitForCommandResponse(_id, 'SCRAPE_PAGE');
        if (!scrapeAck) {
            await setJobFailed(_id);
            return { ok: false, message: 'No SCRAPE_PAGE acknowledgement received from extension.' };
        }
        if (!scrapeAck.ok) {
            await setJobFailed(_id);
            return { ok: false, message: scrapeAck.error ?? 'SCRAPE_PAGE failed in extension.' };
        }
        try {
            await waitForDownloadedStatus(_id, timeoutMs);
            return { ok: true, message: 'Scrape completed and persisted in database.' };
        }
        catch {
            await database_1.jobsCollection.updateAsync({ _id }, { $set: { status: 'timeout', updatedAt: new Date() } });
            return { ok: false, message: `Timed out after ${timeoutMs}ms waiting for page data to be saved.` };
        }
    }
    BrowserRepo.scrapeHtmlAndSave = scrapeHtmlAndSave;
    function goToUrl(_id, url) {
        return sendCommand({
            _id,
            command: 'NAVIGATE',
            url,
            waitForLoad: true
        });
    }
    BrowserRepo.goToUrl = goToUrl;
    function grabHtmlBody(_id) {
        return sendCommand({
            _id,
            command: 'SCRAPE_PAGE'
        });
    }
    BrowserRepo.grabHtmlBody = grabHtmlBody;
    function clickElement(_id, selector) {
        return sendCommand({
            _id,
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
    function StartBridgeServer(app, PORT) {
        app.post('/api/upload-html', async (req, res) => {
            const data = req.body;
            const analysis = await analizer_repo_1.AnalizerRepo.AnalizePage(data);
            if (analysis._id) {
                await database_1.jobsCollection.updateAsync({ _id: analysis._id }, {
                    $set: {
                        ...analysis,
                        status: 'downloaded',
                        updatedAt: new Date()
                    }
                });
            }
            res.json({ status: 'PASSED', _id: data._id });
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
                        if (isEventLog(payload)) {
                            console.log('Extension response:', payload);
                            return;
                        }
                        const _id = typeof payload._id === 'string' ? payload._id : undefined;
                        const command = isCommandName(payload.command) ? payload.command : undefined;
                        const ok = typeof payload.ok === 'boolean' ? payload.ok : undefined;
                        if (_id && command && typeof ok === 'boolean') {
                            commandResponses.set(makeResponseKey(_id, command), {
                                ok,
                                _id,
                                command,
                                data: payload.data,
                                error: typeof payload.error === 'string' ? payload.error : undefined
                            });
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