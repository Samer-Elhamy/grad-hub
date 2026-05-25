import type { Request, Response } from 'express';
import {
  getPreferences,
  updatePreferences,
} from '../services/preferences.service';
import { updatePreferencesSchema } from '../validators/preferences-validator';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  PreferenceVector,
} from '../types/api';

/**
 * GET /api/preferences
 * Returns the current preference vector.
 */
export async function getPreferencesHandler(
  _req: Request,
  res: Response<ApiSuccessResponse<PreferenceVector> | ApiErrorResponse>,
): Promise<void> {
  try {
    const preferences = await getPreferences();

    res.json({
      success: true,
      data: preferences,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
      code: 'INTERNAL_ERROR',
    });
  }
}

/**
 * POST /api/preferences
 * Manually updates the preference vector with overrides.
 */
export async function updatePreferencesHandler(
  req: Request,
  res: Response<ApiSuccessResponse<PreferenceVector> | ApiErrorResponse>,
): Promise<void> {
  // Validate request body with Zod
  const validation = updatePreferencesSchema.safeParse(req.body);

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
    const updated = await updatePreferences(validation.data);

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      code: 'INTERNAL_ERROR',
    });
  }
}
