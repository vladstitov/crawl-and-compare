"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
require("./core/database");
const browser_repo_1 = require("./repos/browser.repo");
const web_crawler_cotroller_1 = require("./controllers/web-crawler.cotroller");
const database_1 = require("./core/database");
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.resolve(process.cwd(), 'public')));
app.post('/api/create-task', async (req, res) => {
    const task = req.body;
    const createdJob = await database_1.jobsCollection.insertAsync({
        reference: `tasks:${task.name}`,
        name: task.name,
        title: null,
        url: task.url,
        sourceName: 'manual',
        htmlPage: null,
        htmlData: null,
        hasTags: task.hasTags,
        status: null,
        statusMassage: null,
        workflow: task.workflow,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    res.json({ message: 'Task created successfully!', task: createdJob });
});
app.get('/api/go-to-url', (req, res) => {
    const { url, id } = req.query;
    if (typeof url !== 'string') {
        res.status(400).json({ ok: false, message: 'Invalid URL' });
        return;
    }
    if (typeof id !== 'string') {
        res.status(400).json({ ok: false, message: 'Job id is required' });
        return;
    }
    const result = browser_repo_1.BrowserRepo.goToUrl(id, url);
    res.json({ ok: true, result });
});
app.get('/api/crawl-start', async (_req, res) => {
    const result = await web_crawler_cotroller_1.WebCrawlerController.Start();
    const isOk = typeof result === 'object' && result !== null && 'ok' in result
        ? Boolean(result.ok)
        : true;
    if (!isOk) {
        res.status(400).json({ ok: false, result });
        return;
    }
    res.json({ ok: true, result });
});
app.get('/api/crawl-stop', async (_req, res) => {
    const result = await web_crawler_cotroller_1.WebCrawlerController.Stop();
    res.json({ ok: true, result });
});
app.get('/api/crawl-status', async (_req, res) => {
    const result = await web_crawler_cotroller_1.WebCrawlerController.currentStatus();
    res.json({ ok: true, result });
});
app.get('/api/jobs', async (_req, res) => {
    try {
        const jobs = await database_1.jobsCollection.findAsync({});
        res.json({ ok: true, result: jobs });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch jobs';
        res.status(500).json({ ok: false, message });
    }
});
app.get('/api/job', async (req, res) => {
    const id = req.query.id;
    if (!id) {
        res.status(400).json({ ok: false, message: 'Job id is required' });
        return;
    }
    try {
        const job = await database_1.jobsCollection.findOneAsync({ _id: id });
        res.json({ ok: true, result: job });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch job';
        res.status(500).json({ ok: false, message });
    }
});
app.put('/api/jobs', async (req, res) => {
    const id = req.query.id;
    const updates = req.body;
    if (!id) {
        res.status(400).json({ ok: false, message: 'Job id is required' });
        return;
    }
    try {
        delete updates._id; // Prevent updating the _id field
        const updatedCount = await database_1.jobsCollection.updateAsync({ _id: id }, {
            $set: {
                ...updates,
                updatedAt: new Date()
            }
        });
        res.json({ ok: true, result: updatedCount });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update job';
        res.status(500).json({ ok: false, message });
    }
});
app.delete('/api/jobs', async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) {
            res.status(400).json({ ok: false, message: 'Job id is required' });
            return;
        }
        const deletedCount = await database_1.jobsCollection.removeAsync({ _id: id }, {});
        res.json({ ok: true, result: deletedCount });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete job';
        res.status(500).json({ ok: false, message });
    }
});
browser_repo_1.BrowserRepo.StartBridgeServer(app, PORT);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map