/**
 * DedupService — prevents duplicate ideas from entering the database.
 *
 * Two-layer dedup strategy:
 *   1. Exact checksum: MD5 hash of normalized title + source URL
 *   2. Fuzzy matching: Levenshtein distance < 3 for near-duplicate titles
 *
 * The checksum check runs first (fast, exact). Only if it passes do we run
 * the fuzzy check (slower, catches near-duplicates from different sources).
 */

import crypto from 'crypto';
import type { CrawledIdea, DedupResult } from '../../types/search.types';

// In a production environment, the existing checksums and titles would be
// loaded from the database. This in-memory stub simulates that for now.

/** In-memory store of already-seen checksums (replace with DB query in prod) */
let seenChecksums: Set<string> = new Set();

/** In-memory store of existing titles for fuzzy matching (replace with DB query) */
let existingTitles: string[] = [];

// ---------------------------------------------------------------------------
// Checksum
// ---------------------------------------------------------------------------

/**
 * Generate an MD5 checksum from title + source URL.
 * This is the primary dedup key.
 */
export function generateChecksum(title: string, sourceUrl: string): string {
  const normalized = `${title.toLowerCase().trim()}||${sourceUrl.toLowerCase().trim()}`;
  return crypto.createHash('md5').update(normalized, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Levenshtein distance
// ---------------------------------------------------------------------------

/**
 * Compute Levenshtein distance between two strings.
 * Used for fuzzy title matching.
 */
export function levenshteinDistance(a: string, b: string): number {
  // Normalize to lowercase for case-insensitive comparison
  a = a.toLowerCase();
  b = b.toLowerCase();

  const an = a.length;
  const bn = b.length;

  // Use a single-row optimization for small alphabets
  if (an === 0) return bn;
  if (bn === 0) return an;

  // Make a the shorter string for space efficiency
  if (an > bn) {
    return levenshteinDistance(b, a);
  }

  let prevRow: number[] = [];
  let currRow: number[] = [];

  for (let i = 0; i <= an; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= bn; j++) {
    currRow[0] = j;
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[i] = Math.min(
        prevRow[i] + 1,       // deletion
        currRow[i - 1] + 1,   // insertion
        prevRow[i - 1] + cost, // substitution
      );
    }
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[an];
}

// ---------------------------------------------------------------------------
// Dedup check
// ---------------------------------------------------------------------------

/**
 * Check if an idea already exists by checksum, then by fuzzy title match.
 *
 * @param idea - The normalized idea to check
 * @returns DedupResult describing the match status
 */
export function checkDuplicate(idea: CrawledIdea): DedupResult {
  const checksum = generateChecksum(idea.titleEn, idea.sourceUrl);

  // 1. Exact checksum match
  if (seenChecksums.has(checksum)) {
    return {
      isDuplicate: true,
      checksum,
      fuzzyScore: null,
      existingIdeaId: null, // Would look up from DB in production
    };
  }

  // 2. Fuzzy title match
  let bestScore: number | null = null;
  for (const existingTitle of existingTitles) {
    const score = levenshteinDistance(
      idea.titleEn.toLowerCase(),
      existingTitle.toLowerCase(),
    );
    if (score < 3) {
      bestScore = score;
      // Continue to find the closest match, but early break if exact
      if (score === 0) break;
    }
  }

  if (bestScore !== null && bestScore < 3) {
    return {
      isDuplicate: true,
      checksum,
      fuzzyScore: bestScore,
      existingIdeaId: null,
    };
  }

  return {
    isDuplicate: false,
    checksum,
    fuzzyScore: null,
    existingIdeaId: null,
  };
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

/**
 * Register a newly accepted idea's checksum and title so future runs
 * can detect it as a duplicate.
 */
export function registerIdea(idea: CrawledIdea): void {
  const checksum = generateChecksum(idea.titleEn, idea.sourceUrl);
  seenChecksums.add(checksum);
  existingTitles.push(idea.titleEn);
}

/**
 * Batch register multiple ideas.
 */
export function registerIdeas(ideas: CrawledIdea[]): void {
  for (const idea of ideas) {
    registerIdea(idea);
  }
}

/**
 * Seed the dedup engine with existing data from the database.
 * Call this on service startup.
 *
 * @param checksums - Set of known checksums from the ideas table
 * @param titles    - Array of known English titles from the ideas table
 */
export function seedDedupEngine(
  checksums: string[],
  titles: string[],
): void {
  seenChecksums = new Set(checksums);
  existingTitles = [...titles];
}

/**
 * Reset the dedup engine (useful for testing).
 */
export function resetDedupEngine(): void {
  seenChecksums = new Set();
  existingTitles = [];
}

/**
 * Get current dedup stats.
 */
export function getDedupStats(): { checksumsCount: number; titlesCount: number } {
  return {
    checksumsCount: seenChecksums.size,
    titlesCount: existingTitles.length,
  };
}
