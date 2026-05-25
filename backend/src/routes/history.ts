import { Router } from 'express';
import {
  deleteHistoryItemHandler,
  getHistoryHandler,
} from '../controllers/history.controller';

const router = Router();

/**
 * GET /api/history?page=1&limit=20
 *
 * Returns paginated swipe history with idea details.
 * Default page: 1, default limit: 20, max limit: 100.
 *
 * Query: { page?: number, limit?: number }
 * Response: { success: true, data: { records: SwipeRecord[] }, meta: PaginationMeta }
 */
router.get('/', getHistoryHandler);
router.delete('/:ideaId', deleteHistoryItemHandler);

export default router;
