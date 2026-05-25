import OpenAI from 'openai';
import type { AIProvider } from '../ai-provider.interface';
import type { SwipePattern, AIResponse } from '../../../types/ai.types';
import type { PreferenceVector } from '../../../types/api';
import { buildAnalysisPrompt } from './prompt-builder';
import { parseAIResponse } from './ollama.provider';

/**
 * OpenAIProvider — connects to OpenAI's GPT-4o via the official Node.js SDK.
 *
 * API key is read from the OPENAI_API_KEY environment variable.
 * Falls back to a clear error if the key is missing.
 *
 * Model: gpt-4o (configurable via OPENAI_MODEL env var)
 *
 * @see https://github.com/openai/openai-node for SDK documentation
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  private readonly client: OpenAI;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    apiKey?: string,
    model = 'gpt-4o',
    timeoutMs = 30000,
  ) {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        'OPENAI_API_KEY is required for OpenAIProvider. ' +
        'Set the OPENAI_API_KEY environment variable or pass it to the constructor.',
      );
    }

    this.client = new OpenAI({ apiKey: key });
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Analyze swipe patterns using OpenAI GPT-4o.
   * Uses response_format: json_object to guarantee structured output.
   */
  async analyze(
    swipePatterns: SwipePattern[],
    preferences: PreferenceVector,
  ): Promise<AIResponse> {
    const prompt = buildAnalysisPrompt(swipePatterns, preferences);

    const completion = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a graduation project preference analyzer. ' +
              'Analyze swipe patterns and return ONLY valid JSON matching the specified schema.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        timeout: this.timeoutMs,
        maxRetries: 0, // We handle retries at the service level
      },
    );

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    return parseAIResponse(content);
  }

  /**
   * Lightweight availability check — validates the API key by listing models.
   * Uses a short timeout to avoid blocking.
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
