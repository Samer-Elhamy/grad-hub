import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const preferenceActions = vi.hoisted(() => ({
  markCategoryLiked: vi.fn(),
  markCategoryDisliked: vi.fn(),
  clearCategoryPreference: vi.fn(),
}));

vi.mock("../../hooks/usePreferences", () => ({
  usePreferences: () => ({
    preferences: {
      category_weights: { "AI/ML": 0.6 },
      keyword_weights: { python: 0.7 },
      excluded_categories: ["DevOps"],
      difficulty_preference: null,
      last_updated: "2026-05-25T03:00:00.000Z",
    },
    loading: false,
    toggleExcludedCategory: vi.fn(),
    isCategoryExcluded: (category: string) => category === "DevOps",
    markCategoryLiked: preferenceActions.markCategoryLiked,
    markCategoryDisliked: preferenceActions.markCategoryDisliked,
    clearCategoryPreference: preferenceActions.clearCategoryPreference,
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
  beforeEach(() => {
    preferenceActions.markCategoryLiked.mockClear();
    preferenceActions.markCategoryDisliked.mockClear();
    preferenceActions.clearCategoryPreference.mockClear();
  });

  it("renders summary stats from loaded swipe history", () => {
    render(<Preferences />);

    expect(statValue("Total swipes")).toBe("3");
    expect(statValue("Liked")).toBe("2");
    expect(statValue("Like rate")).toBe("67%");
  });

  it("groups categories into available, liked, and disliked zones", () => {
    render(<Preferences />);

    expect(screen.getByText("Available Categories")).toBeInTheDocument();
    expect(screen.getByText("Liked Categories")).toBeInTheDocument();
    expect(screen.getByText("Disliked Categories")).toBeInTheDocument();
    expect(within(screen.getByTestId("liked-categories")).getByText("AI/ML")).toBeInTheDocument();
    expect(within(screen.getByTestId("disliked-categories")).getByText("DevOps")).toBeInTheDocument();
  });

  it("moves categories with explicit click actions", () => {
    render(<Preferences />);

    const likeButton = screen.getByRole("button", {
      name: "Move Web Applications to preferred categories",
    });
    const dislikeButton = screen.getByRole("button", {
      name: "Move AI/ML to avoided categories",
    });
    const clearButton = screen.getByRole("button", { name: "Clear DevOps preference" });

    expect(likeButton).not.toHaveTextContent("Like");
    expect(dislikeButton).not.toHaveTextContent("Dislike");
    expect(likeButton).not.toHaveAttribute("title", "Like");
    expect(dislikeButton).not.toHaveAttribute("title", "Dislike");

    fireEvent.click(likeButton);
    fireEvent.click(dislikeButton);
    fireEvent.click(clearButton);

    expect(preferenceActions.markCategoryLiked).toHaveBeenCalledWith("Web Applications");
    expect(preferenceActions.markCategoryDisliked).toHaveBeenCalledWith("AI/ML");
    expect(preferenceActions.clearCategoryPreference).toHaveBeenCalledWith("DevOps");
  });
});
