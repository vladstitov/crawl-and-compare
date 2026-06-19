"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserRepo = void 0;
var BrowserRepo;
(function (BrowserRepo) {
    function health() {
        return {
            ok: true,
            message: 'Browser repo namespace is ready.'
        };
    }
    BrowserRepo.health = health;
    function createRequestId() {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    function StartBridgeServer(app, port) {
        const pendingCommands = [];
        const commandWaiters = [];
        const pendingResults = new Map();
        function enqueueCommand(command) {
            const envelope = {
                type: 'browser:command',
                requestId: createRequestId(),
                command
            };
            const waitingCommand = commandWaiters.shift();
            if (waitingCommand) {
                clearTimeout(waitingCommand.timer);
                waitingCommand.resolve(envelope);
                return envelope;
            }
            pendingCommands.push(envelope);
            return envelope;
        }
        function waitForNextCommand(waitMs) {
            const queuedCommand = pendingCommands.shift();
            if (queuedCommand) {
                return Promise.resolve(queuedCommand);
            }
            return new Promise((resolve) => {
                const timer = setTimeout(() => {
                    const index = commandWaiters.findIndex((waiter) => waiter.timer === timer);
                    if (index >= 0) {
                        commandWaiters.splice(index, 1);
                    }
                    resolve(null);
                }, waitMs);
                commandWaiters.push({ resolve, timer });
            });
        }
        function waitForResult(requestId, timeoutMs = 30000) {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pendingResults.delete(requestId);
                    reject(new Error(`Timed out waiting for ${requestId} to finish.`));
                }, timeoutMs);
                pendingResults.set(requestId, { resolve, reject, timer });
            });
        }
        function resolveResult(result) {
            const pending = pendingResults.get(result.requestId);
            if (!pending) {
                return;
            }
            clearTimeout(pending.timer);
            pendingResults.delete(result.requestId);
            pending.resolve(result);
        }
        app.post('/bridge/command', async (req, res) => {
            const command = req.body;
            if (!command?.action) {
                res.status(400).json({ ok: false, message: 'Missing command action.' });
                return;
            }
            const envelope = enqueueCommand(command);
            const resultPromise = waitForResult(envelope.requestId);
            try {
                const result = await resultPromise;
                res.json(result);
            }
            catch (error) {
                res.status(504).json({
                    ok: false,
                    message: error instanceof Error ? error.message : 'Command timed out.'
                });
            }
        });
        app.get('/bridge/command/next', (req, res) => {
            const waitMs = Number(req.query.waitMs ?? 30000);
            waitForNextCommand(Number.isFinite(waitMs) && waitMs > 0 ? waitMs : 30000)
                .then((command) => {
                if (!command) {
                    res.status(204).end();
                    return;
                }
                res.json(command);
            })
                .catch((error) => {
                res.status(500).json({
                    ok: false,
                    message: error instanceof Error ? error.message : 'Failed to fetch next command.'
                });
            });
        });
        app.post('/bridge/result', (req, res) => {
            const result = req.body;
            if (!result?.requestId || !result.action) {
                res.status(400).json({ ok: false, message: 'Missing command result fields.' });
                return;
            }
            resolveResult(result);
            res.json({ ok: true });
        });
        app.post('/bridge/event', (req, res) => {
            const event = {
                type: 'bridge:event',
                at: new Date().toISOString(),
                payload: req.body
            };
            console.log('Received bridge event:', event);
            res.json({ ok: true });
        });
        app.post('/bridge/publish', (req, res) => {
            const event = {
                type: 'bridge:event',
                at: new Date().toISOString(),
                payload: req.body
            };
            console.log('Received bridge publish:', event);
            res.json({ ok: true });
        });
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
            console.log(`Bridge HTTP endpoints are running on http://localhost:${port}/bridge`);
        });
    }
    BrowserRepo.StartBridgeServer = StartBridgeServer;
})(BrowserRepo || (exports.BrowserRepo = BrowserRepo = {}));
//# sourceMappingURL=browser.repo.js.map