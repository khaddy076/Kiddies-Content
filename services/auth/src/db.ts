import { createDb } from '@kiddies/db';
import type { PostgresJsDatabase } from '@kiddies/db';
import { config } from './config.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: PostgresJsDatabase<any> = createDb(config.DATABASE_URL);
