/* ════════════════════════════════════════
   Zustand Store Tests — Grad Projects Hub v3
   ════════════════════════════════════════ */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "../index";
import type { Idea, SwipeRecord, PreferenceVector } from "../../types/swipe";

/* ── Mock API module ──────────────────────────────────────────── */

vi.mock("../../services/api", () => ({
  deleteHistoryItem: vi.fn(),
  fetchIdeaById: vi.fn(),
  fetchNextIdea: vi.fn(),
  submitSwipe: vi.fn(),
  fetchHistory: vi.fn(),
  fetchPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));

const mockApi = await import("../../services/api");

/* ── Mock document for theme tests ────────────────────────────── */

beforeEach(() => {
  // Reset store to defaults
  useStore.setState({
    theme: "light",
    language: "en",
    cards: [],
    currentIndex: 0,
    isLoadingCards: false,
    history: [],
    historyPage: 1,
    historyTotal: 0,
    historyLoading: false,
    historyFilter: "all",
    preferences: null,
    prefsLoading: false,
    toasts: [],
  });
  vi.clearAllMocks();

  // Mock localStorage
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
});

/* ── Helpers ──────────────────────────────────────────────────── */

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: String(overrides.id ?? "1"),
    title: "Test Idea",
    description: "A test idea",
    category: "AI/ML",
    keywords: ["python"],
    difficulty: "intermediate",
    estimated_time: "1–3 months",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/* ── Tests ────────────────────────────────────────────────────── */

describe("Theme", () => {
  it("starts with light theme", () => {
    expect(useStore.getState().theme).toBe("light");
  });

  it("toggleTheme switches between light and dark", () => {
    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe("dark");

    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe("light");
  });

  it("setTheme persists to localStorage", () => {
    useStore.getState().setTheme("dark");
    expect(localStorage.setItem).toHaveBeenCalledWith("grad-hub-theme", "dark");
  });
});

describe("Language", () => {
  it("toggles language between English and Arabic and persists it", () => {
    expect(useStore.getState().language).toBe("en");

    useStore.getState().toggleLanguage();

    expect(useStore.getState().language).toBe("ar");
    expect(localStorage.setItem).toHaveBeenCalledWith("grad-hub-language", "ar");

    useStore.getState().toggleLanguage();

    expect(useStore.getState().language).toBe("en");
    expect(localStorage.setItem).toHaveBeenCalledWith("grad-hub-language", "en");
  });
});

describe("Card Stack", () => {
  it("consumeTopCard returns null for empty stack", () => {
    const card = useStore.getState().consumeTopCard();
    expect(card).toBeNull();
  });

  it("consumeTopCard returns the top card and advances index", () => {
    const idea = makeIdea({ id: "1", title: "First" });
    const idea2 = makeIdea({ id: "2", title: "Second" });
    useStore.setState({ cards: [idea, idea2], currentIndex: 0 });

    const top = useStore.getState().consumeTopCard();
    expect(top?.title).toBe("First");
    expect(useStore.getState().currentIndex).toBe(1);
  });

  it("loadNextCards fetches idea from API", async () => {
    const idea = makeIdea({ id: "42", title: "Fetched" });
    vi.mocked(mockApi.fetchNextIdea).mockResolvedValueOnce(idea);

    await useStore.getState().loadNextCards();

    expect(mockApi.fetchNextIdea).toHaveBeenCalledOnce();
    const cards = useStore.getState().cards;
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Fetched");
    expect(mockApi.fetchNextIdea).toHaveBeenCalledWith([]);
  });

  it("loadNextCards asks the API to exclude active queued ideas", async () => {
    const idea = makeIdea({ id: "42", title: "Fetched" });
    const nextIdea = makeIdea({ id: "99", title: "Next" });
    useStore.setState({ cards: [idea], currentIndex: 0 });
    vi.mocked(mockApi.fetchNextIdea).mockResolvedValueOnce(nextIdea);

    await useStore.getState().loadNextCards();

    expect(mockApi.fetchNextIdea).toHaveBeenCalledWith(["42"]);
    expect(useStore.getState().cards).toHaveLength(2);
  });

  it("loadNextCards shows toast on API failure", async () => {
    vi.mocked(mockApi.fetchNextIdea).mockRejectedValueOnce(new Error("Network error"));

    await useStore.getState().loadNextCards();

    const toasts = useStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe("error");
    expect(toasts[0].message).toBe("Network error");
  });

  it("isLoadingCards prevents duplicate calls", async () => {
    useStore.setState({ isLoadingCards: true });
    await useStore.getState().loadNextCards();
    expect(mockApi.fetchNextIdea).not.toHaveBeenCalled();
  });
});

describe("Swipe History", () => {
  it("loadHistory fetches paginated history", async () => {
    const records: SwipeRecord[] = [
      {
        id: "swipe_1",
        idea_id: 1,
        direction: "right",
        rating: 4,
        dwell_time_ms: 1500,
        timestamp: new Date().toISOString(),
      },
    ];
    vi.mocked(mockApi.fetchHistory).mockResolvedValueOnce({
      success: true,
      data: records,
      meta: { page: 1, limit: 20, total: 1 },
    });

    await useStore.getState().loadHistory(1);

    expect(useStore.getState().history).toEqual(records);
    expect(useStore.getState().historyTotal).toBe(1);
  });

  it("setHistoryFilter resets page and reloads", async () => {
    vi.mocked(mockApi.fetchHistory).mockResolvedValue({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });

    useStore.getState().setHistoryFilter("liked");

    expect(useStore.getState().historyFilter).toBe("liked");
    expect(useStore.getState().historyPage).toBe(1);
    expect(mockApi.fetchHistory).toHaveBeenCalled();
  });

  it("deleteHistoryItem removes an idea from loaded history", async () => {
    const records: SwipeRecord[] = [
      {
        id: "swipe_1",
        idea_id: 3,
        direction: "right",
        rating: 5,
        dwell_time_ms: 1500,
        timestamp: new Date().toISOString(),
      },
    ];
    useStore.setState({ history: records, historyTotal: 1 });
    vi.mocked(mockApi.deleteHistoryItem).mockResolvedValueOnce(undefined);

    await useStore.getState().deleteHistoryItem(3);

    expect(mockApi.deleteHistoryItem).toHaveBeenCalledWith(3);
    expect(useStore.getState().history).toHaveLength(0);
    expect(useStore.getState().historyTotal).toBe(0);
  });
});

describe("Preferences", () => {
  it("loadPreferences fetches and stores preference vector", async () => {
    const prefs: PreferenceVector = {
      category_weights: { "AI/ML": 0.8 },
      keyword_weights: {},
      excluded_categories: [],
      difficulty_preference: null,
      last_updated: new Date().toISOString(),
    };
    vi.mocked(mockApi.fetchPreferences).mockResolvedValueOnce(prefs);

    await useStore.getState().loadPreferences();

    expect(useStore.getState().preferences).toEqual(prefs);
  });

  it("savePreferences updates and shows success toast", async () => {
    const updated: PreferenceVector = {
      category_weights: { Web: 0.9 },
      keyword_weights: {},
      excluded_categories: [],
      difficulty_preference: null,
      last_updated: new Date().toISOString(),
    };
    vi.mocked(mockApi.updatePreferences).mockResolvedValueOnce(updated);

    await useStore.getState().savePreferences({ category_weights: { Web: 0.9 } });

    expect(useStore.getState().preferences).toEqual(updated);
    expect(useStore.getState().toasts.some((t) => t.type === "success")).toBe(true);
  });
});

describe("performSwipe", () => {
  it("sends numeric idea_id and maps direction", async () => {
    vi.mocked(mockApi.submitSwipe).mockResolvedValueOnce({
      swipe_id: "swipe_1",
      updated_preferences: {
        category_weights: { "AI/ML": 0.6 },
        keyword_weights: {},
        excluded_categories: [],
        difficulty_preference: null,
        last_updated: new Date().toISOString(),
      },
    });
    const idea = makeIdea({ id: "7" });

    await useStore.getState().performSwipe(idea, "right");

    expect(mockApi.submitSwipe).toHaveBeenCalledWith({
      idea_id: 7,
      direction: "right",
      dwell_time_ms: 0,
    });
  });

  it("keeps up direction as a separate star swipe", async () => {
    vi.mocked(mockApi.submitSwipe).mockResolvedValueOnce({
      swipe_id: "swipe_2",
      updated_preferences: {
        category_weights: { "AI/ML": 0.6 },
        keyword_weights: {},
        excluded_categories: [],
        difficulty_preference: null,
        last_updated: new Date().toISOString(),
      },
    });
    const idea = makeIdea({ id: "3" });

    await useStore.getState().performSwipe(idea, "up");

    expect(mockApi.submitSwipe).toHaveBeenCalledWith({
      idea_id: 3,
      direction: "up",
      dwell_time_ms: 0,
    });
  });

  it("shows toast on API failure", async () => {
    vi.mocked(mockApi.submitSwipe).mockRejectedValueOnce(new Error("Server error"));
    const idea = makeIdea();

    await useStore.getState().performSwipe(idea, "left");

    expect(useStore.getState().toasts.some((t) => t.type === "error")).toBe(true);
  });
});

describe("Toasts", () => {
  it("addToast appends a toast with auto-generated id", () => {
    useStore.getState().addToast("Hello", "success");
    const toasts = useStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Hello");
    expect(toasts[0].type).toBe("success");
    expect(toasts[0].id).toBeDefined();
  });

  it("removeToast removes by id", () => {
    useStore.getState().addToast("One", "error");
    useStore.getState().addToast("Two", "success");
    const id = useStore.getState().toasts[0].id;

    useStore.getState().removeToast(id);

    expect(useStore.getState().toasts).toHaveLength(1);
    expect(useStore.getState().toasts[0].message).toBe("Two");
  });
});
