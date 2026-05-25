import morgan from 'morgan';
import { config } from '../config';

/**
 * Request logging middleware using morgan.
 * - 'dev' format in development: concise color-coded output
 * - 'combined' format in production: Apache-style combined log
 * - Skipped in test environment for cleaner test output
 */
export const requestLogger = morgan(
  config.isDev ? 'dev' : 'combined',
  {
    skip: () => config.isTest,
  }
);
