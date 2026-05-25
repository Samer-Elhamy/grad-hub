import { Router } from 'express';
import {
  getIdeaByIdHandler,
  getNextIdeaHandler,
} from '../controllers/ideas.controller';

const router = Router();

/**
 * GET /api/ideas/next
 *
 * Returns the next swipable idea based on preference vector matching.
 * The ordering uses preference-ranked logic (currently random as a placeholder).
 *
 * Response: { success: true, data: Idea }
 */
router.get('/next', getNextIdeaHandler);
router.get('/:id', getIdeaByIdHandler);

export default router;
