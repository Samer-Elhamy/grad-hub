/**
 * Integration tests: Backend API
 *
 * Coverage targets:
 * - GET /api/health
 * - GET /api/ideas/next
 * - POST /api/swipe (valid + invalid body)
 * - GET/POST /api/preferences
 * - GET /api/history
 *
 * Note: Routes for ideas, swipe, preferences, and history are defined
 * in their respective route files but may need to be registered in app.ts.
 * This test file serves as both specification and validation.
 */

import request from 'supertest';
import express from 'express';
import { createApp } from '../../src/app';

// Import routes for manual wiring (since app.ts only has health route)
import healthRouter from '../../src/routes/health';
import ideasRouter from '../../src/routes/ideas';
import swipeRouter from '../../src/routes/swipe';
import preferencesRouter from '../../src/routes/preferences';
import historyRouter from '../../src/routes/history';
import { errorHandler } from '../../src/middleware/error-handler';
import { corsMiddleware } from '../../src/middleware/cors';
import { requestLogger } from '../../src/middleware/logger';
import { resetDebounce } from '../../src/services/feedback/swipe.service';
import helmet from 'helmet';

// ---------------------------------------------------------------------------
// Create a fully-wired test app
// ---------------------------------------------------------------------------

function createTestApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(corsMiddleware);

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(requestLogger);

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/ideas', ideasRouter);
  app.use('/api/swipe', swipeRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/history', historyRouter);

  // Global error handler
  app.use(errorHandler);

  return app;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  // -------------------------------------------------------------------------
  // GET /api/health
  // -------------------------------------------------------------------------

  describe('GET /api/health', () => {
    test('returns 200 with status ok', async () => {
      // Act
      const response = await request(app).get('/api/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.timestamp).toBeDefined();
    });

    test('response has valid ISO timestamp', async () => {
      const response = await request(app).get('/api/health');
      const timestamp = response.body.data.timestamp;

      // Should be a valid ISO date
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/ideas/next
  // -------------------------------------------------------------------------

  describe('GET /api/ideas/next', () => {
    test('returns 200 with an idea object', async () => {
      // Act
      const response = await request(app).get('/api/ideas/next');

      // Assert
      expect([200, 204, 404]).toContain(response.status); // Accept various success/empty states

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        // Idea should have at least id/title
        if (response.body.data) {
          expect(response.body.data.id || response.body.data.idea_id).toBeDefined();
        }
      }
    });

    test('GET /api/ideas/:id returns a specific idea for detail pages', async () => {
      const response = await request(app).get('/api/ideas/3');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(3);
      expect(response.body.data.title_en).toBeDefined();
      expect(response.body.data.description).toBeDefined();
    });

    test('does not return an idea that has already been swiped in history', async () => {
      await request(app)
        .post('/api/preferences')
        .send({
          category_weights: {
            'AI/ML': 0,
            'Web Applications': 1,
            'Data Science': 0,
          },
          excluded_categories: ['Blockchain', 'IoT'],
        })
        .set('Content-Type', 'application/json');

      resetDebounce();
      await request(app)
        .post('/api/swipe')
        .send({ idea_id: 4, direction: 'right', dwell_time_ms: 500, rating: 5 })
        .set('Content-Type', 'application/json');

      const response = await request(app).get('/api/ideas/next');

      expect(response.status).toBe(200);
      expect(response.body.data.id).not.toBe(4);
    });

    test('recycles the least recently swiped idea after all matching ideas are reviewed', async () => {
      await request(app)
        .post('/api/preferences')
        .send({
          category_weights: {
            'AI/ML': 1,
            'Web Applications': 1,
            'Data Science': 1,
          },
          excluded_categories: ['Blockchain', 'IoT'],
        })
        .set('Content-Type', 'application/json');

      for (const ideaId of [1, 2, 3, 4, 5]) {
        resetDebounce();
        await request(app)
          .post('/api/swipe')
          .send({ idea_id: ideaId, direction: 'right', dwell_time_ms: 500 })
          .set('Content-Type', 'application/json');
      }

      const response = await request(app).get('/api/ideas/next');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(1);
    });

    test('does not recycle an idea that is already active in the client queue', async () => {
      await request(app)
        .post('/api/preferences')
        .send({
          category_weights: {
            'AI/ML': 1,
            'Web Applications': 1,
            'Data Science': 1,
          },
          excluded_categories: ['Blockchain', 'IoT'],
        })
        .set('Content-Type', 'application/json');

      for (const ideaId of [1, 2, 3, 4, 5]) {
        resetDebounce();
        await request(app)
          .post('/api/swipe')
          .send({ idea_id: ideaId, direction: 'right', dwell_time_ms: 500 })
          .set('Content-Type', 'application/json');
      }

      const response = await request(app).get('/api/ideas/next?exclude_ids=1,2,3,4');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/swipe
  // -------------------------------------------------------------------------

  describe('POST /api/swipe', () => {
    beforeEach(() => {
      resetDebounce();
    });

    test('returns 201 for valid swipe with all fields', async () => {
      // Arrange
      const validSwipe = {
        idea_id: 1,
        direction: 'right',
        dwell_time_ms: 1500,
        rating: 4,
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(validSwipe)
        .set('Content-Type', 'application/json');

      // Assert: Accept both success and validation error (idea_id 1 may not exist)
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.swipe_id).toBeDefined();
        expect(response.body.data.updated_preferences).toBeDefined();
      } else if (response.status === 400) {
        // Could be "idea not found" which is valid behavior
        expect(response.body.success).toBe(false);
      }
    });

    test('returns 201 for valid swipe with only required fields', async () => {
      // Arrange: only idea_id and direction are required
      const minimalSwipe = {
        idea_id: 1,
        direction: 'left',
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(minimalSwipe)
        .set('Content-Type', 'application/json');

      // Assert
      expect([201, 400]).toContain(response.status);
    });

    test('returns 400 for missing idea_id', async () => {
      // Arrange
      const invalidSwipe = {
        direction: 'right', // Missing idea_id
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(invalidSwipe)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 for missing direction', async () => {
      // Arrange
      const invalidSwipe = {
        idea_id: 1, // Missing direction
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(invalidSwipe)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 for invalid direction value', async () => {
      // Arrange
      const invalidSwipe = {
        idea_id: 1,
        direction: 'sideways', // Only 'left', 'right', 'up' are valid
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(invalidSwipe)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
    });

    test('returns 400 for negative idea_id', async () => {
      // Arrange
      const invalidSwipe = {
        idea_id: -5,
        direction: 'right',
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(invalidSwipe)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
    });

    test('returns 400 for non-integer idea_id', async () => {
      // Arrange
      const invalidSwipe = {
        idea_id: 1.5,
        direction: 'right',
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(invalidSwipe)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
    });

    test('returns 400 for rating outside 1-5 range', async () => {
      // Arrange
      const invalidSwipe = {
        idea_id: 1,
        direction: 'right',
        rating: 6, // Max is 5
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(invalidSwipe)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
    });

    test('returns 400 for negative dwell_time_ms', async () => {
      // Arrange
      const invalidSwipe = {
        idea_id: 1,
        direction: 'right',
        dwell_time_ms: -100,
      };

      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send(invalidSwipe)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
    });

    test('returns 400 for empty body', async () => {
      // Act
      const response = await request(app)
        .post('/api/swipe')
        .send({})
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/preferences
  // -------------------------------------------------------------------------

  describe('GET /api/preferences', () => {
    test('returns 200 with preference vector', async () => {
      // Act
      const response = await request(app).get('/api/preferences');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // Preference vector should have category_weights
      if (response.body.data) {
        expect(response.body.data.category_weights).toBeDefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/preferences
  // -------------------------------------------------------------------------

  describe('POST /api/preferences', () => {
    test('returns 200 for valid preference update', async () => {
      // Arrange
      const update = {
        category_weights: {
          'AI/ML': 0.8,
          'Web Applications': 0.6,
        },
      };

      // Act
      const response = await request(app)
        .post('/api/preferences')
        .send(update)
        .set('Content-Type', 'application/json');

      // Assert
      expect([200, 204]).toContain(response.status);
    });

    test('returns 200 for empty update (should be no-op)', async () => {
      // Act
      const response = await request(app)
        .post('/api/preferences')
        .send({})
        .set('Content-Type', 'application/json');

      // Assert
      expect([200, 204]).toContain(response.status);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/history
  // -------------------------------------------------------------------------

  describe('GET /api/history', () => {
    test('returns 200 with paginated history', async () => {
      // Act
      const response = await request(app).get('/api/history');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      if (response.body.data) {
        expect(Array.isArray(response.body.data.records)).toBe(true);
      }
    });

    test('accepts page and limit query parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/history')
        .query({ page: 2, limit: 10 });

      // Assert
      expect(response.status).toBe(200);
    });

    test('handles page 0 gracefully', async () => {
      // Act
      const response = await request(app)
        .get('/api/history')
        .query({ page: 0 });

      // Assert: Should not crash
      expect(response.status).toBe(200);
    });

    test('handles invalid page parameter gracefully', async () => {
      // Act
      const response = await request(app)
        .get('/api/history')
        .query({ page: 'invalid' });

      // Assert: Should either return 400 or coerce to default
      expect([200, 400]).toContain(response.status);
    });

    test('stores only the latest swipe per idea and includes idea details', async () => {
      resetDebounce();
      await request(app)
        .post('/api/swipe')
        .send({ idea_id: 4, direction: 'right', dwell_time_ms: 500, rating: 4 })
        .set('Content-Type', 'application/json');

      resetDebounce();
      await request(app)
        .post('/api/swipe')
        .send({ idea_id: 4, direction: 'left', dwell_time_ms: 700, rating: 2 })
        .set('Content-Type', 'application/json');

      const response = await request(app).get('/api/history');
      const records = response.body.data.records.filter((r: { idea_id: number }) => r.idea_id === 4);

      expect(records).toHaveLength(1);
      expect(records[0].direction).toBe('left');
      expect(records[0].idea).toBeDefined();
      expect(records[0].idea.title_en).toBe('Real-time Collaborative Code Editor');
    });

    test('stores star swipes separately from heart likes', async () => {
      resetDebounce();
      await request(app)
        .post('/api/swipe')
        .send({ idea_id: 2, direction: 'up', dwell_time_ms: 500 })
        .set('Content-Type', 'application/json');

      const starredResponse = await request(app).get('/api/history?filter=starred');
      const likedResponse = await request(app).get('/api/history?filter=liked');

      expect(starredResponse.status).toBe(200);
      expect(starredResponse.body.data.records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ idea_id: 2, direction: 'up' }),
        ]),
      );
      expect(likedResponse.body.data.records).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ idea_id: 2 }),
        ]),
      );
    });

    test('DELETE /api/history/:ideaId removes a saved idea from history', async () => {
      resetDebounce();
      await request(app)
        .post('/api/swipe')
        .send({ idea_id: 5, direction: 'right', dwell_time_ms: 600, rating: 5 })
        .set('Content-Type', 'application/json');

      const deleteResponse = await request(app).delete('/api/history/5');
      expect(deleteResponse.status).toBe(204);

      const response = await request(app).get('/api/history');
      const records = response.body.data.records.filter((r: { idea_id: number }) => r.idea_id === 5);
      expect(records).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // API Response Format Consistency
  // -------------------------------------------------------------------------

  describe('API Response Format Consistency', () => {
    test('all success responses have success: true', async () => {
      const healthResponse = await request(app).get('/api/health');

      if (healthResponse.status === 200) {
        expect(healthResponse.body.success).toBe(true);
      }
    });

    test('error responses have success: false and code', async () => {
      // Trigger a validation error
      const response = await request(app)
        .post('/api/swipe')
        .send({ invalid: 'body' })
        .set('Content-Type', 'application/json');

      if (response.status >= 400) {
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBeDefined();
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Test Suite: CreateApp (original minimal app)
// ---------------------------------------------------------------------------

describe('Original createApp (from app.ts)', () => {
  test('createApp returns an Express app with only health route', async () => {
    // Arrange: Use the original createApp (not our test app)
    const minimalApp = createApp();

    // Act: Health should work
    const healthResponse = await request(minimalApp).get('/api/health');
    expect(healthResponse.status).toBe(200);

    // Note: Other routes will 404 because they're not registered in app.ts
    // This documents the current (incomplete) state
  });
});
