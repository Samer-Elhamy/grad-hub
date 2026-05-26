import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MainFeed } from "../MainFeed";

const storeState = {
  language: "en" as const,
  cards: [
    {
      id: "idea-1",
      title: "Offline Study Planner",
      description: "A planner for students.",
      category: "AI/ML",
      keywords: ["flutter"],
      difficulty: "intermediate" as const,
      estimated_time: "8 weeks",
      created_at: "2026-05-25T00:00:00.000Z",
    },
  ],
  currentIndex: 0,
  consumeTopCard: vi.fn(),
  performSwipe: vi.fn(),
  loadNextCards: vi.fn(),
};

vi.mock("../../hooks/useWebSocket", () => ({
  useWebSocket: () => ({ status: "offline" }),
}));

vi.mock("../../store", () => ({
  useStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

describe("MainFeed", () => {
  it("renders subtle side controls for quick left and right swipes", () => {
    storeState.consumeTopCard.mockReturnValue(storeState.cards[0]);

    render(<MainFeed />);

    const leftButton = screen.getByTestId("discover-side-dislike");
    const rightButton = screen.getByTestId("discover-side-like");
    expect(leftButton).toBeInTheDocument();
    expect(rightButton).toBeInTheDocument();

    fireEvent.click(rightButton);
    expect(storeState.performSwipe).toHaveBeenCalledWith(storeState.cards[0], "right");
  });
});
