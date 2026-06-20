import Datastore from '@seald-io/nedb';
export interface NeDbConnectorOptions<T> {
    filename: string;
    inMemoryOnly?: boolean;
    autoload?: boolean;
    timestampData?: boolean;
}
export declare function createNeDbConnector<T extends Record<string, unknown>>(options: NeDbConnectorOptions<T>): Datastore<T>;
