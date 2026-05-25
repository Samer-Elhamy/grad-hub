/**
 * AI Integration types for the Grad Hub Feedback Agent.
 *
 * These types define the contracts between the AI provider abstraction layer,
 * the swipe analytics engine, and the preference vector builder.
 */

/** Supported AI provider backends */
export type ProviderType = 'ollama' | 'openai' | 'anthropic';

/**
 * Configuration for the AI provider layer.
 * All values have sensible defaults — only override what you need.
 */
export interface AIProviderConfig {
  /** Which provider backend to use (default: ollama) */
  provider: ProviderType;
  /** Ollama model name (default: llama3.2) */
  ollamaModel: string;
  /** OpenAI model name (default: gpt-4o) */
  openaiModel: string;
  /** Anthropic model name (default: claude-3-5-sonnet-20241022) */
  anthropicModel: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs: number;
  /** Maximum retry attempts on failure (default: 1) */
  maxRetries: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryBaseDelayMs: number;
}

/**
 * A single swipe interaction captured by the swipe engine.
 * Sent to the AI provider for preference analysis.
 */
export interface SwipePattern {
  ideaId: number;
  direction: 'left' | 'right';
  dwellTimeMs?: number;
  rating?: number;
  category: string;
  keywords: string[];
  timestamp: string;
}

/**
 * Structured response from AI preference analysis.
 * Returned by every provider and the heuristic fallback.
 */
export interface AIResponse {
  /** Per-category relevance scores (0.0 – 1.0) */
  categoryScores: Record<string, number>;
  /** Extracted interest keywords from the analysis */
  keywords: string[];
  /** Confidence in this analysis (0.0 – 1.0) */
  confidence: number;
  /** Actionable recommendations for the search agent */
  recommendations: string[];
}

/**
 * Result wrapper for AI provider calls.
 * Encodes success/failure without throwing.
 */
export type AIProviderResult =
  | { ok: true; data: AIResponse }
  | { ok: false; error: string };
