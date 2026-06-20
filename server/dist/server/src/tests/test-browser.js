"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const browser_repo_1 = require("../repos/browser.repo");
async function runBrowserTest() {
    console.log('Sending goToUrl command to extension...');
    const result = await browser_repo_1.BrowserRepo.goToUrl('https://ca.indeed.com/');
    console.log('Result:', result);
}
runBrowserTest().catch(console.error);
//# sourceMappingURL=test-browser.js.map