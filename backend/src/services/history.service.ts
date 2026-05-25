import type { PaginationMeta } from '../types/api';

/**
 * HistoryService — handles paginated swipe history retrieval.
 *
 * Delegates to swipe.service for data access.
 * This layer exists so controllers remain thin and focused on
 * request/response handling only.
 */

// Re-export from feedback swipe service to keep data consistent
export {
  deleteSwipeHistoryItem,
  getSwipeHistory,
} from './feedback/swipe.service';

/** Build pagination metadata */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
