/**
 * QueryBuilder — pgvector nearest-neighbor query generator
 *
 * Builds parameterized SQL queries using the <=> (cosine distance) operator
 * for preference-based similarity search against the ideas table.
 *
 * Design:
 *   - Pure functions: same inputs → same SQL output (no side effects)
 *   - Parameterized queries: all user input via $N placeholders (SQL injection safe)
 *   - Configurable filters: excluded categories, difficulty range
 *   - Returns { text, values } for direct use with node-postgres (pg) client.query()
 *
 * Expected table schema:
 *   ideas (
 *     id INTEGER PRIMARY KEY,
 *     category TEXT,
 *     difficulty TEXT,
 *     embedding vector(384)
 *   )
 *
 * Usage with pg client:
 *   import { buildSimilarityQuery } from './query-builder';
 *   const { text, values } = buildSimilarityQuery(embedding, { limit: 10 });
 *   const result = await client.query(text, values);
 */

import type { VectorQuery, VectorQueryResult } from '../../types/vector.types';
import { DIFFICULTY_MAP } from '../../types/vector.types';

// ── SQL Template Parts ────────────────────────────────────────────────

/**
 * Base SQL for pgvector cosine distance similarity search.
 * Uses the <=> operator which computes 1 - cosine_similarity(a, b).
 * Results are ordered by ascending distance (most similar first).
 *
 * The embedding is cast to vector via string literal: $1::vector
 * pgvector-node provides a toSql() helper, but raw SQL works with any pg client.
 */
const SIMILARITY_SQL_BASE = `
SELECT
  id,
  embedding <=> $1::vector AS distance
FROM ideas
WHERE 1=1`;

const ORDER_LIMIT_SQL = `
ORDER BY distance ASC
LIMIT $2`;

// ── Public API ────────────────────────────────────────────────────────

/**
 * Build the full parameterized query for a pgvector similarity search.
 *
 * @param embedding - Float array representing the preference vector embedding
 * @param options - Query options (limit, filters)
 * @returns { text, values } — ready to pass to client.query()
 *
 * @example
 *   const { text, values } = buildSimilarityQuery(
 *     [0.1, 0.5, 0.2, ...],
 *     { limit: 10, excludedCategories: ['IoT'], minDifficulty: 1 }
 *   );
 *   // text:  "SELECT id, embedding <=> $1::vector AS distance ... WHERE category != $3 ..."
 *   // values: [embedding_string, 10, 'IoT']
 */
export function buildSimilarityQuery(
  embedding: number[],
  options: VectorQuery,
): { text: string; values: unknown[] } {
  const { text, values } = buildSimilaritySql(embedding, options);
  return { text, values };
}

/**
 * Build the SQL string and parameter values for a similarity query.
 *
 * Query structure:
 *   SELECT id, embedding <=> $1::vector AS distance
 *   FROM ideas
 *   WHERE 1=1
 *     [AND category NOT IN (...)]
 *     [AND difficulty_numeric BETWEEN ...]
 *   ORDER BY distance ASC
 *   LIMIT $2
 *
 * Parameterized values start at $1 (the embedding), then $2 (limit),
 * then additional filters at $3+.
 */
