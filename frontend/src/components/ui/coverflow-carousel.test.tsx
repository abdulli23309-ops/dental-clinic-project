import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CoverflowCarousel } from "./coverflow-carousel";

const makeItems = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `item-${i}`, label: `Item ${i + 1}` }));

interface TestItem {
  id: string;
  label: string;
}

const Comp = ({
  items,
  activeIndex = 0,
  isRtl = false,
}: {
  items: TestItem[];
  activeIndex?: number;
  isRtl?: boolean;
}) => {
  const [idx, setIdx] = useState(activeIndex);
  return (
    <CoverflowCarousel
      items={items}
      activeIndex={idx}
      onChange={setIdx}
      getItemKey={(it: TestItem) => it.id}
      isRtl={isRtl}
      itemAriaLabelPrefix="item"
      renderItem={(item: TestItem, _i, { isFront }) => (
        <span
          data-testid={`card-${item.id}`}
          data-carousel-active={isFront ? "true" : "false"}
        >
          {item.label}
        </span>
      )}
    />
  );
};

describe("CoverflowCarousel core logic", () => {
  it("renders one dot per item", () => {
    render(<Comp items={makeItems(5)} />);
    const dots = screen.getAllByRole("button", { name: /^Go to item \d+$/ });
    expect(dots).toHaveLength(5);
  });

  it("hides dots and arrows for a single item", () => {
    render(<Comp items={makeItems(1)} />);
    expect(screen.queryAllByRole("button", { name: /^Go to item/ })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });

  it("renders center plus side neighbors for 5 items", () => {
    render(<Comp items={makeItems(5)} />);
    expect(screen.getByTestId("card-item-0")).toHaveAttribute("data-carousel-active", "true");
    expect(screen.getByTestId("card-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-item-4")).toBeInTheDocument();
  });

  it("advances one card on next click", () => {
    render(<Comp items={makeItems(5)} />);
    expect(screen.getByTestId("card-item-0")).toHaveAttribute("data-carousel-active", "true");
    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    fireEvent.click(nextButtons[0]);
    expect(screen.getByTestId("card-item-1")).toHaveAttribute("data-carousel-active", "true");
    fireEvent.click(nextButtons[0]);
    expect(screen.getByTestId("card-item-2")).toHaveAttribute("data-carousel-active", "true");
  });

  it("moves back one card on prev click", () => {
    render(<Comp items={makeItems(5)} activeIndex={2} />);
    expect(screen.getByTestId("card-item-2")).toHaveAttribute("data-carousel-active", "true");
    const prevButtons = screen.getAllByRole("button", { name: "Previous" });
    fireEvent.click(prevButtons[0]);
    expect(screen.getByTestId("card-item-1")).toHaveAttribute("data-carousel-active", "true");
  });

  it("clicking a dot centers that item", () => {
    render(<Comp items={makeItems(5)} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to item 5" }));
    expect(screen.getByTestId("card-item-4")).toHaveAttribute("data-carousel-active", "true");
  });

  it("clicking a visible side card centers it", () => {
    render(<Comp items={makeItems(5)} />);
    fireEvent.click(screen.getByTestId("card-item-1"));
    expect(screen.getByTestId("card-item-1")).toHaveAttribute("data-carousel-active", "true");
  });

  it("2-item filter shows center + one neighbor with 2 dots", () => {
    render(<Comp items={makeItems(2)} />);
    expect(screen.getByTestId("card-item-0")).toHaveAttribute("data-carousel-active", "true");
    expect(screen.getByTestId("card-item-1")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Go to item/ })).toHaveLength(2);
  });

  it("3-item filter shows center + both neighbors with 3 dots", () => {
    render(<Comp items={makeItems(3)} />);
    expect(screen.getByTestId("card-item-0")).toHaveAttribute("data-carousel-active", "true");
    expect(screen.getByTestId("card-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-item-2")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Go to item/ })).toHaveLength(3);
  });

  it("wraps around when advancing past the last item", () => {
    render(<Comp items={makeItems(5)} activeIndex={4} />);
    expect(screen.getByTestId("card-item-4")).toHaveAttribute("data-carousel-active", "true");
    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    fireEvent.click(nextButtons[0]);
    expect(screen.getByTestId("card-item-0")).toHaveAttribute("data-carousel-active", "true");
  });

  it("RTL next button still advances the carousel", () => {
    render(<Comp items={makeItems(5)} isRtl />);
    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    fireEvent.click(nextButtons[0]);
    expect(screen.getByTestId("card-item-1")).toHaveAttribute("data-carousel-active", "true");
  });

  it("every rendered card has real content (no blank placeholders)", () => {
    render(<Comp items={makeItems(6)} />);
    const cards = screen.getAllByTestId(/^card-item-/);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.textContent?.trim()).not.toBe("");
    }
  });
});
