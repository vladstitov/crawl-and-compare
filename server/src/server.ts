import express, { Request, Response } from 'express';
import path from 'path';
import './core/database';
import { BrowserRepo } from './repos/browser.repo';
import { WebCrawlerController } from './controllers/web-crawler.cotroller';
import { JobDocument, jobsCollection } from './core/database';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.static(path.resolve(process.cwd(), 'public')));

app.post('/api/create-task', async (req: Request, res: Response) => {
      
  const task: { name: string, url: string, workflow: string, hasTags: {tag: string, text: string}[] } = req.body;

          const createdJob = await jobsCollection.insertAsync({
              reference: `tasks:${task.name}`,
              name: task.name,
              title: null,
              url: task.url,
              sourceName: 'manual',
              htmlPage: null,
              htmlData: null,
              hasTags: task.hasTags,
              status: null,
                statusMassage: null,
              workflow: task.workflow,
              createdAt: new Date(),
              updatedAt: new Date()
          });
  
  res.json({ message: 'Task created successfully!', task: createdJob });
});


app.get('/api/go-to-url', (req: Request, res: Response) => {
  const { url, id } = req.query;
  if (typeof url !== 'string') {
    res.status(400).json({ ok: false, message: 'Invalid URL' });
    return;
  }
  if (typeof id !== 'string') {
    res.status(400).json({ ok: false, message: 'Job id is required' });
    return;
  }
  const result = BrowserRepo.goToUrl(id, url);
  res.json({ ok: true, result });
});

app.get('/api/crawl-start', async (_req: Request, res: Response) => {

    const result = await WebCrawlerController.Start();
    const isOk = typeof result === 'object' && result !== null && 'ok' in result
      ? Boolean((result as { ok?: boolean }).ok)
      : true;

    if (!isOk) {
      res.status(400).json({ ok: false, result });
      return;
    }

    res.json({ ok: true, result });

});
app.get('/api/crawl-stop', async (_req: Request, res: Response) => {
 
    const result = await WebCrawlerController.Stop();
    res.json({ ok: true, result });
 
});

app.get('/api/crawl-status', async (_req: Request, res: Response) => {
 
    const result = await WebCrawlerController.currentStatus();
    res.json({ ok: true, result });
 
});

app.get('/api/jobs', async (_req: Request, res: Response) => {
  try {
    const jobs = await jobsCollection.findAsync({});
    res.json({ ok: true, result:jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch jobs';
    res.status(500).json({ ok: false, message });
  }
});
app.get('/api/job', async (req: Request, res: Response) => {


  const  id = req.query.id as string;
    if (!id) {
      res.status(400).json({ ok: false, message: 'Job id is required' });
      return;
    }


  try {
    const job = await jobsCollection.findOneAsync({ _id: id });
    res.json({ ok: true, result: job });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job';
    res.status(500).json({ ok: false, message });
  }
});

app.put('/api/jobs', async (req: Request, res: Response) => {

  const  id = req.query.id as string;
    const updates = req.body as Partial<JobDocument>;
        
    if (!id) {
      res.status(400).json({ ok: false, message: 'Job id is required' });
      return;
    }


  try {

    delete updates._id; // Prevent updating the _id field
   

    const updatedCount = await jobsCollection.updateAsync(
      { _id: id },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

   res.json({ ok: true, result: updatedCount });
   
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update job';
    res.status(500).json({ ok: false, message });
  }
});

app.delete('/api/jobs', async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;

    if (!id) {
      res.status(400).json({ ok: false, message: 'Job id is required' });
      return;
    }

    const deletedCount = await jobsCollection.removeAsync({ _id: id }, {});

    res.json({ ok: true, result: deletedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete job';
    res.status(500).json({ ok: false, message });
  }
});

BrowserRepo.StartBridgeServer(app, PORT);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

});