export function buildSimilaritySql(
  embedding: number[],
  options: VectorQuery,
): { text: string; values: unknown[] } {
  // Validate embedding
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new VectorQueryError('Embedding must be a non-empty array of numbers');
  }

  const {
    limit,
    excludedCategories = [],
    minDifficulty,
    maxDifficulty,
  } = options;

  // Validate limit
  const safeLimit = typeof limit === 'number' && limit > 0 ? Math.min(limit, 100) : 10;

  // Validate difficulty range
  const minDiff = minDifficulty !== undefined ? clampDifficulty(minDifficulty) : undefined;
  const maxDiff = maxDifficulty !== undefined ? clampDifficulty(maxDifficulty) : undefined;

  // Validate difficulty bounds
  if (minDiff !== undefined && maxDiff !== undefined && minDiff > maxDiff) {
    throw new VectorQueryError(
      `minDifficulty (${minDiff}) cannot be greater than maxDifficulty (${maxDiff})`,
    );
  }

  // Convert embedding to pgvector-compatible string format: '{0.1,0.5,0.2,...}'
  const embeddingStr = formatVectorLiteral(embedding);

  // Build query parts
  const clauses: string[] = [];
  const values: unknown[] = [embeddingStr, safeLimit];
  let paramIndex = 3;

  // Filter: excluded categories
  if (excludedCategories.length > 0) {
    const placeholders = excludedCategories.map(() => `$${paramIndex++}`);
    clauses.push(`AND category NOT IN (${placeholders.join(', ')})`);
    values.push(...excludedCategories);
  }

  // Filter: difficulty range
  if (minDiff !== undefined && maxDiff !== undefined) {
    clauses.push(`AND difficulty_numeric BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
    values.push(minDiff, maxDiff);
    paramIndex += 2;
  } else if (minDiff !== undefined) {
    clauses.push(`AND difficulty_numeric >= $${paramIndex}`);
    values.push(minDiff);
    paramIndex++;
  } else if (maxDiff !== undefined) {
    clauses.push(`AND difficulty_numeric <= $${paramIndex}`);
    values.push(maxDiff);
    paramIndex++;
  }

  // Assemble final SQL
  const clauseStr = clauses.length > 0 ? `\n${clauses.join('\n')}` : '';
  const text = `${SIMILARITY_SQL_BASE}${clauseStr}\n${ORDER_LIMIT_SQL}`;

  return { text, values };
}

/**
 * Map raw pgquery results to a structured VectorQueryResult.
 *
 * @param rows - Query result rows containing id and distance fields
 * @param options - Original query options (for total count context)
 * @returns Structured result with idea IDs, scores, and total count
 */
export function mapQueryResult(
  rows: Array<{ id: number; distance: number }>,
  _options: VectorQuery,
): VectorQueryResult {
  const ideaIds: number[] = [];
  const scores: number[] = [];

  for (const row of rows) {
    ideaIds.push(row.id);
    // Cosine distance → cosine similarity: similarity = 1 - distance
    // Distance from <=> is in [0, 2], so similarity is in [-1, 1]
    // Clamp to [0, 1] for interpretability
    const similarity = Math.max(0, Math.min(1, 1 - row.distance));
    scores.push(Math.round(similarity * 10000) / 10000);
  }

  return {
    ideaIds,
    scores,
    total: rows.length,
  };
}

/**
 * Build a count query (without similarity ordering) to get the total
 * number of matching ideas before LIMIT is applied.
 *
 * @param excludedCategories - Categories to exclude
 * @param minDifficulty - Minimum difficulty filter
 * @param maxDifficulty - Maximum difficulty filter
 * @returns { text, values } — ready to pass to client.query()
 */
export function buildCountQuery(
  excludedCategories?: string[],
  minDifficulty?: number,
  maxDifficulty?: number,
): { text: string; values: unknown[] } {
  const clauses: string[] = ['1=1'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (excludedCategories && excludedCategories.length > 0) {
    const placeholders = excludedCategories.map(() => `$${paramIndex++}`);
    clauses.push(`AND category NOT IN (${placeholders.join(', ')})`);
    values.push(...excludedCategories);
  }

  if (minDifficulty !== undefined && maxDifficulty !== undefined) {
    clauses.push(`AND difficulty_numeric BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
    values.push(clampDifficulty(minDifficulty), clampDifficulty(maxDifficulty));
    paramIndex += 2;
  } else if (minDifficulty !== undefined) {
    clauses.push(`AND difficulty_numeric >= $${paramIndex}`);
    values.push(clampDifficulty(minDifficulty));
    paramIndex++;
  } else if (maxDifficulty !== undefined) {
    clauses.push(`AND difficulty_numeric <= $${paramIndex}`);
    values.push(clampDifficulty(maxDifficulty));
    paramIndex++;
  }

  const text = `SELECT COUNT(*) AS total FROM ideas WHERE ${clauses.join(' AND ')}`;
  return { text, values };
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Format a float array as a pgvector-compatible string literal.
 * pgvector accepts format: '{0.1,0.5,0.2}'
 */
export function formatVectorLiteral(values: number[]): string {
  if (!Array.isArray(values) || values.length === 0) {
    throw new VectorQueryError('Cannot format empty vector');
  }
  return `{${values.map((v) => {
    if (typeof v !== 'number' || !isFinite(v)) return '0';
    return String(v);
  }).join(',')}}`;
}

/**
 * Validate and clamp a difficulty value to the valid range [1, 3].
 * 1 = beginner, 2 = intermediate, 3 = advanced
 */
export function clampDifficulty(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) return 1;
  return Math.max(1, Math.min(3, Math.round(value)));
}

/**
 * Map a difficulty label to its numeric value for query filtering.
 * Uses the same mapping as DIFFICULTY_MAP from vector.types.
 */
export function difficultyLabelToNumeric(label: string): number | null {
  return DIFFICULTY_MAP[label] ?? null;
}

// ── Error Types ───────────────────────────────────────────────────────

/**
 * Error thrown when query parameters are invalid.
 */
export class VectorQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VectorQueryError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}
