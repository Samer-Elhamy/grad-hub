/* ════════════════════════════════════════
   Mapper Tests — mapIdea transforms backend raw data → Idea
   ════════════════════════════════════════ */

import { describe, it, expect } from "vitest";
import { mapIdea } from "../mapper";

/* ── Helpers ──────────────────────────────────────────────────── */

function makeRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title_ar: "فكرة مشروع ذكاء اصطناعي",
    title_en: "AI Project Idea",
    category: "AI/ML",
    short_desc_ar: "وصف قصير",
    short_desc_en: "Short description",
    university: "MIT",
    country: "USA",
    tech_stack: ["Python", "TensorFlow"],
    difficulty: "متوسط",
    rating: 4,
    featured: false,
    description: "A full AI project description",
    technologies: ["Python", "TensorFlow", "Keras"],
    ...overrides,
  };
}

/* ── Tests ────────────────────────────────────────────────────── */

describe("mapIdea", () => {
  it("maps id from number to string", () => {
    const result = mapIdea(makeRaw({ id: 42 }));
    expect(result.id).toBe("42");
  });

  it("uses title_en as the primary title", () => {
    const result = mapIdea(makeRaw({ title_en: "My Project" }));
    expect(result.title).toBe("My Project");
  });

  it("maps category directly", () => {
    const result = mapIdea(makeRaw({ category: "Web Applications" }));
    expect(result.category).toBe("Web Applications");
  });

  it("uses tech_stack as keywords when available", () => {
    const result = mapIdea(makeRaw({ tech_stack: ["React", "Node.js"] }));
    expect(result.keywords).toEqual(["React", "Node.js"]);
  });

  it("falls back to technologies when tech_stack is null/undefined", () => {
    const result = mapIdea(
      makeRaw({ tech_stack: null, technologies: ["Django", "Postgres"] }),
    );
    expect(result.keywords).toEqual(["Django", "Postgres"]);
  });

  it("translates Arabic difficulty to English", () => {
    const result = mapIdea(makeRaw({ difficulty: "متقدم" }));
    expect(result.difficulty).toBe("advanced");
  });

  it("maps 'beginner' English difficulty correctly", () => {
    const result = mapIdea(makeRaw({ difficulty: "beginner" }));
    expect(result.difficulty).toBe("beginner");
  });

  it("maps 'easy' as beginner", () => {
    const result = mapIdea(makeRaw({ difficulty: "easy" }));
    expect(result.difficulty).toBe("beginner");
  });

  it("maps unknown difficulty to 'intermediate' as fallback", () => {
    const result = mapIdea(makeRaw({ difficulty: "unknown_value" }));
    expect(result.difficulty).toBe("intermediate");
  });

  it("estimates time as 2–4 weeks for beginner", () => {
    const result = mapIdea(makeRaw({ difficulty: "مبتدئ" }));
    expect(result.estimated_time).toBe("2–4 weeks");
  });

  it("estimates time as 1–3 months for intermediate", () => {
    const result = mapIdea(makeRaw({ difficulty: "متوسط" }));
    expect(result.estimated_time).toBe("1–3 months");
  });

  it("estimates time as 3–6 months for advanced", () => {
    const result = mapIdea(makeRaw({ difficulty: "متقدم" }));
    expect(result.estimated_time).toBe("3–6 months");
  });

  it("preserves the university source", () => {
    const result = mapIdea(makeRaw({ university: "Stanford" }));
    expect(result.source_university).toBe("Stanford");
  });

  it("returns a valid iso created_at timestamp", () => {
    const result = mapIdea(makeRaw());
    expect(() => new Date(result.created_at)).not.toThrow();
    expect(new Date(result.created_at).toISOString()).toBe(result.created_at);
  });

  it("handles undefined tech_stack gracefully", () => {
    const result = mapIdea(makeRaw({ tech_stack: undefined }));
    expect(Array.isArray(result.keywords)).toBe(true);
  });

  it("maps description directly", () => {
    const result = mapIdea(makeRaw({ description: "Long desc here" }));
    expect(result.description).toBe("Long desc here");
  });
});
