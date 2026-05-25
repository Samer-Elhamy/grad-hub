import type { Request, Response } from 'express';
import { getIdeaById, getNextIdea } from '../services/ideas.service';
import { getSwipeHistory } from '../services/history.service';
import { getPreferences } from '../services/preferences.service';
import type { ApiSuccessResponse, ApiErrorResponse, Idea } from '../types/api';

/**
 * GET /api/ideas/next
 * Returns the next best idea based on preference vector matching.
 * Currently returns a random idea from the filtered pool as a placeholder.
 */
export async function getNextIdeaHandler(
  req: Request,
  res: Response<ApiSuccessResponse<Idea> | ApiErrorResponse>,
): Promise<void> {
  try {
    const preferences = await getPreferences();
    const { records } = await getSwipeHistory(1, 1000);
    const activeIdeaIds = parseIdeaIds(String(req.query.exclude_ids ?? ''));
    const idea = await getNextIdea(
      preferences,
      records.map((record) => ({
        idea_id: record.idea_id,
        timestamp: record.timestamp,
      })),
      activeIdeaIds,
    );

    if (!idea) {
      res.status(404).json({
        success: false,
        error: 'No ideas available matching current preferences',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: idea,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch next idea',
      code: 'INTERNAL_ERROR',
    });
  }
}

function parseIdeaIds(value: string): number[] {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

/**
 * GET /api/ideas/:id
 * Returns a single idea for detail pages.
 */
export async function getIdeaByIdHandler(
  req: Request,
  res: Response<ApiSuccessResponse<Idea> | ApiErrorResponse>,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({
        success: false,
        error: 'Invalid idea id',
        code: 'BAD_REQUEST',
      });
      return;
    }

    const idea = await getIdeaById(id);
    if (!idea) {
      res.status(404).json({
        success: false,
        error: `Idea with id ${id} not found`,
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      data: idea,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch idea',
      code: 'INTERNAL_ERROR',
    });
  }
}
