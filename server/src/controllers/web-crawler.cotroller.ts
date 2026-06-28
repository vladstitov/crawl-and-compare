import { NavigateCommand, ScrapePageCommand } from '../../../shared/interfaces';
import { AnalizerRepo } from '../repos/analizer.repo';
import { jobsCollection } from '../core/database';
import { BrowserRepo } from '../repos/browser.repo';

export namespace WebCrawlerController {
    let isCrawling = false;
    let stopSignal = false;
    let current_id: string | null = null;
    let currentTask: string | null = null;

    interface CrawlStepResult {
        ok: boolean;
        message: string;
        _id?: string;
    }



    async function scrapeById(_id: string): Promise<CrawlStepResult> {
        if (stopSignal) {
            return { ok: false, message: 'Crawler is stopped.', _id };
        }

        currentTask = 'scrape';
        current_id = _id;
        isCrawling = true;

        const scrapeResult = await BrowserRepo.scrapeHtmlAndSave(_id);

        isCrawling = false;
        currentTask = null;
        return { ok: scrapeResult.ok, message: scrapeResult.message, _id };
    }

    async function navigateByJob(job: { _id: string; url?: string | null }): Promise<CrawlStepResult> {
        if (stopSignal) {
            return { ok: false, message: 'Crawler is stopped.', _id: job._id };
        }

        if (!job.url) {
            return { ok: false, message: 'Job url is empty.', _id: job._id };
        }

        currentTask = 'navigate';
        current_id = job._id;
        isCrawling = true;

        const command: NavigateCommand = {
            _id: job._id,
            command: 'NAVIGATE',
            url: job.url,
            waitForLoad: true
        };

        const navigateResponse = BrowserRepo.sendNavigateCommand(command);
        if (!navigateResponse.ok) {
            await jobsCollection.updateAsync(
                { _id: command._id },
                {
                    $set: {
                        status: 'failed',
                        statusMassage: `current url ${job.url}. NAVIGATE command was not sent: ${navigateResponse.message}`,
                        updatedAt: new Date()
                    }
                }
            );

            isCrawling = false;
            currentTask = null;
            return { ok: false, message: navigateResponse.message, _id: command._id };
        }

        const navigateAck = await BrowserRepo.waitForCommandResponse(command._id, 'NAVIGATE');
        if (!navigateAck) {
            await jobsCollection.updateAsync(
                { _id: command._id },
                {
                    $set: {
                        status: 'failed',
                        statusMassage: `current url ${job.url}. NAVIGATE acknowledgement was not received from extension.`,
                        updatedAt: new Date()
                    }
                }
            );
            isCrawling = false;
            currentTask = null;
            return { ok: false, message: 'No NAVIGATE acknowledgement received from extension.', _id: command._id };
        }

        if (!navigateAck.ok) {
            await jobsCollection.updateAsync(
                { _id: command._id },
                {
                    $set: {
                        status: 'failed',
                        statusMassage: `current url ${job.url}. NAVIGATE failed in extension: ${navigateAck.error ?? 'Unknown error'}.`,
                        updatedAt: new Date()
                    }
                }
            );
            isCrawling = false;
            currentTask = null;
            return { ok: false, message: navigateAck.error ?? 'NAVIGATE failed in extension.', _id: command._id };
        }

        await jobsCollection.updateAsync(
            { _id: command._id },
            {
                $set: {
                    status: 'running',
                    statusMassage: `current url ${job.url}. NAVIGATE completed, waiting for SCRAPE_PAGE.`,
                    updatedAt: new Date()
                }
            }
        );

        isCrawling = false;
        currentTask = null;
        return { ok: true, message: 'Navigation command sent.', _id: command._id };
    }

    export async function Start() {
        if (isCrawling) {
            return {
                ok: false,
                message: 'Crawler is already running.',
                status: currentStatus()
            };
        }

        stopSignal = false;

        const job = await jobsCollection.findOneAsync({
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

        const scrapeResult = await BrowserRepo.scrapeHtmlAndSave(job._id, 10000);
        return {
            ok: scrapeResult.ok,
            message: scrapeResult.message,
            _id: job._id
        };
    }


    export function currentStatus() {
        return {
            isCrawling,
            currentTask,
            current_id
        };
    }
    export function Stop() {
        stopSignal = true;
        isCrawling = false;
        currentTask = null;
        return currentStatus();

    }

  
   export  async function ProcessPage(pageData: ScrapePageCommand) {
        console.log(`Processing page: ${pageData.url}`);
        const analysis = await AnalizerRepo.AnalizePage(pageData);
        
        console.log('Page analysis result:', analysis);
        return analysis;
    }

}