"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebCrawlerController = void 0;
const analizer_repo_1 = require("../repos/analizer.repo");
var WebCrawlerController;
(function (WebCrawlerController) {
    let isRunning = false;
    let stopSignal = false;
    function Start() {
        if (isRunning) {
            console.log('Web crawler is already running.');
            return;
        }
        isRunning = true;
        stopSignal = false;
        console.log('Web crawler started.');
    }
    WebCrawlerController.Start = Start;
    function Stop() {
        stopSignal = true;
    }
    async function CrawlerLoop() {
        if (stopSignal) {
            console.log('Web crawler stopping...');
            isRunning = false;
            return;
        }
    }
    async function ProcessPage(url, html) {
        console.log(`Processing page: ${url}`);
        const analysis = await analizer_repo_1.AnalizerRepo.AnalizePage(url, html);
        console.log('Page analysis result:', analysis);
    }
})(WebCrawlerController || (exports.WebCrawlerController = WebCrawlerController = {}));
//# sourceMappingURL=web-crawler.cotroller.js.map