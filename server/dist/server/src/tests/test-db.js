"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../core/database");
function generateRandomHtmlPage() {
    const randomId = Math.random().toString(36).slice(2, 10);
    const randomHex = Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0');
    const randomTimestamp = new Date().toISOString();
    return [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '  <meta charset="UTF-8" />',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        `  <title>Random Job ${randomId}</title>`,
        '  <style>',
        `    body { font-family: Arial, sans-serif; background: #${randomHex}; color: #111; }`,
        '    .card { max-width: 680px; margin: 32px auto; background: #fff; padding: 24px; border-radius: 12px; }',
        '  </style>',
        '</head>',
        '<body>',
        '  <div class="card">',
        `    <h1>Generated Job ${randomId}</h1>`,
        `    <p>Generated at: ${randomTimestamp}</p>`,
        '  </div>',
        '</body>',
        '</html>'
    ].join('\n');
}
async function runDbTest() {
    /*
    const htmlPage = generateRandomHtmlPage();
  
    const insertedJob = await jobsCollection.insertAsync<JobDocument>({
      status: 'pending',
      title: `job-${Date.now()}`,
      url: `https://example.com/jobs/${Date.now()}`,
      sourceName: 'example-source',
      htmlPage
    });
    */
    const allJobs = await database_1.jobsCollection.findAsync({});
    console.log('All documents from jobs collection:');
    console.log(allJobs);
}
runDbTest().catch((error) => {
    console.error('Failed to run DB test:', error);
    process.exitCode = 1;
});
//# sourceMappingURL=test-db.js.map