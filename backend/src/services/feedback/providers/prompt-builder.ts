import type { SwipePattern } from '../../../types/ai.types';
import type { PreferenceVector } from '../../../types/api';

/**
 * Build the structured analysis prompt sent to every AI provider.
 *
 * The prompt is provider-agnostic — each provider wraps it with its own
 * system message and response format instructions. This keeps the analysis
 * logic consistent regardless of which backend is used.
 *
 * @param swipePatterns - Recent swipe interactions (up to last 50)
 * @param preferences   - Current preference vector weights
 * @returns A formatted prompt string ready to embed in a chat message
 */
export function buildAnalysisPrompt(
  swipePatterns: SwipePattern[],
  preferences: PreferenceVector,
): string {
  // ── Aggregate swipe statistics ──────────────────────────────────
  const likedCategories = countByCategory(
    swipePatterns.filter((s) => s.direction === 'right'),
  );
  const dislikedCategories = countByCategory(
    swipePatterns.filter((s) => s.direction === 'left'),
  );
  const avgDwellByCategory = computeAvgDwell(swipePatterns);
  const explicitRatings = swipePatterns
    .filter((s) => s.rating !== undefined)
    .map((s) => ({
      ideaId: s.ideaId,
      category: s.category,
      rating: s.rating,
      keywords: s.keywords,
    }));

  // ── Build the prompt ─────────────────────────────────────────────
  const sections: string[] = [];

  sections.push('# Graduation Project Preference Analysis');
  sections.push('');

  // Liked categories
  sections.push('## Categories Liked (Swiped Right)');
  sections.push(
    likedCategories.length > 0
      ? formatCounts(likedCategories)
      : '(none yet)',
  );

  // Disliked categories
  sections.push('');
  sections.push('## Categories Disliked (Swiped Left)');
  sections.push(
    dislikedCategories.length > 0
      ? formatCounts(dislikedCategories)
      : '(none yet)',
  );

  // Dwell times
  sections.push('');
  sections.push('## Average Dwell Time Per Category (ms)');
  sections.push(
    avgDwellByCategory.length > 0
      ? avgDwellByCategory
          .map(({ category, avgMs }) => `- ${category}: ${Math.round(avgMs)}ms`)
          .join('\n')
      : '(no dwell time data)',
  );

  // Explicit ratings
  sections.push('');
  sections.push('## Explicit Ratings Given');
  sections.push(
    explicitRatings.length > 0
      ? explicitRatings
          .map(
            (r) =>
              `- Idea #${r.ideaId} (${r.category}): ${r.rating}/5 — keywords: ${r.keywords.join(', ')}`,
          )
          .join('\n')
      : '(no ratings yet)',
  );

  // Current preference vector
  sections.push('');
  sections.push('## Current Preference Vector');
  sections.push('```json');
  sections.push(JSON.stringify(preferences, null, 2));
  sections.push('```');

  // Output specification
  sections.push('');
  sections.push('## Output');
  sections.push(
    'Return ONLY a JSON object with these exact fields (no explanation, no markdown):',
  );
  sections.push('');
  sections.push(`{
  "category_scores": {
    "AI/ML": 0.85,
    "Web Applications": 0.70,
    ...
  },
  "keywords": ["react", "computer-vision", "nlp", ...],
  "confidence": 0.78,
  "recommendations": [
    "Prioritize AI/ML projects — strong engagement signal",
    "Reduce Web Dev suggestions — low dwell time",
    ...
  ]
}`);
  sections.push('');
  sections.push('Constraints:');
  sections.push(
    '- category_scores must be an object mapping category names to 0.0–1.0 scores',
  );
  sections.push('- keywords must be lowercase, kebab-case, max 15 entries');
  sections.push('- confidence must be 0.0–1.0 reflecting how sure you are');
  sections.push(
    '- recommendations must be actionable strings (max 5, each < 120 chars)',
  );

  return sections.join('\n');
}

// ── Helper utilities ───────────────────────────────────────────────

interface CategoryCount {
  category: string;
  count: number;
}

/** Count swipe records grouped by category */
function countByCategory(records: SwipePattern[]): CategoryCount[] {
  const map = new Map<string, number>();
  for (const r of records) {
    map.set(r.category, (map.get(r.category) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/** Format category counts as a bullet list */
function formatCounts(counts: CategoryCount[]): string {
  return counts
    .map(({ category, count }) => `- ${category}: ${count} swipe(s)`)
    .join('\n');
}

/** Compute average dwell time (ms) per category */
function computeAvgDwell(
  records: SwipePattern[],
): Array<{ category: string; avgMs: number }> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    if (r.dwellTimeMs === undefined) continue;
    const entry = totals.get(r.category) ?? { sum: 0, count: 0 };
    entry.sum += r.dwellTimeMs;
    entry.count += 1;
    totals.set(r.category, entry);
  }
  return Array.from(totals.entries())
    .map(([category, { sum, count }]) => ({
      category,
      avgMs: sum / count,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
}
