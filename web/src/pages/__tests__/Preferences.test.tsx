import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SwipeRecord } from "../../types/swipe";
import { Preferences } from "../Preferences";

const history: SwipeRecord[] = [
  {
    id: "swipe_1",
    idea_id: 1,
    direction: "right",
    dwell_time_ms: 0,
    timestamp: "2026-05-25T03:00:00.000Z",
  },
  {
    id: "swipe_2",
    idea_id: 2,
    direction: "left",
    dwell_time_ms: 0,
    timestamp: "2026-05-25T03:01:00.000Z",
  },
  {
    id: "swipe_3",
    idea_id: 3,
    direction: "right",
    dwell_time_ms: 0,
    timestamp: "2026-05-25T03:02:00.000Z",
  },
];

vi.mock("../../hooks/usePreferences", () => ({
  usePreferences: () => ({
    preferences: {
      category_weights: { "AI/ML": 0.6 },
      keyword_weights: { python: 0.7 },
      excluded_categories: [],
      difficulty_preference: null,
      last_updated: "2026-05-25T03:00:00.000Z",
    },
    loading: false,
    toggleExcludedCategory: vi.fn(),
    isCategoryExcluded: () => false,
  }),
}));

vi.mock("../../store", () => ({
  useStore: (selector: (state: unknown) => unknown) =>
    selector({
      language: "en",
      history,
      historyTotal: history.length,
      loadHistory: vi.fn(),
    }),
}));

function statValue(label: string): string {
  const card = screen.getByText(label).parentElement;
  return card?.querySelector("span")?.textContent ?? "";
}

describe("Preferences", () => {
  it("renders summary stats from loaded swipe history", () => {
    render(<Preferences />);

    expect(statValue("Total swipes")).toBe("3");
    expect(statValue("Liked")).toBe("2");
    expect(statValue("Like rate")).toBe("67%");
  });
});
