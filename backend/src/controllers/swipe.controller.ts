import type { Request, Response } from 'express';
import { createSwipeSchema } from '../validators/swipe-validator';
import { recordSwipe, SwipeValidationError } from '../services/feedback/swipe.service';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  PreferenceVector,
} from '../types/api';

interface SwipeResponse {
  swipe_id: string;
  updated_preferences: PreferenceVector;
}

/**
 * POST /api/swipe
 * Records a swipe interaction end-to-end:
 *   1. Validates input (Zod schema)
 *   2. Validates idea_id, session_id, timestamp recency
 *   3. Debounces rapid swipes (min 200ms between events)
 *   4. Persists swipe to history
 *   5. Updates preference vector
 *   6. Emits SWIPE_RECORDED and PREFERENCE_CHANGED events
 *
 * Returns the swipe ID and updated preference vector.
 */
export async function createSwipeHandler(
  req: Request,
  res: Response<ApiSuccessResponse<SwipeResponse> | ApiErrorResponse>,
): Promise<void> {
  // 1. Validate request body with Zod
  const validation = createSwipeSchema.safeParse(req.body);

  if (!validation.success) {
    const flatErrors = validation.error.flatten();
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { fieldErrors: flatErrors.fieldErrors },
    });
    return;
  }

  try {
    const { record, updatedPreferences } = await recordSwipe(validation.data);

    res.status(201).json({
      success: true,
      data: {
        swipe_id: record.id,
        updated_preferences: updatedPreferences,
      },
    });
  } catch (err) {
    // Handle known validation/debounce errors with appropriate status codes
    if (err instanceof SwipeValidationError) {
      const statusCode = err.code === 'DEBOUNCE_REJECTED' ? 429 : 400;
      res.status(statusCode).json({
        success: false,
        error: err.message,
        code: err.code === 'DEBOUNCE_REJECTED' ? 'RATE_LIMIT_EXCEEDED' : 'BAD_REQUEST',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to record swipe',
      code: 'INTERNAL_ERROR',
    });
  }
}
