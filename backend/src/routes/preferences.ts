import { Router } from 'express';
import {
  getPreferencesHandler,
  updatePreferencesHandler,
} from '../controllers/preferences.controller';

const router = Router();

/**
 * GET /api/preferences
 *
 * Returns the current preference vector including category_weights,
 * keyword_weights, excluded_categories, and difficulty_preference.
 *
 * Response: { success: true, data: PreferenceVector }
 */
router.get('/', getPreferencesHandler);

/**
 * POST /api/preferences
 *
 * Manually updates the preference vector. All fields are optional.
 * Only the provided fields will be overridden; others retain current values.
 *
 * Body: { category_weights?: object, keyword_weights?: object, excluded_categories?: string[] }
 * Response: { success: true, data: PreferenceVector }
 */
router.post('/', updatePreferencesHandler);

export default router;
