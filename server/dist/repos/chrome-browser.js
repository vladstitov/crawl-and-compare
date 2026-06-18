"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CromeBrowser = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
var CromeBrowser;
(function (CromeBrowser) {
    function OpenBrowser(url = 'https://www.google.com') {
        const chromeCandidates = [
            process.env['ProgramFiles']
                ? `${process.env['ProgramFiles']}\\Google\\Chrome\\Application\\chrome.exe`
                : undefined,
            process.env['ProgramFiles(x86)']
                ? `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`
                : undefined,
            process.env['LOCALAPPDATA']
                ? `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`
                : undefined,
            'chrome'
        ].filter((candidate) => Boolean(candidate));
        for (const chromePath of chromeCandidates) {
            if (chromePath === 'chrome' || (0, fs_1.existsSync)(chromePath)) {
                const child = (0, child_process_1.spawn)(chromePath, [url], {
                    detached: true,
                    stdio: 'ignore',
                    shell: false
                });
                child.unref();
                console.log(`Opened Chrome with ${url}`);
                return;
            }
        }
        throw new Error('Google Chrome executable was not found on this machine.');
    }
    CromeBrowser.OpenBrowser = OpenBrowser;
})(CromeBrowser || (exports.CromeBrowser = CromeBrowser = {}));
//# sourceMappingURL=chrome-browser.js.map