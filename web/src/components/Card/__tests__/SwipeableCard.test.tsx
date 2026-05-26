import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SwipeableCard } from "../SwipeableCard";
import type { Idea } from "../../../types/swipe";

vi.mock("../../../store", () => ({
  useStore: (selector: (state: unknown) => unknown) =>
    selector({
      language: "en",
    }),
}));

const idea: Idea = {
  id: "idea-1",
  title: "Offline Study Planner",
  description: "A planner for students.",
  category: "AI/ML",
  keywords: ["flutter", "ai"],
  difficulty: "intermediate",
  estimated_time: "8 weeks",
  created_at: "2026-05-25T00:00:00.000Z",
};

describe("SwipeableCard", () => {
  it("uses visual swipe glow overlays without LIKE or NOPE text", () => {
    render(<SwipeableCard idea={idea} onSwipe={vi.fn()} isTop />);

    expect(screen.queryByText("LIKE")).not.toBeInTheDocument();
    expect(screen.queryByText("NOPE")).not.toBeInTheDocument();
    expect(screen.getByTestId("like-glow-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("nope-glow-overlay")).toBeInTheDocument();
  });
});
