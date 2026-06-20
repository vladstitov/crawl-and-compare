import { NavigateCommand, ScrapePageCommand } from '../../../shared/interfaces';
import { AnalizerRepo } from '../repos/analizer.repo';
import { jobsCollection } from '../core/database';
import { BrowserRepo } from '../repos/browser.repo';

export namespace WebCrawlerController {
    let isRunning = false;
    let stopSignal = false;
    const START_URL = 'https://ca.indeed.com/';

    const tasks = [
        { navigateToURL: 'https://ca.indeed.com/'},
        { },

       
        // Add more tasks as needed
    ];

    async function waitForDownloadedStatus(_id: string, timeoutMs = 120000, pollMs = 1000): Promise<void> {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            const doc = await jobsCollection.findOneAsync({ _id });

            if (doc?.status === 'downloaded') {
                return;
            }

            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), pollMs);
            });
        }

        throw new Error(`Timed out waiting for command ${_id} to reach status downloaded.`);
    }

    export async function Start() {
        if (isRunning) {
            console.log('Web crawler is already running.');
            return;
        }
        isRunning = true;
        stopSignal = false;
        console.log('Web crawler started.');

        const createdJob = await jobsCollection.insertAsync({
            reference: 'crawl:pending',
            title: 'Indeed Start Page Crawl',
            url: START_URL,
            sourceName: 'ca.indeed.com',
            htmlPage: '',
            htmlData: null,
            hasTags: [],
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        if (!createdJob._id) {
            isRunning = false;
            throw new Error('Database did not return _id for created crawl command.');
        }

        const command: NavigateCommand = {
            _id: createdJob._id,
            command: 'NAVIGATE',
            url: START_URL,
            waitForLoad: true
        };

   

        const navigateResponse = BrowserRepo.sendNavigateCommand(command);
        if (!navigateResponse.ok) {
            await jobsCollection.updateAsync(
                { _id: command._id },
                {
                    $set: {
                        status: 'failed',
                        updatedAt: new Date()
                    }
                }
            );
            isRunning = false;
            throw new Error(navigateResponse.message);
        }

        await jobsCollection.updateAsync(
            { _id: command._id },
            {
                $set: {
                    status: 'running',
                    updatedAt: new Date()
                }
            }
        );

        const scrapeResponse = BrowserRepo.sendScrapeCommand({
            _id: command._id,
            command: 'SCRAPE_PAGE'
        });

        if (!scrapeResponse.ok) {
            await jobsCollection.updateAsync(
                { _id: command._id },
                {
                    $set: {
                        status: 'failed',
                        updatedAt: new Date()
                    }
                }
            );
            isRunning = false;
            throw new Error(scrapeResponse.message);
        }

        await waitForDownloadedStatus(command._id);
        isRunning = false;
        return { _id: command._id, status: 'downloaded' as const };


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





   export  async function ProcessPage(pageData: ScrapePageCommand) {
        console.log(`Processing page: ${pageData.url}`);
        const analysis = await AnalizerRepo.AnalizePage(pageData);
        
        console.log('Page analysis result:', analysis);
        return analysis;
    }

}