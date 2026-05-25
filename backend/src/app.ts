import express from 'express';
import helmet from 'helmet';

import { corsMiddleware } from './middleware/cors';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import healthRouter from './routes/health';
import ideasRouter from './routes/ideas';
import swipeRouter from './routes/swipe';
import preferencesRouter from './routes/preferences';
import historyRouter from './routes/history';

/**
 * Creates and configures the Express application.
 * Middleware order: security → body parsing → logging → routes → error handling.
 * The global error handler MUST be registered last.
 */
export function createApp(): express.Application {
  const app = express();

  // ── Security headers ─────────────────────────────────────────────
  app.use(helmet());
  app.use(corsMiddleware);

  // ── Body parsing ────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Request logging ─────────────────────────────────────────────
  app.use(requestLogger);

  // ── API Routes ──────────────────────────────────────────────────
  app.use('/api/health', healthRouter);
  app.use('/api/ideas', ideasRouter);
  app.use('/api/swipe', swipeRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/history', historyRouter);

  // ── Global error handler (must be last) ─────────────────────────
  app.use(errorHandler);

  return app;
}
