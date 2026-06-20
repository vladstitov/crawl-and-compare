import { AnalizerRepo } from '../repos/analizer.repo';

export namespace WebCrawlerController {
    let isRunning = false;
    let stopSignal = false;

    const tasks = [
        { navigateToURL: 'https://www.linkedin.com/in/john-doe/'},
        { },

        { url: 'https://www.example.com/about', html: '<html>...</html>' },
        // Add more tasks as needed
    ];

    export  function Start() {
        if (isRunning) {
            console.log('Web crawler is already running.');
            return;
        }
        isRunning = true;
        stopSignal = false;
        console.log('Web crawler started.');
    }


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

    async function ProcessPage(url: string, html: string) {
        console.log(`Processing page: ${url}`);
        const analysis = await AnalizerRepo.AnalizePage(url, html);
        console.log('Page analysis result:', analysis);
    }

}