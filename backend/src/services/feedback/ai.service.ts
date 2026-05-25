import type { AIProvider } from './ai-provider.interface';
import type { SwipePattern, AIResponse, AIProviderResult } from '../../types/ai.types';
import type { PreferenceVector } from '../../types/api';
import { aiConfig, getApiKey } from '../../config/ai.config';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { heuristicFallback } from './ai-fallback.service';

/**
 * AIService — orchestrates AI provider selection, call execution with retry,
 * and graceful degradation to heuristic fallback.
 *
 * Usage:
 *   import { analyzePreferences } from './services/feedback/ai.service';
 *   const result = await analyzePreferences(swipeHistory, currentPrefs);
 *
 * Provider selection is controlled by the FEEDBACK_AI_PROVIDER env var:
 *   - "ollama"   → local Ollama instance (default, no API key needed)
 *   - "openai"   → OpenAI GPT-4o (requires OPENAI_API_KEY)
 *   - "anthropic" → Anthropic Claude (requires ANTHROPIC_API_KEY)
 *
 * Timeout: 30s per call (configurable via AI_TIMEOUT_MS)
 * Retries: 1 with exponential backoff (configurable via AI_MAX_RETRIES)
 * Fallback: heuristic scoring when all providers are unreachable
 */

// ── Provider registry ──────────────────────────────────────────────

/**
 * Create the configured AI provider instance.
 * Falls back to Ollama if the configured provider's API key is missing.
 */
function createProvider(): AIProvider {
  const { provider, ollamaModel, openaiModel, anthropicModel, timeoutMs } =
    aiConfig;

  switch (provider) {
    case 'ollama':
      return new OllamaProvider(
        'http://localhost:11434/v1',
        ollamaModel,
        timeoutMs,
      );

    case 'openai': {
      const apiKey = getApiKey('openai');
      if (!apiKey) {
        console.warn(
          '[AIService] OPENAI_API_KEY not set — falling back to Ollama',
        );
        return new OllamaProvider(
          'http://localhost:11434/v1',
          ollamaModel,
          timeoutMs,
        );
      }
      return new OpenAIProvider(apiKey, openaiModel, timeoutMs);
    }

    case 'anthropic': {
      const apiKey = getApiKey('anthropic');
      if (!apiKey) {
        console.warn(
          '[AIService] ANTHROPIC_API_KEY not set — falling back to Ollama',
        );
        return new OllamaProvider(
          'http://localhost:11434/v1',
          ollamaModel,
          timeoutMs,
        );
      }
      return new AnthropicProvider(apiKey, anthropicModel, timeoutMs);
    }

    default:
      return new OllamaProvider(
        'http://localhost:11434/v1',
        ollamaModel,
        timeoutMs,
      );
  }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Analyze swipe patterns against current preferences.
 *
 * Tries the configured AI provider first. If unavailable or errored,
 * falls through to the heuristic fallback. Never throws — always returns
 * an AIProviderResult with ok/error status.
 *
 * @param swipePatterns - Recent swipe interactions
 * @param preferences   - Current preference vector
 * @returns Structured analysis with success/error envelope
 */
export async function analyzePreferences(
  swipePatterns: SwipePattern[],
  preferences: PreferenceVector,
): Promise<AIProviderResult> {
  const provider = createProvider();

  // ── Quick availability check ─────────────────────────────────────
  const available = await provider.isAvailable();
  if (!available) {
    console.warn(
      `[AIService] Provider "${provider.name}" unavailable — using heuristic fallback`,
    );
    return runFallback(swipePatterns, preferences);
  }

  // ── Attempt AI call with retry ────────────────────────────────────
  const { maxRetries, retryBaseDelayMs } = aiConfig;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await provider.analyze(swipePatterns, preferences);
      return { ok: true, data };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown AI provider error';

      if (attempt < maxRetries) {
        const delay = retryBaseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[AIService] ${provider.name} attempt ${attempt + 1}/${maxRetries + 1} failed: ${message}. ` +
          `Retrying in ${delay}ms...`,
        );
        await sleep(delay);
      } else {
        console.error(
          `[AIService] ${provider.name} failed after ${maxRetries + 1} attempts: ${message}. ` +
          `Using heuristic fallback.`,
        );
        return runFallback(swipePatterns, preferences);
      }
    }
  }

  // Should not reach here, but TypeScript needs the return
  return runFallback(swipePatterns, preferences);
}

/**
 * Non-retrying version for callers who want immediate fallback.
 * Useful for real-time swipe feedback where latency matters.
 */
export async function analyzePreferencesFast(
  swipePatterns: SwipePattern[],
  preferences: PreferenceVector,
): Promise<AIProviderResult> {
  const provider = createProvider();

  try {
    const available = await provider.isAvailable();
    if (!available) {
      return runFallback(swipePatterns, preferences);
    }

    const data = await provider.analyze(swipePatterns, preferences);
    return { ok: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown AI provider error';
    console.warn(
      `[AIService] Fast path: ${provider.name} failed: ${message}`,
    );
    return runFallback(swipePatterns, preferences);
  }
}

// ── Internal helpers ───────────────────────────────────────────────

/**
 * Run the heuristic fallback and wrap its result in an AIProviderResult.
 */
async function runFallback(
  swipePatterns: SwipePattern[],
  preferences: PreferenceVector,
): Promise<AIProviderResult> {
  try {
    const data = await heuristicFallback(swipePatterns, preferences);
    return { ok: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Fallback also failed';
    console.error(`[AIService] Heuristic fallback failed: ${message}`);
    return { ok: false, error: message };
  }
}

/** Promise-based sleep for retry backoff */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
