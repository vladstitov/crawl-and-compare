import express, { Request, Response } from 'express';
import path from 'path';
import './core/database';
import { BrowserRepo } from './repos/browser.repo';

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
BrowserRepo.StartBridgeServer(app, PORT);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

});
