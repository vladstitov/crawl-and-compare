"use strict";
async function runBrowserTest() {
    const targetUrl = 'https://ca.indeed.com/';
    const endpoint = `http://localhost:3000/go-to-url?url=${encodeURIComponent(targetUrl)}`;
    console.log('Calling /go-to-url endpoint...');
    const response = await fetch(endpoint);
    const result = (await response.json());
    console.log('Status:', response.status);
    console.log('Result:', result);
}
runBrowserTest().catch(console.error);
//# sourceMappingURL=test-browser.js.map