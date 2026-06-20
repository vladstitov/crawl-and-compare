

import { BrowserRepo } from '../repos/browser.repo';

async function runBrowserTest(): Promise<void> {
  console.log('Sending goToUrl command to extension...');

  const result = await BrowserRepo.goToUrl('https://ca.indeed.com/');

  console.log('Result:', result);
}

runBrowserTest().catch(console.error);
