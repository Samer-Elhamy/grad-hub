import type { SwipePattern, AIResponse } from '../../types/ai.types';
import type { PreferenceVector } from '../../types/api';

/**
 * Heuristic fallback when no AI provider is available.
 *
 * Uses simple keyword-based scoring and category frequency analysis
 * derived directly from swipe history. This is intentionally basic —
 * it exists to keep the feedback loop running during AI outages.
 *
 * The fallback:
 * 1. Scores categories by swipe frequency (right = positive, left = negative)
 * 2. Extracts top keywords from liked projects
 * 3. Generates basic recommendations based on observed patterns
 * 4. Always returns low confidence (0.3–0.5) to signal "stale/approximate"
 */
export async function heuristicFallback(
  swipePatterns: SwipePattern[],
  preferences: PreferenceVector,
): Promise<AIResponse> {
  const { liked, disliked, rated } = partitionSwipes(swipePatterns);

  // ── Category scoring ──────────────────────────────────────────────
  const categoryScores: Record<string, number> = {};

  // Start with existing weights as a baseline
  for (const [cat, weight] of Object.entries(preferences.category_weights)) {
    categoryScores[cat] = weight;
  }

  // Boost liked categories, penalize disliked
  const totalLiked = liked.length || 1;
  const totalDisliked = disliked.length || 1;

  for (const swipe of liked) {
    categoryScores[swipe.category] = (categoryScores[swipe.category] ?? 0.5) + (1 / totalLiked) * 0.3;
  }
  for (const swipe of disliked) {
    categoryScores[swipe.category] = (categoryScores[swipe.category] ?? 0.5) - (1 / totalDisliked) * 0.3;
  }

  // Clamp to [0, 1]
  for (const cat of Object.keys(categoryScores)) {
    categoryScores[cat] = Math.max(0, Math.min(1, categoryScores[cat]));
  }

  // ── Keyword extraction ───────────────────────────────────────────
  const keywordFreq = new Map<string, number>();
  for (const swipe of liked) {
    for (const kw of swipe.keywords) {
      const normalised = kw.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (normalised) {
        keywordFreq.set(normalised, (keywordFreq.get(normalised) ?? 0) + 1);
      }
    }
  }

  // Also boost keywords from existing preference vector
  for (const [kw, weight] of Object.entries(preferences.keyword_weights)) {
    const current = keywordFreq.get(kw) ?? 0;
    keywordFreq.set(kw, current + weight * 2);
  }

  const keywords = Array.from(keywordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([kw]) => kw);

  // ── Confidence ──────────────────────────────────────────────────
  const hasData = swipePatterns.length > 0;
  const hasRatings = rated.length > 0;
  const confidence = hasData
    ? Math.min(0.5, 0.2 + swipePatterns.length * 0.02 + (hasRatings ? 0.1 : 0))
    : 0.3;

  // ── Recommendations ─────────────────────────────────────────────
  const recommendations: string[] = [];
  const likedCategories = new Set(liked.map((s) => s.category));
  const dislikedCategories = new Set(disliked.map((s) => s.category));

  if (likedCategories.size > 0) {
    const topCat = [...likedCategories].slice(0, 3).join(', ');
    recommendations.push(`Prioritize ${topCat} projects — strong engagement`);
  }
  if (dislikedCategories.size > 0) {
    const bottomCat = [...dislikedCategories].slice(0, 2).join(', ');
    recommendations.push(`Reduce ${bottomCat} suggestions — low interest`);
  }
  if (keywords.length > 0) {
    const topKw = keywords.slice(0, 5).join(', ');
    recommendations.push(`Focus on projects involving: ${topKw}`);
  }
  if (preferences.difficulty_preference) {
    recommendations.push(
      `Maintain ${preferences.difficulty_preference} difficulty filter`,
    );
  }
  if (swipePatterns.length < 5) {
    recommendations.push(
      'Collect more swipe data (5+ interactions) for better analysis',
    );
  }

  return {
    categoryScores,
    keywords,
    confidence,
    recommendations,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function partitionSwipes(records: SwipePattern[]): {
  liked: SwipePattern[];
  disliked: SwipePattern[];
  rated: SwipePattern[];
} {
  const liked: SwipePattern[] = [];
  const disliked: SwipePattern[] = [];
  const rated: SwipePattern[] = [];

  for (const r of records) {
    if (r.direction === 'right') liked.push(r);
    else disliked.push(r);
    if (r.rating !== undefined) rated.push(r);
  }

  return { liked, disliked, rated };
}
