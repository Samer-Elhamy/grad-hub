/**
 * Relevance Filter — scores ideas against the user's current preference vector.
 *
 * Uses cosine similarity between the idea's auto-assigned category, tech stack,
 * and description keywords, and the user's learned preference vector built by
 * the Feedback Agent from swipe history.
 *
 * This is a keyword-overlap-based scorer (simple vector space model). Full
 * pgvector-based embedding similarity will be integrated in a later phase.
 */

import type { CrawledIdea } from '../../../types/search.types';

export interface RelevanceFilterResult {
  /** Relevance score between 0 and 1 */
  score: number;
  /** List of keywords that matched between the idea and preference vector */
  matchedKeywords: string[];
}

/**
 * Preference Vector — maps category/keyword names to weight values (0-1).
 *
 * This represents the user's learned preferences from swipe history.
 * Built by the Feedback Agent; initially empty until enough swipes are recorded.
 *
 * Structure:
 *   {
 *     "AI/ML": 0.85,
 *     "Web Applications": 0.6,
 *     "Cybersecurity": 0.3,
 *     "keywords": {
 *       "machine learning": 0.9,
 *       "computer vision": 0.7,
 *       ...
 *     }
 *   }
 *
 * The `keywords` sub-object holds fine-grained term preferences.
 */
export interface PreferenceVector {
  [category: string]: number | Record<string, number> | undefined;
  keywords?: Record<string, number>;
}

/**
 * Score an idea's relevance against the current preference vector.
 *
 * Builds an idea vector from:
 *   - Category (weight 1.0)
 *   - Tech stack terms (weight 0.5 each)
 *   - Significant description terms (>4 chars, weight 0.25 each)
 *
 * Then computes cosine similarity with the preference vector.
 *
 * @param idea - The crawled idea to score
 * @param preferenceVector - Current learned preference vector
 * @returns Relevance score and list of matched keywords
 */
export function scoreRelevance(
  idea: CrawledIdea,
  preferenceVector: PreferenceVector,
): RelevanceFilterResult {
  const matchedKeywords: string[] = [];

  // ── Build idea term set ──────────────────────────────────────────────
  const ideaTerms = new Set<string>();

  // Category (highest weight)
  ideaTerms.add(idea.category.toLowerCase());

  // Tech stack terms (medium weight)
  for (const tech of idea.techStack) {
    ideaTerms.add(tech.toLowerCase());
  }

  // Significant description terms (short words are rarely meaningful signals)
  const descTerms = idea.descriptionEn
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 4);
  for (const term of descTerms) {
    ideaTerms.add(term);
  }

  // ── Separate preference categories from keywords ─────────────────────
  const { keywords: prefKeywords = {}, ...categoryPrefs } = preferenceVector;

  // Collect matched keywords
  for (const term of ideaTerms) {
    if (categoryPrefs[term] !== undefined || prefKeywords[term] !== undefined) {
      matchedKeywords.push(term);
    }
  }

  // ── Build vectors for cosine similarity ──────────────────────────────
  const allTerms = new Set([
    ...ideaTerms,
    ...Object.keys(categoryPrefs),
    ...Object.keys(prefKeywords),
  ]);

  const ideaVec: number[] = [];
  const prefVec: number[] = [];

  for (const term of allTerms) {
    // Idea vector value: 1.0 for category, 0.5 for tech, 0.25 for description term
    let ideaVal = 0;
    if (term === idea.category.toLowerCase()) {
      ideaVal = 1.0;
    } else if (idea.techStack.some((t) => t.toLowerCase() === term)) {
      ideaVal = 0.5;
    } else if (descTerms.includes(term)) {
      ideaVal = 0.25;
    }
    ideaVec.push(ideaVal);

    // Preference vector value
    const prefVal =
      (categoryPrefs[term] as number | undefined) ?? prefKeywords[term] ?? 0;
    prefVec.push(prefVal);
  }

  // ── Cosine similarity ────────────────────────────────────────────────
  let dotProduct = 0;
  let ideaMagnitude = 0;
  let prefMagnitude = 0;

  for (let i = 0; i < allTerms.size; i++) {
    dotProduct += ideaVec[i] * prefVec[i];
    ideaMagnitude += ideaVec[i] * ideaVec[i];
    prefMagnitude += prefVec[i] * prefVec[i];
  }

  const magnitudeProduct = Math.sqrt(ideaMagnitude) * Math.sqrt(prefMagnitude);
  const score =
    magnitudeProduct > 0
      ? Math.max(0, Math.min(1, dotProduct / magnitudeProduct))
      : 0;

  return {
    score,
    matchedKeywords: [...new Set(matchedKeywords)],
  };
}
