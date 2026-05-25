import { z } from 'zod';
import type { AIProviderConfig, ProviderType } from '../types/ai.types';

/**
 * AI configuration schema with validation and defaults.
 * Reads all values from environment variables — no hardcoded secrets.
 * Follows the same pattern as config/index.ts for consistency.
 */
const aiConfigSchema = z.object({
  FEEDBACK_AI_PROVIDER: z
    .enum(['ollama', 'openai', 'anthropic'])
    .default('ollama'),

  OPENAI_API_KEY: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),

  OLLAMA_MODEL: z.string().default('llama3.2'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-20241022'),

  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(1),
  AI_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(1000),
});

const parsed = aiConfigSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid AI environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/**
 * Frozen AI configuration object — read-only after initialization.
 * Provides typed access with sensible defaults for local development.
 */
export const aiConfig: AIProviderConfig = Object.freeze({
  provider: env.FEEDBACK_AI_PROVIDER as ProviderType,
  ollamaModel: env.OLLAMA_MODEL,
  openaiModel: env.OPENAI_MODEL,
  anthropicModel: env.ANTHROPIC_MODEL,
  timeoutMs: env.AI_TIMEOUT_MS,
  maxRetries: env.AI_MAX_RETRIES,
  retryBaseDelayMs: env.AI_RETRY_BASE_DELAY_MS,
});

/** Get the API key for the given provider type */
export function getApiKey(provider: ProviderType): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'ollama':
      return undefined; // Ollama does not require an API key
  }
}
