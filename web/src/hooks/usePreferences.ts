/* ════════════════════════════════════════
   usePreferences — Preferences CRUD hook
   Loads on mount, exposes toggle helpers for categories
   ════════════════════════════════════════ */

import { useEffect } from "react";
import { useStore } from "../store";

/**
 * Hook that loads preferences on mount and provides
 * convenience methods for toggling categories.
 */
export function usePreferences() {
  const prefs = useStore((s) => s.preferences);
  const loading = useStore((s) => s.prefsLoading);
  const loadPreferences = useStore((s) => s.loadPreferences);
  const savePreferences = useStore((s) => s.savePreferences);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H7,H8,H9,H10',location:'web/src/hooks/usePreferences.ts:useEffect',message:'react preferences hook mounted and loading preferences',data:{href:window.location.href},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    loadPreferences();
  }, [loadPreferences]);

  /** Toggle an excluded category */
  const toggleExcludedCategory = async (category: string) => {
    if (!prefs) return;
    const current = prefs.excluded_categories ?? [];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    // #region agent log
    fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H8,H10',location:'web/src/hooks/usePreferences.ts:toggleExcludedCategory',message:'react preferences category toggle requested',data:{category,currentExcludedCategories:current,updatedExcludedCategories:updated},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await savePreferences({ excluded_categories: updated });
  };

  /** Move a category into the liked group. */
  const markCategoryLiked = async (category: string) => {
    if (!prefs) return;
    const excluded = (prefs.excluded_categories ?? []).filter((c) => c !== category);
    await savePreferences({
      excluded_categories: excluded,
      category_weights: {
        [category]: Math.max(prefs.category_weights?.[category] ?? 0, 0.85),
      },
    });
  };

  /** Move a category into the disliked group. */
  const markCategoryDisliked = async (category: string) => {
    if (!prefs) return;
    const current = prefs.excluded_categories ?? [];
    await savePreferences({
      excluded_categories: current.includes(category) ? current : [...current, category],
      category_weights: {
        [category]: 0,
      },
    });
  };

  /** Move a category back to the neutral available group. */
  const clearCategoryPreference = async (category: string) => {
    if (!prefs) return;
    await savePreferences({
      excluded_categories: (prefs.excluded_categories ?? []).filter((c) => c !== category),
      category_weights: {
        [category]: 0,
      },
    });
  };

  /** Check if a category is excluded */
  const isCategoryExcluded = (category: string): boolean => {
    return prefs?.excluded_categories?.includes(category) ?? false;
  };

  return {
    preferences: prefs,
    loading,
    toggleExcludedCategory,
    isCategoryExcluded,
    markCategoryLiked,
    markCategoryDisliked,
    clearCategoryPreference,
    savePreferences,
    reload: loadPreferences,
  };
}
