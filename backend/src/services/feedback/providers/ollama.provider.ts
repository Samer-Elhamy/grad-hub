import type { AIProvider } from '../ai-provider.interface';
import type { SwipePattern, AIResponse } from '../../../types/ai.types';
import type { PreferenceVector } from '../../../types/api';
import { buildAnalysisPrompt } from './prompt-builder';

/**
 * OllamaProvider — connects to a local Ollama instance via the OpenAI-compatible API.
 *
 * Ollama v0.5.5+ exposes /v1/chat/completions with the same format as OpenAI,
 * so we can use the standard OpenAI SDK with a custom base URL.
 * This keeps the provider implementations uniform and testable.
 *
 * Default model: llama3.2 (configurable via OLLAMA_MODEL env var)
 * Endpoint: http://localhost:11434/v1
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    baseUrl = 'http://localhost:11434/v1',
    model = 'llama3.2',
    timeoutMs = 30000,
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Analyze swipe patterns using local Ollama.
   * Sends a structured JSON prompt and expects a JSON response.
   */
  async analyze(
    swipePatterns: SwipePattern[],
    preferences: PreferenceVector,
  ): Promise<AIResponse> {
    const prompt = buildAnalysisPrompt(swipePatterns, preferences);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a graduation project preference analyzer. ' +
              'Analyze swipe patterns and return ONLY valid JSON matching the specified schema. ' +
              'Do not wrap the JSON in markdown fences or include any explanatory text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown error');
      throw new Error(`Ollama API error (${response.status}): ${text}`);
    }

    const body = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Ollama returned empty response');
    }

    return parseAIResponse(content);
  }

  /**
   * Check if Ollama is running by hitting the /v1/models endpoint.
   * A lightweight check that doesn't consume generation resources.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Parse the raw JSON string from an AI provider into a typed AIResponse.
 * Handles common edge cases like trailing commas and extra whitespace.
 *
 * @throws {Error} If the response cannot be parsed or is missing required fields
 */
function parseAIResponse(raw: string): AIResponse {
  const cleaned = raw.trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    // Some providers wrap JSON in markdown code fences — strip them
    const fenceStripped = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(fenceStripped) as Record<string, unknown>;
  }

  const categoryScores = parsed.category_scores as Record<string, number> | undefined;
  const keywords = parsed.keywords as string[] | undefined;
  const confidence = parsed.confidence as number | undefined;
  const recommendations = parsed.recommendations as string[] | undefined;

  if (!categoryScores || typeof categoryScores !== 'object') {
    throw new Error('AI response missing required field: category_scores');
  }

  return {
    categoryScores,
    keywords: Array.isArray(keywords) ? keywords : [],
    confidence: typeof confidence === 'number' ? confidence : 0.5,
    recommendations: Array.isArray(recommendations) ? recommendations : [],
  };
}

export { parseAIResponse };
