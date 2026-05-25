/**
 * VectorDecay — Temporal decay function for swipe weighting
 *
 * Implements exponential decay for preference computation:
 *   weight = e^(-λ × days_since_swipe)
 *
 * Why exponential decay?
 *   - Smooth, continuous decay with no sharp cutoffs
 *   - Lambda-configurable: tune how fast old swipes lose influence
 *   - Mathematically well-behaved: weight ∈ (0, 1], monotonic decreasing
 *   - Half-life intuitive: λ = 0.05 → ~14 day half-life
 *
 * Pure functions only — no I/O, no side effects, no state.
 */

import type { DecayConfig } from '../../types/vector.types';
import { buildDecayConfig } from '../../types/vector.types';

// ── Public API ────────────────────────────────────────────────────────

/**
 * Compute the decay weight for a single swipe event.
 *
 * @param daysSinceSwipe - Number of days elapsed since the swipe occurred
 * @param lambda - Decay rate constant (default: 0.05)
 * @returns Decay weight in (0, 1], where 1.0 = today, approaching 0 for old swipes
 *
 * @example
 *   decayWeight(0, 0.05)   // → 1.0   (today's swipe, full weight)
 *   decayWeight(14, 0.05)  // → ≈0.5  (half-life: ~14 days)
 *   decayWeight(90, 0.05)  // → ≈0.011 (old swipe, minimal weight)
 *   decayWeight(180, 0.05) // → ≈0.0001 (effectively zero)
 */
export function decayWeight(daysSinceSwipe: number, lambda: number = 0.05): number {
  if (daysSinceSwipe <= 0) return 1.0;
  if (lambda <= 0) return 1.0; // No decay if lambda is zero or negative
  return Math.exp(-lambda * daysSinceSwipe);
}

/**
 * Compute decay factors for an array of swipe records.
 *
 * Pure function: swipes + now + optional config → decay factors array.
 * Each factor corresponds to the swipe at the same index in the input array.
 *
 * The decay factor is:
 *   1.0 for swipes that happened today (or in the future)
 *   Decays exponentially based on days elapsed since the swipe
 *   Essentially zero for swipes older than maxAgeDays
 *
 * @param swipes - Array of swipe records with ISO-8601 timestamps
 * @param now - Current timestamp in milliseconds (Date.now())
 * @param decayConfig - Partial DecayConfig (defaults: λ=0.05, maxDays=90)
 * @returns Array of decay factors (same length as input), values in (0, 1]
 */
export function computeDecayFactors(
  swipes: ReadonlyArray<{ timestamp: string }>,
  now: number,
  decayConfig?: Partial<DecayConfig>,
): number[] {
  const config = buildDecayConfig(decayConfig);
  const nowMs = now;

  return swipes.map((swipe) => {
    const swipeTime = new Date(swipe.timestamp).getTime();
    if (isNaN(swipeTime)) return 0; // Invalid timestamp → zero weight

    const daysSince = (nowMs - swipeTime) / (1000 * 60 * 60 * 24);

    // Cap at maxDays: swipes beyond this threshold get ~0 weight
    if (daysSince >= config.maxDays) return 0;

    // Clamp negative days (future timestamps) to 0
    const clampedDays = Math.max(0, daysSince);

    return decayWeight(clampedDays, config.lambda);
  });
}

/**
 * Apply decay factors to an array of scores, returning weighted scores.
 * Useful for combining decay with other weighting factors.
 *
 * @param scores - Raw scores to apply decay to (same length as decayFactors)
 * @param decayFactors - Decay factors from computeDecayFactors()
 * @returns Weighted scores (score × decayFactor for each element)
 */
export function applyDecay(
  scores: ReadonlyArray<number>,
  decayFactors: ReadonlyArray<number>,
): number[] {
  const minLength = Math.min(scores.length, decayFactors.length);
  const result: number[] = new Array(minLength);

  for (let i = 0; i < minLength; i++) {
    result[i] = scores[i] * decayFactors[i];
  }

  return result;
}

/**
 * Get the effective half-life in days for a given lambda.
 * halfLife = ln(2) / λ
 *
 * At this point, a swipe's original weight is reduced by 50%.
 *
 * @param lambda - Decay rate constant
 * @returns Half-life in days
 *
 * @example
 *   getHalfLife(0.05)  // → ~13.86 days
 *   getHalfLife(0.1)   // → ~6.93 days
 *   getHalfLife(0.01)  // → ~69.3 days
 */
export function getHalfLife(lambda: number): number {
  if (lambda <= 0) return Infinity;
  return Math.LN2 / lambda;
}

/**
 * Calculate the percentage weight remaining for a swipe after N days.
 *
 * @param daysElapsed - Days elapsed since the swipe
 * @param lambda - Decay rate constant (default: 0.05)
 * @returns Percentage as a decimal (0.0–1.0)
 *
 * @example
 *   weightRemaining(0, 0.05)   // → 1.0 (100%)
 *   weightRemaining(14, 0.05)  // → 0.5 (50%)
 *   weightRemaining(90, 0.05)  // → 0.011 (1.1%)
 */
export function weightRemaining(daysElapsed: number, lambda: number = 0.05): number {
  return decayWeight(daysElapsed, lambda);
}

// ── Deprecation warning helper ────────────────────────────────────────

/**
 * Generate a deprecation-friendly curve that drops swipes older than maxDays.
 * Uses exponential decay up to maxDays, then drops to 0.
 * This prevents very old swipes from having any influence at all.
 */
export function decayWithCutoff(
  daysSinceSwipe: number,
  lambda: number = 0.05,
  maxDays: number = 90,
): number {
  if (daysSinceSwipe >= maxDays) return 0;
  return decayWeight(daysSinceSwipe, lambda);
}
