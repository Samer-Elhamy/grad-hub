import type { UpdatePreferencesInput } from '../validators/preferences-validator';
import type { PreferenceVector } from '../types/api';
import {
  loadPersistedPreferences,
  persistPreferences,
} from './runtime-state.service';

/**
 * PreferencesService — manages the user preference vector.
 *
 * Note: This is a stub/mock implementation for route scaffolding.
 * In production, this reads/writes from the preference_vectors table
 * and integrates with the Feedback Agent for AI-driven weight optimization.
 */

const DEFAULT_PREFERENCES: PreferenceVector = {
  category_weights: {
    'AI/ML': 0.5,
    'Web Applications': 0.5,
    'Mobile Apps': 0.3,
    Cybersecurity: 0.4,
    'Data Science': 0.5,
    'Cloud/DevOps': 0.3,
    Blockchain: 0.1,
    'Game Development': 0.2,
    IoT: 0.1,
  },
  keyword_weights: {
    python: 0.5,
    react: 0.4,
    docker: 0.3,
    machine_learning: 0.6,
    nlp: 0.4,
    fullstack: 0.3,
  },
  excluded_categories: ['IoT', 'Blockchain'],
  difficulty_preference: null,
  last_updated: new Date().toISOString(),
};

/** Current preference vector, persisted locally for single-user mode. */
let currentPreferences: PreferenceVector =
  loadPersistedPreferences() ?? DEFAULT_PREFERENCES;

function clonePreferences(prefs: PreferenceVector): PreferenceVector {
  return {
    ...prefs,
    category_weights: { ...prefs.category_weights },
    keyword_weights: { ...prefs.keyword_weights },
    excluded_categories: [...prefs.excluded_categories],
  };
}

/** Return a copy of the current preference vector */
export async function getPreferences(): Promise<PreferenceVector> {
  // #region agent log
  fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H3,H4,H5',location:'backend/src/services/preferences.service.ts:getPreferences',message:'backend preferences read',data:{excludedCategories:currentPreferences.excluded_categories,categoryWeights:currentPreferences.category_weights,lastUpdated:currentPreferences.last_updated},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return clonePreferences(currentPreferences);
}

/** Replace the entire preference vector (used by feedback loop to sync after swipe updates). */
export function setPreferences(prefs: PreferenceVector): void {
  currentPreferences = { ...prefs, last_updated: new Date().toISOString() };
  persistPreferences(currentPreferences);
  // #region agent log
  fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H1,H3,H4',location:'backend/src/services/preferences.service.ts:setPreferences',message:'backend preferences synced from swipe',data:{excludedCategories:currentPreferences.excluded_categories,categoryWeights:currentPreferences.category_weights,lastUpdated:currentPreferences.last_updated},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

/** Update the preference vector with manual overrides.
 *  Only provided fields are updated; missing fields retain their current values.
 */
export async function updatePreferences(
  input: UpdatePreferencesInput,
): Promise<PreferenceVector> {
  const updated: PreferenceVector = {
    ...currentPreferences,
    ...(input.category_weights !== undefined && {
      category_weights: {
        ...currentPreferences.category_weights,
        ...input.category_weights,
      },
    }),
    ...(input.keyword_weights !== undefined && {
      keyword_weights: {
        ...currentPreferences.keyword_weights,
        ...input.keyword_weights,
      },
    }),
    ...(input.excluded_categories !== undefined && {
      excluded_categories: [...input.excluded_categories],
    }),
    last_updated: new Date().toISOString(),
  };

  currentPreferences = updated;
  persistPreferences(currentPreferences);
  // #region agent log
  fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H3,H4',location:'backend/src/services/preferences.service.ts:updatePreferences',message:'backend manual preferences updated',data:{inputExcludedCategories:input.excluded_categories,updatedExcludedCategories:updated.excluded_categories,updatedCategoryWeights:updated.category_weights,lastUpdated:updated.last_updated},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return clonePreferences(updated);
}
