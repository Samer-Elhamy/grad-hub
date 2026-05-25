import type { SwipePattern, AIResponse } from '../../types/ai.types';
import type { PreferenceVector } from '../../types/api';

/**
 * AIProvider interface — abstract contract for any external AI backend.
 *
 * Implementations wrap Ollama, OpenAI GPT-4o, or Anthropic Claude.
 * The interface is kept minimal to make swapping providers trivial:
 * change FEEDBACK_AI_PROVIDER env var and the service picks the right one.
 *
 * @see ai.service.ts for provider selection and orchestration
 * @see ai-fallback.service.ts for graceful degradation when unavailable
 */
export interface AIProvider {
  /** Human-readable provider name for logging and debugging */
  readonly name: string;

  /**
   * Analyze swipe patterns against current preferences and return
   * structured category scores, keywords, and recommendations.
   *
   * @param swipePatterns - Recent swipe interactions (likes/dislikes/dwell/ratings)
   * @param preferences   - Current preference vector with category/keyword weights
   * @returns Structured analysis result
   * @throws {AIProviderError} if the provider is unreachable or returns invalid data
   */
  analyze(
    swipePatterns: SwipePattern[],
    preferences: PreferenceVector,
  ): Promise<AIResponse>;

  /**
   * Health check — returns true if the provider is reachable and ready.
   * Used by ai.service.ts to decide whether to attempt an AI call or
   * fall through to the heuristic fallback immediately.
   */
  isAvailable(): Promise<boolean>;
}
