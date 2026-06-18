import { CromeBrowser } from '../repos/chrome-browser';

function runBrowserTest(): void {
  CromeBrowser.OpenBrowser('https://ca.indeed.com/');

}

runBrowserTest();
