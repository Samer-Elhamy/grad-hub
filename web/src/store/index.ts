/* ════════════════════════════════════════
   Zustand Store — Grad Projects Hub v3
   Central state: theme, cards, history, preferences, toasts
   ════════════════════════════════════════ */

import { create } from "zustand";
import type { Idea, SwipeDirection, SwipeRecord, PreferenceVector } from "../types/swipe";
import * as api from "../services/api";

interface Toast {
  id: string;
  message: string;
  type: "error" | "success";
}

interface AppState {
  /* ── Language ── */
  language: "en" | "ar";
  setLanguage: (language: "en" | "ar") => void;
  toggleLanguage: () => void;

  /* ── Theme ── */
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;

  /* ── Card Stack ── */
  cards: Idea[];
  currentIndex: number;
  isLoadingCards: boolean;
  loadNextCards: () => Promise<void>;
  consumeTopCard: () => Idea | null;

  /* ── Swipe History ── */
  history: SwipeRecord[];
  historyPage: number;
  historyTotal: number;
  historyLoading: boolean;
  historyFilter: "all" | "liked" | "disliked" | "starred";
  loadHistory: (page?: number, limit?: number) => Promise<void>;
  deleteHistoryItem: (ideaId: number) => Promise<void>;
  setHistoryFilter: (f: "all" | "liked" | "disliked" | "starred") => void;

  /* ── Preferences ── */
  preferences: PreferenceVector | null;
  prefsLoading: boolean;
  loadPreferences: () => Promise<void>;
  savePreferences: (prefs: Partial<PreferenceVector>) => Promise<void>;

  /* ── Swipe Action ── */
  performSwipe: (idea: Idea, direction: SwipeDirection) => Promise<void>;

  /* ── Toasts ── */
  toasts: Toast[];
  addToast: (message: string, type: "error" | "success") => void;
  removeToast: (id: string) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getInitialLanguage(): "en" | "ar" {
  if (typeof localStorage === "undefined") return "en";
  return localStorage.getItem("grad-hub-language") === "ar" ? "ar" : "en";
}

function applyDocumentLanguage(language: "en" | "ar") {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
}

export const useStore = create<AppState>((set, get) => ({
  /* ── Language ── */
  language: getInitialLanguage(),
  setLanguage: (language) => {
    set({ language });
    applyDocumentLanguage(language);
    localStorage.setItem("grad-hub-language", language);
  },
  toggleLanguage: () => {
    const next = get().language === "ar" ? "en" : "ar";
    get().setLanguage(next);
  },

  /* ── Theme ── */
  theme: "light",
  setTheme: (t) => {
    set({ theme: t });
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("grad-hub-theme", t);
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },

  /* ── Card Stack ── */
  cards: [],
  currentIndex: 0,
  isLoadingCards: false,
  loadNextCards: async () => {
    if (get().isLoadingCards) return;
    set({ isLoadingCards: true });
    try {
      const activeIds = get()
        .cards.slice(get().currentIndex)
        .map((card) => card.id);
      const idea = await api.fetchNextIdea(activeIds);
      set((s) => {
        const exists = s.cards
          .slice(s.currentIndex)
          .some((card) => card.id === idea.id);
        return {
          cards: exists ? s.cards : [...s.cards, idea],
          isLoadingCards: false,
        };
      });
    } catch (err) {
      set({ isLoadingCards: false });
      const msg = err instanceof Error ? err.message : "Failed to load ideas";
      get().addToast(msg, "error");
    }
  },
  consumeTopCard: () => {
    const { cards, currentIndex } = get();
    if (currentIndex >= cards.length) return null;
    const card = cards[currentIndex];
    set((s) => ({
      cards: s.cards.filter((candidate, idx) => idx <= currentIndex || candidate.id !== card.id),
      currentIndex: currentIndex + 1,
    }));

    // Auto-refill if running low
    const remaining = cards.length - (currentIndex + 1);
    if (remaining <= 1) {
      get().loadNextCards();
    }

    return card;
  },

  /* ── Swipe History ── */
  history: [],
  historyPage: 1,
  historyTotal: 0,
  historyLoading: false,
  historyFilter: "all" as "all" | "liked" | "disliked" | "starred",
  loadHistory: async (page?: number, limit = 20) => {
    set({ historyLoading: true });
    try {
      const p = page ?? get().historyPage;
      const filterValue = get().historyFilter;
      const filter = filterValue === "all" ? undefined : (filterValue as "liked" | "disliked" | "starred");
      const res = await api.fetchHistory(p, limit, filter);
      // #region agent log
      fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H2,H5',location:'web/src/store/index.ts:loadHistory',message:'frontend history response received',data:{requestedPage:p,filter,success:res.success,isDataArray:Array.isArray(res.data),dataType:typeof res.data,dataKeys:res.data && typeof res.data === 'object' ? Object.keys(res.data as unknown as Record<string, unknown>) : [],meta:res.meta},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      set({
        history: res.data,
        historyPage: res.meta.page,
        historyTotal: res.meta.total,
        historyLoading: false,
      });
    } catch (err) {
      set({ historyLoading: false });
      const msg = err instanceof Error ? err.message : "Failed to load history";
      get().addToast(msg, "error");
    }
  },
  setHistoryFilter: (f) => {
    set({ historyFilter: f, historyPage: 1 });
    get().loadHistory(1);
  },
  deleteHistoryItem: async (ideaId) => {
    try {
      await api.deleteHistoryItem(ideaId);
      set((s) => ({
        history: s.history.filter((record) => record.idea_id !== ideaId),
        historyTotal: Math.max(0, s.historyTotal - 1),
      }));
      get().addToast("History item deleted", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete history item";
      get().addToast(msg, "error");
    }
  },

  /* ── Preferences ── */
  preferences: null,
  prefsLoading: false,
  loadPreferences: async () => {
    set({ prefsLoading: true });
    try {
      const prefs = await api.fetchPreferences();
      set({ preferences: prefs, prefsLoading: false });
    } catch (err) {
      set({ prefsLoading: false });
      const msg = err instanceof Error ? err.message : "Failed to load preferences";
      get().addToast(msg, "error");
    }
  },
  savePreferences: async (prefs) => {
    try {
      const updated = await api.updatePreferences(prefs);
      // #region agent log
      fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H3,H5',location:'web/src/store/index.ts:savePreferences',message:'frontend preferences save completed',data:{sentExcludedCategories:prefs.excluded_categories,returnedExcludedCategories:updated.excluded_categories,returnedCategoryKeys:Object.keys(updated.category_weights ?? {})},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      set({ preferences: updated });
      get().addToast("Preferences saved", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save preferences";
      get().addToast(msg, "error");
    }
  },

  /* ── Swipe Action ── */
  performSwipe: async (idea, direction) => {
    // Optimistic: card is already animating out; fire API in background
    // Keep star (up) distinct from heart (right) for history and analytics.
    const event = {
      idea_id: Number(idea.id),
      direction,
      dwell_time_ms: 0, // Will be refined with actual tracking
    };

    try {
      const result = await api.submitSwipe(event);
      // #region agent log
      fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H1,H5',location:'web/src/store/index.ts:performSwipe',message:'frontend swipe submit completed',data:{ideaId:event.idea_id,direction:event.direction,dwellTimeMs:event.dwell_time_ms,swipeId:result.swipe_id,returnedCategoryWeights:result.updated_preferences?.category_weights},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      set({ preferences: result.updated_preferences });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record swipe";
      get().addToast(msg, "error");
    }
  },

  /* ── Toasts ── */
  toasts: [],
  addToast: (message, type) => {
    const id = generateId();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
