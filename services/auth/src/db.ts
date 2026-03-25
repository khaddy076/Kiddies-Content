import { createDb } from '@kiddies/db';
import { config } from './config.js';

export const db = createDb(config.DATABASE_URL);
