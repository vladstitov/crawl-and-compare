import { createNeDbConnector } from './nedb.connector';

export interface JobDocument extends Record<string, unknown> {
  _id?: string;
  reference: string;
  title: string;
  url: string;
  sourceName: string;
  htmlPage: string;
  htmlData: any;
  hasTags: {tag: string, text: string}[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'downloaded';
  createdAt?: Date;
  updatedAt?: Date;
}

export const jobsCollection = createNeDbConnector<JobDocument>({
  filename: 'jobs.db'
});
