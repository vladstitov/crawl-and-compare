export interface JobDocument extends Record<string, unknown> {
    _id?: string;
    reference: string;
    title: string;
    url: string;
    sourceName: string;
    htmlPage: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const jobsCollection: import("@seald-io/nedb").default<JobDocument>;
