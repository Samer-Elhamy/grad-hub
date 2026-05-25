/**
 * Dedup Filter — checks a CrawledIdea against existing DB records to
 * determine if it's a duplicate.
 *
 * Three-level check (in order):
 *   1. Exact title match (case-insensitive)
 *   2. URL match (if sourceUrl is present on both sides)
 *   3. Fuzzy title similarity (80%+ via Levenshtein distance)
 *
 * The first match wins. This filter is a pure function — it takes existing
 * ideas as input rather than managing internal state.
 */

import type { CrawledIdea } from '../../../types/search.types';

export interface DedupFilterResult {
  /** True when this idea already exists in the database */
  isDuplicate: boolean;
  /** How the duplicate was detected */
  matchType?: 'exact' | 'url' | 'fuzzy';
  /** ID of the existing duplicate idea, if available */
  existingId?: string;
}

/**
 * Minimal record shape needed from the DB for dedup comparison.
 * This is intentionally smaller than a full CrawledIdea.
 */
export interface ExistingIdeaRecord {
  id: string;
  titleEn: string;
  sourceUrl: string;
}

/**
 * Compute Levenshtein distance between two strings.
 * Uses a single-row optimization for memory efficiency.
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;

  if (an === 0) return bn;
  if (bn === 0) return an;

  // Normalize to lowercase for case-insensitive comparison
  a = a.toLowerCase();
  b = b.toLowerCase();

  // Ensure a is the shorter string for space efficiency
  if (an > bn) {
    [a, b] = [b, a];
  }

  const aLen = a.length;
  const bLen = b.length;

  let prevRow: number[] = [];
  let currRow: number[] = [];

  for (let i = 0; i <= aLen; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    currRow[0] = j;
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[i] = Math.min(
        prevRow[i] + 1,       // deletion
        currRow[i - 1] + 1,   // insertion
        prevRow[i - 1] + cost, // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[aLen];
}

/**
 * Compute string similarity ratio (0-1) from Levenshtein distance.
 * 1.0 means identical strings, 0.0 means completely different.
 */
function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Check a single CrawledIdea against existing database records for duplicates.
 *
 * @param idea - The idea to check
 * @param existingIdeas - Array of ideas already stored in the database
 * @param fuzzyThreshold - Similarity threshold (0-1) for fuzzy matching (default 0.8)
 * @returns Dedup result with match details
 */
export function checkDedup(
  idea: CrawledIdea,
  existingIdeas: ExistingIdeaRecord[],
  fuzzyThreshold: number = 0.8,
): DedupFilterResult {
  const lowerTitle = idea.titleEn.toLowerCase().trim();
  const lowerUrl = idea.sourceUrl.toLowerCase().trim();

  for (const existing of existingIdeas) {
    // 1. Exact title match (case-insensitive)
    if (existing.titleEn.toLowerCase().trim() === lowerTitle) {
      return {
        isDuplicate: true,
        matchType: 'exact',
        existingId: existing.id,
      };
    }

    // 2. URL match (if both sides have URLs and they match)
    if (
      lowerUrl.length > 0 &&
      existing.sourceUrl.length > 0 &&
      existing.sourceUrl.toLowerCase().trim() === lowerUrl
    ) {
      return {
        isDuplicate: true,
        matchType: 'url',
        existingId: existing.id,
      };
    }

    // 3. Fuzzy title similarity (Levenshtein-based)
    const similarity = similarityRatio(
      idea.titleEn.toLowerCase(),
      existing.titleEn.toLowerCase(),
    );
    if (similarity >= fuzzyThreshold) {
      return {
        isDuplicate: true,
        matchType: 'fuzzy',
        existingId: existing.id,
      };
    }
  }

  return { isDuplicate: false };
}
