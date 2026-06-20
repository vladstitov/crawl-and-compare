import express, { Request, Response } from 'express';
import path from 'path';
import './core/database';
import { BrowserRepo } from './repos/browser.repo';
import { WebCrawlerController } from './controllers/web-crawler.cotroller';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.static(path.resolve(process.cwd(), 'public')));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server is running!' });
});


app.get('/go-to-url', (req: Request, res: Response) => {
  const { url } = req.query;
  if (typeof url !== 'string') {
    res.status(400).json({ message: 'Invalid URL' });
    return;
  }
  const response = BrowserRepo.goToUrl(url);
  res.json(response);
});

app.post('/crawl/start', async (_req: Request, res: Response) => {
  try {
    const result = await WebCrawlerController.Start();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to start crawl.'
    });
  }
});
BrowserRepo.StartBridgeServer(app, PORT);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

});
