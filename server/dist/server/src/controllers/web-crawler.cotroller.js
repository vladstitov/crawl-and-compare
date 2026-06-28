"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebCrawlerController = void 0;
const analizer_repo_1 = require("../repos/analizer.repo");
const database_1 = require("../core/database");
const browser_repo_1 = require("../repos/browser.repo");
var WebCrawlerController;
(function (WebCrawlerController) {
    let isCrawling = false;
    let stopSignal = false;
    let current_id = null;
    let currentTask = null;
    async function scrapeById(_id) {
        if (stopSignal) {
            return { ok: false, message: 'Crawler is stopped.', _id };
        }
        currentTask = 'scrape';
        current_id = _id;
        isCrawling = true;
        const scrapeResult = await browser_repo_1.BrowserRepo.scrapeHtmlAndSave(_id);
        isCrawling = false;
        currentTask = null;
        return { ok: scrapeResult.ok, message: scrapeResult.message, _id };
    }
    async function navigateByJob(job) {
        if (stopSignal) {
            return { ok: false, message: 'Crawler is stopped.', _id: job._id };
        }
        if (!job.url) {
            return { ok: false, message: 'Job url is empty.', _id: job._id };
        }
        currentTask = 'navigate';
        current_id = job._id;
        isCrawling = true;
        const command = {
            _id: job._id,
            command: 'NAVIGATE',
            url: job.url,
            waitForLoad: true
        };
        const navigateResponse = browser_repo_1.BrowserRepo.sendNavigateCommand(command);
        if (!navigateResponse.ok) {
            await database_1.jobsCollection.updateAsync({ _id: command._id }, {
                $set: {
                    status: 'failed',
                    statusMassage: `current url ${job.url}. NAVIGATE command was not sent: ${navigateResponse.message}`,
                    updatedAt: new Date()
                }
            });
            isCrawling = false;
            currentTask = null;
            return { ok: false, message: navigateResponse.message, _id: command._id };
        }
        const navigateAck = await browser_repo_1.BrowserRepo.waitForCommandResponse(command._id, 'NAVIGATE');
        if (!navigateAck) {
            await database_1.jobsCollection.updateAsync({ _id: command._id }, {
                $set: {
                    status: 'failed',
                    statusMassage: `current url ${job.url}. NAVIGATE acknowledgement was not received from extension.`,
                    updatedAt: new Date()
                }
            });
            isCrawling = false;
            currentTask = null;
            return { ok: false, message: 'No NAVIGATE acknowledgement received from extension.', _id: command._id };
        }
        if (!navigateAck.ok) {
            await database_1.jobsCollection.updateAsync({ _id: command._id }, {
                $set: {
                    status: 'failed',
                    statusMassage: `current url ${job.url}. NAVIGATE failed in extension: ${navigateAck.error ?? 'Unknown error'}.`,
                    updatedAt: new Date()
                }
            });
            isCrawling = false;
            currentTask = null;
            return { ok: false, message: navigateAck.error ?? 'NAVIGATE failed in extension.', _id: command._id };
        }
        await database_1.jobsCollection.updateAsync({ _id: command._id }, {
            $set: {
                status: 'running',
                statusMassage: `current url ${job.url}. NAVIGATE completed, waiting for SCRAPE_PAGE.`,
                updatedAt: new Date()
            }
        });
        isCrawling = false;
        currentTask = null;
        return { ok: true, message: 'Navigation command sent.', _id: command._id };
    }
    async function Start() {
        if (isCrawling) {
            return {
                ok: false,
                message: 'Crawler is already running.',
                status: currentStatus()
            };
        }
        stopSignal = false;
        const job = await database_1.jobsCollection.findOneAsync({
            workflow: { $ne: 'complete' },
            url: { $exists: true, $ne: null }
        });
        if (!job?._id) {
            return { ok: false, message: 'No pending jobs with a URL found.' };
        }
        if (job.htmlPage) {
            return { ok: true, message: 'Job already has HTML downloaded.', _id: job._id };
        }
        const navigateResult = await navigateByJob({ _id: job._id, url: job.url });
        if (!navigateResult.ok) {
            return {
                ok: false,
                message: `Navigate failed: ${navigateResult.message}`,
                _id: job._id
            };
        }
        const scrapeResult = await browser_repo_1.BrowserRepo.scrapeHtmlAndSave(job._id, 10000);
        return {
            ok: scrapeResult.ok,
            message: scrapeResult.message,
            _id: job._id
        };
    }
    WebCrawlerController.Start = Start;
    function currentStatus() {
        return {
            isCrawling,
            currentTask,
            current_id
        };
    }
    WebCrawlerController.currentStatus = currentStatus;
    function Stop() {
        stopSignal = true;
        isCrawling = false;
        currentTask = null;
        return currentStatus();
    }
    WebCrawlerController.Stop = Stop;
    async function ProcessPage(pageData) {
        console.log(`Processing page: ${pageData.url}`);
        const analysis = await analizer_repo_1.AnalizerRepo.AnalizePage(pageData);
        console.log('Page analysis result:', analysis);
        return analysis;
    }
    WebCrawlerController.ProcessPage = ProcessPage;
})(WebCrawlerController || (exports.WebCrawlerController = WebCrawlerController = {}));
//# sourceMappingURL=web-crawler.cotroller.js.map