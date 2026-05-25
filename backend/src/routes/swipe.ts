import { Router } from 'express';
import { createSwipeHandler } from '../controllers/swipe.controller';

const router = Router();

/**
 * POST /api/swipe
 *
 * Records a swipe interaction (left/right/up) with optional dwell time and rating.
 * Updates the preference vector and returns the new vector.
 *
 * Rate limit: 60 requests per minute per IP (applied at app level).
 *
 * Body: { idea_id: number, direction: 'left' | 'right' | 'up', dwell_time_ms?: number, rating?: 1-5 }
 * Response: { success: true, data: { swipe_id, updated_preferences } }
 */
router.post('/', createSwipeHandler);

export default router;
