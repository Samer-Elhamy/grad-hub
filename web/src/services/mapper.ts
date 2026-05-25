/* ════════════════════════════════════════
   API Response Mapper — Grad Projects Hub v3
   Transforms backend raw JSON → Idea interface
   ════════════════════════════════════════ */

import type { Idea } from "../types/swipe";

/**
 * Raw shape returned by GET /api/ideas/next from the backend.
 * Uses camelCase keys (as received from Express serialization).
 */
interface RawIdea {
  id: number;
  title_ar: string;
  title_en: string;
  category: string;
  short_desc_ar: string;
  short_desc_en: string;
  description_ar?: string;
  university: string;
  country: string;
  tech_stack: string[];
  difficulty: string;
  rating: number;
  featured: boolean;
  description: string;
  technologies: string[];
  image_url?: string;
  source_url?: string;
}

/**
 * Arabic → English difficulty mapping.
 */
function mapDifficulty(diff: string): "beginner" | "intermediate" | "advanced" {
  const map: Record<string, "beginner" | "intermediate" | "advanced"> = {
    "مبتدئ": "beginner",
    "beginner": "beginner",
    "easy": "beginner",
    "متوسط": "intermediate",
    "intermediate": "intermediate",
    "medium": "intermediate",
    "متقدم": "advanced",
    "advanced": "advanced",
    "hard": "advanced",
  };
  return map[diff] ?? "intermediate";
}

/**
 * Estimated completion time based on difficulty level.
 */
function estimateTime(difficulty: "beginner" | "intermediate" | "advanced"): string {
  const map: Record<string, string> = {
    "beginner": "2–4 weeks",
    "intermediate": "1–3 months",
    "advanced": "3–6 months",
  };
  return map[difficulty];
}

/**
 * Convert a raw API response into the frontend Idea interface.
 * Maps snake_case/camelCase fields and translates Arabic values.
 */
export function mapIdea(raw: RawIdea): Idea {
  const difficulty = mapDifficulty(raw.difficulty);

  return {
    id: String(raw.id),
    title: raw.title_en,
    title_en: raw.title_en,
    title_ar: raw.title_ar,
    description: raw.description,
    description_en: raw.description,
    description_ar: raw.description_ar ?? raw.short_desc_ar,
    category: raw.category,
    keywords: (raw.tech_stack?.length ? raw.tech_stack : raw.technologies) ?? [],
    difficulty,
    estimated_time: estimateTime(difficulty),
    image_url: raw.image_url,
    source_url: raw.source_url,
    source_university: raw.university,
    country: raw.country,
    created_at: new Date().toISOString(),
  };
}
