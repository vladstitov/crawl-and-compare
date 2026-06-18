import fs from 'fs';
import path from 'path';
import Datastore from '@seald-io/nedb';

const DB_DIRECTORY = path.resolve(__dirname, '..', '..', 'db');

export interface NeDbConnectorOptions<T> {
  filename: string;
  inMemoryOnly?: boolean;
  autoload?: boolean;
  timestampData?: boolean;
}

function ensureDbDirectory(): void {
  if (!fs.existsSync(DB_DIRECTORY)) {
    fs.mkdirSync(DB_DIRECTORY, { recursive: true });
  }
}

export function createNeDbConnector<T extends Record<string, unknown>>(
  options: NeDbConnectorOptions<T>
): Datastore<T> {
  const {
    filename,
    inMemoryOnly = false,
    autoload = true,
    timestampData = true
  } = options;

  if (!inMemoryOnly) {
    ensureDbDirectory();
  }

  return new Datastore<T>({
    filename: inMemoryOnly ? undefined : path.join(DB_DIRECTORY, filename),
    inMemoryOnly,
    autoload,
    timestampData
  });
}
