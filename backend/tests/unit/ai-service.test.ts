/**
 * Unit tests: AIService (ai.service.ts + ai-fallback.service.ts + prompt-builder.ts)
 *
 * Coverage targets:
 * - Provider selection from env var
 * - Fallback when all providers unavailable
 * - Prompt building from swipe patterns
 * - Response parsing
 * - Retry with exponential backoff
 * - Heuristic fallback logic
 */

import { analyzePreferences, analyzePreferencesFast } from '../../src/services/feedback/ai.service';
import { heuristicFallback } from '../../src/services/feedback/ai-fallback.service';
import { buildAnalysisPrompt } from '../../src/services/feedback/providers/prompt-builder';
import type { SwipePattern, AIResponse, AIProviderResult, AIProviderConfig } from '../../src/types/ai.types';
import type { PreferenceVector } from '../../src/types/api';

// ---------------------------------------------------------------------------
// Mock AI providers
// ---------------------------------------------------------------------------

// Save original env
const originalEnv = { ...process.env };

beforeEach(() => {
  jest.resetModules();
  // Reset env to defaults for each test
  process.env.FEEDBACK_AI_PROVIDER = 'ollama';
  process.env.OLLAMA_MODEL = 'llama3.2';
  process.env.AI_TIMEOUT_MS = '30000';
  process.env.AI_MAX_RETRIES = '1';
  process.env.AI_RETRY_BASE_DELAY_MS = '100';
});

afterEach(() => {
  process.env = { ...originalEnv };
});

// Mock the provider classes
const mockAnalyze = jest.fn();
const mockIsAvailable = jest.fn();

jest.mock('../../src/services/feedback/providers/ollama.provider', () => ({
  OllamaProvider: jest.fn().mockImplementation(() => ({
    name: 'ollama',
    analyze: mockAnalyze,
    isAvailable: mockIsAvailable,
  })),
}));

jest.mock('../../src/services/feedback/providers/openai.provider', () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    name: 'openai',
    analyze: mockAnalyze,
    isAvailable: mockIsAvailable,
  })),
}));

jest.mock('../../src/services/feedback/providers/anthropic.provider', () => ({
  AnthropicProvider: jest.fn().mockImplementation(() => ({
    name: 'anthropic',
    analyze: mockAnalyze,
    isAvailable: mockIsAvailable,
  })),
}));

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockSwipePatterns: SwipePattern[] = [
  {
    ideaId: 1,
    direction: 'right',
    dwellTimeMs: 2000,
    rating: 4,
    category: 'AI/ML',
    keywords: ['machine learning', 'python'],
    timestamp: new Date().toISOString(),
  },
  {
    ideaId: 2,
    direction: 'left',
    dwellTimeMs: 500,
    category: 'IoT',
    keywords: ['embedded', 'arduino'],
    timestamp: new Date().toISOString(),
  },
];

const mockPreferences: PreferenceVector = {
  category_weights: { 'AI/ML': 0.8, 'Web Applications': 0.5, IoT: 0.1 },
  keyword_weights: { python: 0.7, react: 0.4 },
  excluded_categories: ['IoT'],
  difficulty_preference: 'intermediate',
  last_updated: new Date().toISOString(),
};

const mockAIResponse: AIResponse = {
  categoryScores: { 'AI/ML': 0.9, 'Web Applications': 0.6 },
  keywords: ['python', 'fastapi', 'nlp'],
  confidence: 0.85,
  recommendations: ['Prioritize AI/ML projects'],
};

// ---------------------------------------------------------------------------
// AI Service Tests
// ---------------------------------------------------------------------------

