import type { Request, Response } from 'express';
import {
  deleteSwipeHistoryItem,
  getSwipeHistory,
} from '../services/history.service';
import { buildPaginationMeta } from '../services/history.service';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  SwipeRecord,
} from '../types/api';

interface HistoryResponse {
  records: SwipeRecord[];
}

/**
 * GET /api/history?page=1&limit=20
 * Returns paginated swipe history with idea details.
 */
export async function getHistoryHandler(
  req: Request,
  res: Response<ApiSuccessResponse<HistoryResponse> | ApiErrorResponse>,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string, 10) || 20),
    );
    const filter =
      req.query.filter === 'liked' ||
      req.query.filter === 'disliked' ||
      req.query.filter === 'starred'
        ? req.query.filter
        : undefined;

    const { records, total } = await getSwipeHistory(page, limit, filter);
    const meta = buildPaginationMeta(page, limit, total);
    // #region agent log
    fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H2,H4,H5',location:'backend/src/controllers/history.controller.ts:getHistoryHandler',message:'backend history response prepared',data:{query:req.query,page,limit,recordCount:records.length,total,meta,responseDataShape:'{ records: SwipeRecord[] }'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    res.json({
      success: true,
      data: { records },
      meta,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch swipe history',
      code: 'INTERNAL_ERROR',
    });
  }
}

/**
 * DELETE /api/history/:ideaId
 * Removes one saved idea from the single-user history.
 */
export async function deleteHistoryItemHandler(
  req: Request,
  res: Response<ApiErrorResponse>,
): Promise<void> {
  try {
    const ideaId = Number(req.params.ideaId);
    if (!Number.isInteger(ideaId) || ideaId < 1) {
      res.status(400).json({
        success: false,
        error: 'Invalid idea id',
        code: 'BAD_REQUEST',
      });
      return;
    }

    const deleted = await deleteSwipeHistoryItem(ideaId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: `History item for idea ${ideaId} not found`,
        code: 'NOT_FOUND',
      });
      return;
    }

    res.status(204).send();
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to delete history item',
      code: 'INTERNAL_ERROR',
    });
  }
}
