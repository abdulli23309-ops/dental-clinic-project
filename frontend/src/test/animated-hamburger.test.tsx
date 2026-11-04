import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnimatedHamburger } from "@/components/ui/animated-hamburger";

describe("AnimatedHamburger Component", () => {
  it("renders with closed aria-expanded state and toggles on click", () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <AnimatedHamburger isOpen={false} onClick={handleClick} aria-label="Toggle menu" />
    );

    const button = screen.getByRole("button", { name: "Toggle menu" });
    expect(button).toBeDefined();
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Re-render as open
    rerender(<AnimatedHamburger isOpen={true} onClick={handleClick} aria-label="Toggle menu" />);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });
});

