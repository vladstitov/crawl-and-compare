import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface JobTag {
  tag: string;
  text: string;
}

export interface JobDocument {
  _id?: string;
  reference?: string;
  name?: string;
  title?: string | null;
  url?: string;
  sourceName?: string;
  htmlPage?: string | null;
  htmlData?: unknown;
  hasTags?: JobTag[];
  status?: string | null;
  workflow?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateTaskRequest {
  name: string;
  url: string;
  workflow: string;
  hasTags: JobTag[];
}

export interface ApiResultResponse<T> {
  ok: boolean;
  result: T;
  message?: string;
}

export interface CreateTaskResponse {
  message: string;
  task: JobDocument;
}

@Injectable({
  providedIn: 'root'
})
export class ServerApiService {
  constructor(private readonly http: HttpClient) {}

  private mapResult<T>(response: ApiResultResponse<T>): T {
    return response.result;
  }

  createTask(payload: CreateTaskRequest): Observable<CreateTaskResponse> {
    return this.http.post<CreateTaskResponse>('/api/create-task', payload);
  }

  goToUrl(url: string): Observable<unknown> {
    const params = new HttpParams().set('url', url);
    return this.http
      .get<ApiResultResponse<unknown>>('/api/go-to-url', { params })
      .pipe(map((response) => this.mapResult(response)));
  }

  crawlStart(): Observable<unknown> {
    return this.http
      .get<ApiResultResponse<unknown>>('/api/crawl-start')
      .pipe(map((response) => this.mapResult(response)));
  }

  crawlStop(): Observable<unknown> {
    return this.http
      .get<ApiResultResponse<unknown>>('/api/crawl-stop')
      .pipe(map((response) => this.mapResult(response)));
  }

  crawlStatus(): Observable<unknown> {
    return this.http
      .get<ApiResultResponse<unknown>>('/api/crawl-status')
      .pipe(map((response) => this.mapResult(response)));
  }

  getJobs(): Observable<JobDocument[]> {
    return this.http
      .get<ApiResultResponse<JobDocument[]>>('/api/jobs')
      .pipe(map((response) => this.mapResult(response)));
  }

  getJob(id: string): Observable<JobDocument | null> {
    const params = new HttpParams().set('id', id);
    return this.http
      .get<ApiResultResponse<JobDocument | null>>('/api/job', { params })
      .pipe(map((response) => this.mapResult(response)));
  }

  updateJob(id: string, updates: Partial<JobDocument>): Observable<number> {
    const params = new HttpParams().set('id', id);
    const { _id, ...safeUpdates } = updates;
    void _id;

    return this.http
      .put<ApiResultResponse<number>>('/api/jobs', safeUpdates, { params })
      .pipe(map((response) => this.mapResult(response)));
  }

  deleteJob(id: string): Observable<number> {
    const params = new HttpParams().set('id', id);
    return this.http
      .delete<ApiResultResponse<number>>('/api/jobs', { params })
      .pipe(map((response) => this.mapResult(response)));
  }
}
