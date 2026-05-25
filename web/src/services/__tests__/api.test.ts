/* ════════════════════════════════════════
   API Client Tests — Grad Projects Hub v3
   ════════════════════════════════════════ */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  deleteHistoryItem,
  fetchIdeaById,
  fetchNextIdea,
  submitSwipe,
  fetchPreferences,
  updatePreferences,
  fetchHistory,
} from "../api";

/* ── Mock fetch ───────────────────────────────────────────────── */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/* ── Helpers ──────────────────────────────────────────────────── */

function mockResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

/* ── Reset mocks before each test ─────────────────────────────── */

beforeEach(() => {
  vi.clearAllMocks();
});

/* ── Tests ────────────────────────────────────────────────────── */

describe("fetchNextIdea", () => {
  it("returns a mapped Idea from /ideas/next", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          id: 7,
          title_en: "ML Project",
          title_ar: "مشروع تعلم آلة",
          category: "AI/ML",
          short_desc_en: "A test",
          short_desc_ar: "",
          university: "MIT",
          country: "USA",
          tech_stack: ["Python"],
          difficulty: "beginner",
          rating: 5,
          featured: false,
          description: "A machine learning project",
          technologies: ["Python"],
        },
      }),
    );

    const idea = await fetchNextIdea();

    expect(idea.id).toBe("7");
    expect(idea.title).toBe("ML Project");
    expect(idea.difficulty).toBe("beginner");
    expect(idea.keywords).toContain("Python");
    expect(fetch).toHaveBeenCalledWith("/api/ideas/next", expect.any(Object));
  });

  it("keeps localized metadata, image, and source URL from /ideas/next", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          id: 9,
          title_en: "Arabic Ready Project",
          title_ar: "مشروع يدعم العربية",
          category: "Web Applications",
          short_desc_en: "English short description",
          short_desc_ar: "وصف عربي مختصر",
          description: "English long description",
          description_ar: "وصف عربي تفصيلي",
          university: "Cairo University",
          country: "Egypt",
          tech_stack: ["React"],
          difficulty: "intermediate",
          rating: 0,
          featured: false,
          technologies: ["React"],
          image_url: "https://example.com/image.jpg",
          source_url: "https://example.com/source",
        },
      }),
    );

    const idea = await fetchNextIdea();

    expect(idea.title_ar).toBe("مشروع يدعم العربية");
    expect(idea.description_ar).toBe("وصف عربي تفصيلي");
    expect(idea.image_url).toBe("https://example.com/image.jpg");
    expect(idea.source_url).toBe("https://example.com/source");
    expect(idea.country).toBe("Egypt");
  });

  it("sends active queued idea ids to /ideas/next", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          id: 8,
          title_en: "Next Project",
          title_ar: "",
          category: "AI/ML",
          short_desc_en: "A test",
          short_desc_ar: "",
          university: "MIT",
          country: "USA",
          tech_stack: ["Python"],
          difficulty: "beginner",
          rating: 5,
          featured: false,
          description: "A project",
          technologies: ["Python"],
        },
      }),
    );

    await fetchNextIdea(["1", "2"]);

    expect(fetch).toHaveBeenCalledWith(
      "/api/ideas/next?exclude_ids=1%2C2",
      expect.any(Object),
    );
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: "Not found" }, 404),
    );

    await expect(fetchNextIdea()).rejects.toThrow("Not found");
  });
});

describe("fetchIdeaById", () => {
  it("returns a mapped idea from /ideas/:id", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          id: 3,
          title_en: "Social Media Sentiment Analysis Platform",
          title_ar: "منصة تحليل المشاعر",
          category: "Data Science",
          short_desc_en: "A test",
          short_desc_ar: "",
          university: "UC Berkeley",
          country: "USA",
          tech_stack: ["Python"],
          difficulty: "intermediate",
          rating: 0,
          featured: false,
          description: "Analyze opinions from social media posts",
          technologies: ["Python"],
        },
      }),
    );

    const idea = await fetchIdeaById("3");

    expect(idea.id).toBe("3");
    expect(idea.title).toBe("Social Media Sentiment Analysis Platform");
    expect(fetch).toHaveBeenCalledWith("/api/ideas/3", expect.any(Object));
  });
});

