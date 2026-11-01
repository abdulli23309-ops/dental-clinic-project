import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LightboxProvider, useLightbox } from "@/components/providers/lightbox-provider";
import { ExpandableImage } from "@/components/ui/expandable-image";

function TestConsumer() {
  const { activeImage, openLightbox, closeLightbox } = useLightbox();
  return (
    <div>
      <span data-testid="status">{activeImage ? "open" : "closed"}</span>
      <span data-testid="caption">{activeImage?.caption || ""}</span>
      <button
        data-testid="open-btn"
        onClick={() =>
          openLightbox({
            layoutId: "test-img-1",
            src: "/images/gallery-1.jpg",
            alt: "Sterile Surgical Suite",
            caption: "Sterile Surgical Suite",
          })
        }
      >
        Open
      </button>
      <button data-testid="close-btn" onClick={closeLightbox}>
        Close
      </button>
    </div>
  );
}

describe("Global Shared-Element Lightbox System", () => {
  it("renders expandable thumbnail and triggers lightbox context on click", () => {
    render(
      <LightboxProvider>
        <TestConsumer />
        <ExpandableImage
          src="/images/gallery-1.jpg"
          alt="Sterile Surgical Suite"
          caption="Sterile Surgical Suite"
          layoutId="test-gallery-1"
        />
      </LightboxProvider>
    );

    // Initial thumbnail is rendered
    const thumbnail = screen.getByRole("button", { name: /view expanded image/i });
    expect(thumbnail).toBeDefined();

    expect(screen.getByTestId("status").textContent).toBe("closed");

    // Click to expand thumbnail
    fireEvent.click(thumbnail);

    expect(screen.getByTestId("status").textContent).toBe("open");
    expect(screen.getByRole("dialog")).toBeDefined();

    // Floating close button exists
    const closeBtn = screen.getByRole("button", { name: /close image preview/i });
    expect(closeBtn).toBeDefined();

    // Caption is rendered in modal
    expect(screen.getAllByText("Sterile Surgical Suite").length).toBeGreaterThan(0);
  });

  it("closes active image state when close is triggered", () => {
    render(
      <LightboxProvider>
        <TestConsumer />
      </LightboxProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("closed");

    fireEvent.click(screen.getByTestId("open-btn"));
    expect(screen.getByTestId("status").textContent).toBe("open");

    fireEvent.click(screen.getByTestId("close-btn"));
    expect(screen.getByTestId("status").textContent).toBe("closed");
  });

  it("closes modal state when pressing Escape key", () => {
    render(
      <LightboxProvider>
        <TestConsumer />
      </LightboxProvider>
    );

    fireEvent.click(screen.getByTestId("open-btn"));
    expect(screen.getByTestId("status").textContent).toBe("open");

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("status").textContent).toBe("closed");
  });
});