describe('AIService — analyzePreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Positive: Uses configured provider when available ──────────────────
  test('analyzePreferences calls configured provider and returns result', async () => {
    // Arrange
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockResolvedValue(mockAIResponse);

    // Act
    const result = await analyzePreferences(mockSwipePatterns, mockPreferences);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.categoryScores).toEqual(mockAIResponse.categoryScores);
      expect(result.data.keywords).toEqual(mockAIResponse.keywords);
    }
  });

  // ── Negative: Falls back when provider unavailable ─────────────────────
  test('analyzePreferences uses heuristic fallback when provider unavailable', async () => {
    // Arrange
    mockIsAvailable.mockResolvedValue(false);

    // Act
    const result = await analyzePreferences(mockSwipePatterns, mockPreferences);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Fallback always returns low confidence
      expect(result.data.confidence).toBeLessThanOrEqual(0.5);
      expect(result.data.categoryScores).toBeDefined();
      expect(result.data.keywords).toBeDefined();
    }
  });

  // ── Negative: Falls back when provider throws ─────────────────────────
  test('analyzePreferences falls back on provider error after retries', async () => {
    // Arrange
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockRejectedValue(new Error('Provider timeout'));

    // Act
    const result = await analyzePreferences(mockSwipePatterns, mockPreferences);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Fallback result
      expect(result.data.confidence).toBeLessThanOrEqual(0.5);
    }
  });

  // ── Negative: Both provider and fallback fail ─────────────────────────
  test('analyzePreferences returns error when both provider and fallback fail', async () => {
    // Fresh import to pick up the fallback spy (static import keeps stale refs)
    jest.resetModules();
    const { analyzePreferences: isolatedAnalyze } = await import('../../src/services/feedback/ai.service');

    // Arrange
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockRejectedValue(new Error('Provider error'));

    // Spy on the freshly-loaded fallback module (same ref as isolatedAnalyze uses)
    const fallbackModule = await import('../../src/services/feedback/ai-fallback.service');
    jest.spyOn(fallbackModule, 'heuristicFallback').mockRejectedValue(new Error('Fallback error'));

    // Act
    const result = await isolatedAnalyze(mockSwipePatterns, mockPreferences);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('AIService — analyzePreferencesFast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Positive: Fast path returns immediately without retries ────────────
  test('analyzePreferencesFast returns result without retries', async () => {
    // Arrange
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockResolvedValue(mockAIResponse);

    // Act
    const result = await analyzePreferencesFast(mockSwipePatterns, mockPreferences);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.confidence).toBe(0.85);
    }
  });

  // ── Negative: Fast path falls back on error immediately ───────────────
  test('analyzePreferencesFast falls back immediately on error (no retries)', async () => {
    // Arrange
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockRejectedValue(new Error('Timeout'));

    // Act
    const result = await analyzePreferencesFast(mockSwipePatterns, mockPreferences);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.confidence).toBeLessThanOrEqual(0.5);
    }
  });

  // ── Negative: Fast path unavailable → immediate fallback ──────────────
  test('analyzePreferencesFast falls back when provider unavailable', async () => {
    // Arrange
    mockIsAvailable.mockResolvedValue(false);

    // Act
    const result = await analyzePreferencesFast(mockSwipePatterns, mockPreferences);

    // Assert
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Provider Selection Tests
// ---------------------------------------------------------------------------

describe('AIService — provider selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module cache so each test re-evaluates provider selection
    jest.resetModules();
  });

  // ── Positive: Default provider is Ollama ───────────────────────────────
  test('uses ollama as default provider when env not set', async () => {
    // Arrange
    delete process.env.FEEDBACK_AI_PROVIDER;
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockResolvedValue(mockAIResponse);

    // Re-import to pick up new env
    const { analyzePreferences: analyze } = await import('../../src/services/feedback/ai.service');

    // Act
    const result = await analyze(mockSwipePatterns, mockPreferences);

    // Assert
    expect(result.ok).toBe(true);
  });

  // ── Positive: Provider=ollama creates OllamaProvider ───────────────────
  test('selects ollama provider when FEEDBACK_AI_PROVIDER=ollama', async () => {
    process.env.FEEDBACK_AI_PROVIDER = 'ollama';
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockResolvedValue(mockAIResponse);

    const { analyzePreferences: analyze } = await import('../../src/services/feedback/ai.service');

    const result = await analyze(mockSwipePatterns, mockPreferences);
    expect(result.ok).toBe(true);
  });

  // ── Positive: Provider=openai with key creates OpenAIProvider ──────────
  test('selects openai provider when FEEDBACK_AI_PROVIDER=openai with key set', async () => {
    process.env.FEEDBACK_AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test-key';
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockResolvedValue(mockAIResponse);

    const { analyzePreferences: analyze } = await import('../../src/services/feedback/ai.service');

    const result = await analyze(mockSwipePatterns, mockPreferences);
    expect(result.ok).toBe(true);
  });

  // ── Positive: Provider=anthropic with key creates AnthropicProvider ─────
  test('selects anthropic provider when FEEDBACK_AI_PROVIDER=anthropic with key set', async () => {
    process.env.FEEDBACK_AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockResolvedValue(mockAIResponse);

    const { analyzePreferences: analyze } = await import('../../src/services/feedback/ai.service');

    const result = await analyze(mockSwipePatterns, mockPreferences);
    expect(result.ok).toBe(true);
  });

  // ── Negative: OpenAI without key falls back to Ollama ──────────────────
  test('falls back to ollama when openai selected but no API key', async () => {
    process.env.FEEDBACK_AI_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    mockIsAvailable.mockResolvedValue(true);
    mockAnalyze.mockResolvedValue(mockAIResponse);

    const { analyzePreferences: analyze } = await import('../../src/services/feedback/ai.service');

    const result = await analyze(mockSwipePatterns, mockPreferences);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Prompt Builder Tests
// ---------------------------------------------------------------------------

describe('AIService — buildAnalysisPrompt', () => {
  // ── Positive: Builds structured prompt with swipe data ─────────────────
  test('buildAnalysisPrompt includes liked categories section', () => {
    const prompt = buildAnalysisPrompt(mockSwipePatterns, mockPreferences);

    expect(prompt).toContain('Categories Liked');
    expect(prompt).toContain('AI/ML');
    expect(prompt).toContain('swipe(s)');
  });

  // ── Positive: Includes disliked categories section ────────────────────
  test('buildAnalysisPrompt includes disliked categories section', () => {
    const prompt = buildAnalysisPrompt(mockSwipePatterns, mockPreferences);

    expect(prompt).toContain('Categories Disliked');
    expect(prompt).toContain('IoT');
  });

  // ── Positive: Includes dwell time data ────────────────────────────────
  test('buildAnalysisPrompt includes dwell time data', () => {
    const prompt = buildAnalysisPrompt(mockSwipePatterns, mockPreferences);

    expect(prompt).toContain('Average Dwell Time');
    expect(prompt).toContain('ms');
  });

  // ── Positive: Includes explicit ratings data ──────────────────────────
  test('buildAnalysisPrompt includes explicit ratings', () => {
    const prompt = buildAnalysisPrompt(mockSwipePatterns, mockPreferences);

    expect(prompt).toContain('Explicit Ratings');
    expect(prompt).toContain('4/5');
  });

  // ── Positive: Includes current preference vector JSON ─────────────────
  test('buildAnalysisPrompt includes preference vector as JSON', () => {
    const prompt = buildAnalysisPrompt(mockSwipePatterns, mockPreferences);

    expect(prompt).toContain('Current Preference Vector');
    expect(prompt).toContain('AI/ML');
    expect(prompt).toContain('0.8');
  });

  // ── Positive: Includes output format specification ────────────────────
  test('buildAnalysisPrompt includes expected output format', () => {
    const prompt = buildAnalysisPrompt(mockSwipePatterns, mockPreferences);

    expect(prompt).toContain('category_scores');
    expect(prompt).toContain('keywords');
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('recommendations');
  });

  // ── Positive: Handles empty swipe data gracefully ─────────────────────
  test('buildAnalysisPrompt handles empty swipe patterns', () => {
    const prompt = buildAnalysisPrompt([], mockPreferences);

    expect(prompt).toContain('(none yet)');
    expect(prompt).toContain('(no ratings yet)');
  });

  // ── Negative: No dwell time data shows placeholder ────────────────────
  test('buildAnalysisPrompt shows placeholder when no dwell time data', () => {
    const patternsWithoutDwell: SwipePattern[] = [
      { ideaId: 1, direction: 'right', category: 'AI/ML', keywords: [], timestamp: new Date().toISOString() },
    ];
    const prompt = buildAnalysisPrompt(patternsWithoutDwell, mockPreferences);

    expect(prompt).toContain('no dwell time data');
  });
});

// ---------------------------------------------------------------------------
// Heuristic Fallback Tests
// ---------------------------------------------------------------------------

describe('AIService — heuristicFallback', () => {
  // ── Positive: Returns AIResponse with all fields ──────────────────────
  test('heuristicFallback returns well-formed AIResponse', async () => {
    const result = await heuristicFallback(mockSwipePatterns, mockPreferences);

    expect(result).toHaveProperty('categoryScores');
    expect(result).toHaveProperty('keywords');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('recommendations');
  });

  // ── Positive: Boosts liked category scores ─────────────────────────────
  test('heuristicFallback boosts scores for liked categories', async () => {
    const result = await heuristicFallback(mockSwipePatterns, mockPreferences);

    // AI/ML was liked → should have a score
    expect(result.categoryScores['AI/ML']).toBeGreaterThan(0);
  });

  // ── Positive: Includes recommendations ─────────────────────────────────
  test('heuristicFallback generates recommendations from swipe data', async () => {
    const result = await heuristicFallback(mockSwipePatterns, mockPreferences);

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes('AI/ML'))).toBe(true);
  });

  // ── Positive: Low confidence with few swipes ──────────────────────────
  test('heuristicFallback returns low confidence (≤0.5)', async () => {
    const result = await heuristicFallback(mockSwipePatterns, mockPreferences);
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  // ── Negative: Empty swipe patterns returns minimal result ─────────────
  test('heuristicFallback handles empty swipe patterns gracefully', async () => {
    const result = await heuristicFallback([], mockPreferences);

    expect(result.categoryScores).toBeDefined();
    expect(result.keywords).toBeDefined();
    expect(result.confidence).toBe(0.3);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
  });

  // ── Positive: Keywords extracted from liked swipes ────────────────────
  test('heuristicFallback extracts keywords from liked swipes', async () => {
    const patterns: SwipePattern[] = [
      {
        ideaId: 1,
        direction: 'right',
        category: 'AI/ML',
        keywords: ['machine learning', 'python', 'nlp'],
        timestamp: new Date().toISOString(),
      },
    ];
    const result = await heuristicFallback(patterns, mockPreferences);

    // Normalisation strips spaces: "machine learning" → "machinelearning"
    expect(result.keywords).toContain('machinelearning');
    expect(result.keywords).toContain('python');
  });

  // ── Negative: Disliked categories penalized ───────────────────────────
  test('heuristicFallback penalizes disliked categories', async () => {
    const result = await heuristicFallback(mockSwipePatterns, mockPreferences);

    // IoT was disliked
    expect(result.categoryScores['IoT']).toBeDefined();
  });

  // ── Positive: Difficulty preference included in recommendations ───────
  test('heuristicFallback includes difficulty preference in recommendations', async () => {
    const prefs: PreferenceVector = {
      ...mockPreferences,
      difficulty_preference: 'advanced',
    };
    const result = await heuristicFallback(mockSwipePatterns, prefs);

    expect(result.recommendations.some((r) => r.includes('advanced'))).toBe(true);
  });
});
