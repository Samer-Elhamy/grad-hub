import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from '../ai-provider.interface';
import type { SwipePattern, AIResponse } from '../../../types/ai.types';
import type { PreferenceVector } from '../../../types/api';
import { buildAnalysisPrompt } from './prompt-builder';
import { parseAIResponse } from './ollama.provider';

/**
 * AnthropicProvider — connects to Anthropic's Claude via the official TypeScript SDK.
 *
 * API key is read from the ANTHROPIC_API_KEY environment variable.
 * Falls back to a clear error if the key is missing.
 *
 * Model: claude-3-5-sonnet-20241022 (configurable via ANTHROPIC_MODEL env var)
 *
 * Uses JSON-structured output via the system prompt to ensure parseable results.
 *
 * @see https://github.com/anthropics/anthropic-sdk-typescript for SDK docs
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';

  private readonly client: Anthropic;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    apiKey?: string,
    model = 'claude-3-5-sonnet-20241022',
    timeoutMs = 30000,
  ) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        'ANTHROPIC_API_KEY is required for AnthropicProvider. ' +
        'Set the ANTHROPIC_API_KEY environment variable or pass it to the constructor.',
      );
    }

    this.client = new Anthropic({ apiKey: key });
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Analyze swipe patterns using Anthropic Claude.
   * Requests JSON output via system prompt instructions.
   */
  async analyze(
    swipePatterns: SwipePattern[],
    preferences: PreferenceVector,
  ): Promise<AIResponse> {
    const prompt = buildAnalysisPrompt(swipePatterns, preferences);

    const message = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 1024,
        system:
          'You are a graduation project preference analyzer. ' +
          'Analyze swipe patterns and return ONLY valid JSON matching the specified schema. ' +
          'Do not wrap the JSON in markdown fences or include any explanatory text.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      },
      {
        timeout: this.timeoutMs,
        maxRetries: 0, // We handle retries at the service level
      },
    );

    // Extract text content from the response
    const textBlock = message.content.find((block: any) => block.type === 'text');
    if (!textBlock || !('text' in textBlock)) {
      throw new Error('Anthropic returned no text content');
    }

    return parseAIResponse(textBlock.text);
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