describe("submitSwipe", () => {
  it("sends swipe event as POST to /swipe", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          swipe_id: "swipe_1",
          updated_preferences: {
            category_weights: { "AI/ML": 0.6 },
            keyword_weights: {},
            excluded_categories: [],
            difficulty_preference: null,
            last_updated: new Date().toISOString(),
          },
        },
      }),
    );

    const result = await submitSwipe({
      idea_id: 1,
      direction: "right",
      dwell_time_ms: 1500,
    });

    expect(result.swipe_id).toBe("swipe_1");
    expect(result.updated_preferences.category_weights["AI/ML"]).toBe(0.6);
    expect(fetch).toHaveBeenCalledWith(
      "/api/swipe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idea_id: 1, direction: "right", dwell_time_ms: 1500 }),
      }),
    );
  });

  it("throws on validation error from backend", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(
        { success: false, error: "Validation failed", code: "VALIDATION_ERROR" },
        400,
      ),
    );

    await expect(
      submitSwipe({ idea_id: -1, direction: "right", dwell_time_ms: 0 }),
    ).rejects.toThrow("Validation failed");
  });
});

describe("fetchPreferences", () => {
  it("returns preference vector from /preferences", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          category_weights: { "AI/ML": 0.8 },
          keyword_weights: { python: 0.5 },
          excluded_categories: [],
          difficulty_preference: null,
          last_updated: new Date().toISOString(),
        },
      }),
    );

    const prefs = await fetchPreferences();

    expect(prefs.category_weights["AI/ML"]).toBe(0.8);
    expect(prefs.last_updated).toBeDefined();
    expect(fetch).toHaveBeenCalledWith("/api/preferences", expect.any(Object));
  });
});

describe("updatePreferences", () => {
  it("sends partial prefs as POST to /preferences", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          category_weights: { Web: 0.9 },
          keyword_weights: {},
          excluded_categories: [],
          difficulty_preference: null,
          last_updated: new Date().toISOString(),
        },
      }),
    );

    const result = await updatePreferences({
      category_weights: { Web: 0.9 },
    });

    expect(result.category_weights.Web).toBe(0.9);
    expect(fetch).toHaveBeenCalledWith(
      "/api/preferences",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ category_weights: { Web: 0.9 } }),
      }),
    );
  });
});

describe("fetchHistory", () => {
  it("returns paginated swipe history", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          records: [
            {
              id: "swipe_1",
              idea_id: 1,
              direction: "right",
              rating: 4,
              dwell_time_ms: 1500,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        meta: { page: 1, limit: 20, total: 1 },
      }),
    );

    const history = await fetchHistory(1, 20);

    expect(history.success).toBe(true);
    expect(history.data).toHaveLength(1);
    expect(history.data[0].idea_id).toBe(1);
  });

  it("keeps supporting legacy array-shaped history responses", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: [
          {
            id: "swipe_1",
            idea_id: 1,
            direction: "right",
            dwell_time_ms: 1500,
            timestamp: new Date().toISOString(),
          },
        ],
        meta: { page: 1, limit: 20, total: 1 },
      }),
    );

    const history = await fetchHistory(1, 20);

    expect(history.data).toHaveLength(1);
    expect(history.data[0].idea_id).toBe(1);
  });

  it("passes filter param when provided", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ success: true, data: { records: [] }, meta: { page: 1, limit: 20, total: 0 } }),
    );

    await fetchHistory(1, 20, "starred");

    expect(fetch).toHaveBeenCalledWith(
      "/api/history?page=1&limit=20&filter=starred",
      expect.any(Object),
    );
  });

  it("maps nested backend idea details in history records", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        success: true,
        data: {
          records: [
            {
              id: "swipe_1",
              idea_id: 2,
              direction: "up",
              dwell_time_ms: 500,
              timestamp: new Date().toISOString(),
              idea: {
                id: 2,
                title_en: "NLP-Powered Mental Health Support Chatbot",
                title_ar: "",
                category: "AI/ML",
                short_desc_en: "A test",
                short_desc_ar: "",
                university: "Stanford",
                country: "USA",
                tech_stack: ["Python", "Transformers"],
                difficulty: "advanced",
                rating: 0,
                featured: true,
                description: "A mental health support chatbot",
                technologies: ["Python", "Transformers"],
              },
            },
          ],
        },
        meta: { page: 1, limit: 20, total: 1 },
      }),
    );

    const history = await fetchHistory(1, 20);

    expect(history.data[0].direction).toBe("up");
    expect(history.data[0].idea?.title).toBe("NLP-Powered Mental Health Support Chatbot");
    expect(history.data[0].idea?.source_university).toBe("Stanford");
    expect(history.data[0].idea?.keywords).toContain("Transformers");
  });
});

describe("deleteHistoryItem", () => {
  it("sends DELETE to /history/:ideaId", async () => {
    mockFetch.mockResolvedValueOnce(
      Promise.resolve({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
      } as Response),
    );

    await deleteHistoryItem(3);

    expect(fetch).toHaveBeenCalledWith(
      "/api/history/3",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
