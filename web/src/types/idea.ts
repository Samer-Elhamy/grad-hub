/* ════════════════════════════════════════
   Idea Types — Grad Projects Hub v3
   ════════════════════════════════════════ */

export interface Idea {
  id: string;
  title: string;
  title_en?: string;
  title_ar?: string;
  description: string;
  description_en?: string;
  description_ar?: string;
  category: string;
  keywords: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_time: string;
  image_url?: string;
  source_url?: string;
  source_university?: string;
  country?: string;
  created_at: string;
}

export interface IdeaResponse {
  success: boolean;
  data: Idea;
}

export interface IdeaListResponse {
  success: boolean;
  data: Idea[];
  meta?: {
    remaining: number;
  };
}
