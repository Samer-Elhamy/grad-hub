import cors from 'cors';
import { config } from '../config';

/**
 * CORS middleware configured for local development.
 * Allows configured origins, standard HTTP methods, and common headers.
 */
export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin && config.isDev) {
      callback(null, true);
      return;
    }
    if (origin && config.isDev && origin === 'null') {
      callback(null, true);
      return;
    }
    if (origin && config.isDev) {
      try {
        const { hostname } = new URL(origin);
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          callback(null, true);
          return;
        }
      } catch {
        // Fall back to the explicit allow-list below.
      }
    }
    callback(null, !origin || config.corsOrigin.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
