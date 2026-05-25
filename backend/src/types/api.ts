/**
 * Shared API types for Grad Projects Hub v3
 */

/** Standard API success response envelope */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

/** Standard API error response envelope */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Standard error codes used across all endpoints */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

/** Swipe direction enum */
export type SwipeDirection = 'left' | 'right' | 'up';

/** Rating scale 1-5 */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** A single project/idea */
export interface Idea {
  id: number;
  title_ar: string;
  title_en: string;
  category: string;
  short_desc_ar: string;
  short_desc_en: string;
  university: string;
  country: string;
  tech_stack: string[];
  difficulty: string;
  rating: number;
  featured: boolean;
  description: string;
  description_ar: string;
  technologies: string[];
  image_url: string;
  source_url: string;
}

/** Preference vector — the learned/customized weights */
export interface PreferenceVector {
  category_weights: Record<string, number>;
  keyword_weights: Record<string, number>;
  excluded_categories: string[];
  difficulty_preference: string | null;
  last_updated: string;
}

/** A swipe interaction record */
export interface SwipeRecord {
  id: string;
  idea_id: number;
  direction: SwipeDirection;
  dwell_time_ms?: number;
  rating?: Rating;
  timestamp: string;
  idea?: Idea;
}

/** WebSocket message types */
export interface WsNewIdeaMessage {
  type: 'new_idea';
  data: Idea;
}

export interface WsPreferenceUpdateMessage {
  type: 'preference_update';
  data: PreferenceVector;
}

export type WsServerMessage = WsNewIdeaMessage | WsPreferenceUpdateMessage;
