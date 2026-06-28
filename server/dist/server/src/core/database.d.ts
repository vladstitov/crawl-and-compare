export interface JobDocument extends Record<string, unknown> {
    _id?: string;
    reference: string;
    name?: string;
    title: string;
    url: string;
    sourceName: string;
    htmlPage: string;
    htmlData: any;
    hasTags: {
        tag: string;
        text: string;
    }[];
    status: 'pending' | 'running' | 'completed' | 'failed' | 'downloaded' | 'timeout';
    statusMassage?: string | null;
    workflow?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const jobsCollection: import("@seald-io/nedb").default<JobDocument>;
