import express, { Request, Response } from 'express';
import path from 'path';
import './core/database';
import { BrowserRepo } from './repos/browser.repo';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server is running!' });
});

BrowserRepo.StartSocketServer(app, PORT);
