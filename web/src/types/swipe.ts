/* ════════════════════════════════════════
   Swipe Types — Grad Projects Hub v3
   ════════════════════════════════════════ */

import type { Idea } from "./idea";

// Re-export Idea types so store/services can import from one module
export type { Idea, IdeaResponse, IdeaListResponse } from "./idea";

export type SwipeDirection = "left" | "right" | "up";

export interface SwipeEvent {
  idea_id: number;
  direction: 'left' | 'right' | 'up';
  dwell_time_ms: number;
  rating?: number;
}

export interface SwipeRecord {
  id: string;
  idea_id: number;
  direction: SwipeDirection;
  rating?: number;
  dwell_time_ms: number;
  timestamp: string;
  idea?: Idea;
}

export interface SwipeResponse {
  success: boolean;
  data: {
    swipe_id: string;
    updated_preferences: PreferenceVector;
  };
}

export interface SwipeHistoryResponse {
  success: boolean;
  data: SwipeRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface PreferenceVector {
  category_weights: Record<string, number>;
  keyword_weights: Record<string, number>;
  excluded_categories: string[];
  difficulty_preference?: string | null;
  last_updated: string;
}

export interface PreferenceResponse {
  success: boolean;
  data: PreferenceVector;
}
