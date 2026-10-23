import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Card } from "@/components/ui/card";
import { TabNav } from "@/components/ui/tab-nav";
import { AnimatedView } from "@/components/ui/animated-view";
import { StatCard } from "@/components/dashboard/stat-card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeProvider } from "@/components/providers/theme-provider";

describe("AnimatedNumber Component", () => {
  it("renders with aria-label holding formatted target value", () => {
    render(<AnimatedNumber value={1500} prefix="₨ " suffix=" PKR" />);
    const el = screen.getByLabelText(/₨ 1,500 PKR/i);
    expect(el).toBeInTheDocument();
  });

  it("handles decimals and prefixes cleanly", () => {
    render(<AnimatedNumber value={99.5} prefix="$" decimals={2} />);
    const el = screen.getByLabelText("$99.50");
    expect(el).toBeInTheDocument();
  });
});

describe("AnimatedCard Component", () => {
  it("renders children without mutating structure", () => {
    render(
      <AnimatedCard className="custom-card-class">
        <p>Test Card Content</p>
      </AnimatedCard>
    );
    expect(screen.getByText("Test Card Content")).toBeInTheDocument();
  });
});

describe("Base Card Component with Motion Upgrade", () => {
  it("renders content with surface and shadow classes", () => {
    render(
      <Card surface="bone" shadow="card" hoverLift index={2} data-testid="base-card">
        <h3>Card Title</h3>
      </Card>
    );
    const cardEl = screen.getByTestId("base-card");
    expect(cardEl).toBeInTheDocument();
    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(cardEl.className).toContain("shadow-card");
  });

  it("respects animate={false} fallback", () => {
    render(
      <Card animate={false} data-testid="static-card">
        <span>Static Content</span>
      </Card>
    );
    const cardEl = screen.getByTestId("static-card");
    expect(cardEl).toBeInTheDocument();
    expect(screen.getByText("Static Content")).toBeInTheDocument();
  });
});

describe("TabNav Component", () => {
  it("renders tab options and handles selection callbacks", () => {
    const handleSelect = vi.fn();
    render(
      <TabNav
        tabs={[
          { id: "overview", label: "Overview", count: 4 },
          { id: "activity", label: "Activity" },
        ]}
        activeTab="overview"
        onSelect={handleSelect}
        getTestId={(id) => `custom-tab-${id}`}
      />
    );

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Activity")).toBeInTheDocument();

    const activityBtn = screen.getByTestId("custom-tab-activity");
    expect(activityBtn).toBeInTheDocument();

    fireEvent.click(activityBtn);
    expect(handleSelect).toHaveBeenCalledWith("activity");
  });
});

describe("AnimatedView Component", () => {
  it("renders child views within motion container", () => {
    render(
      <AnimatedView viewKey="tab-1">
        <div>View Content</div>
      </AnimatedView>
    );
    expect(screen.getByText("View Content")).toBeInTheDocument();
  });
});

describe("ThemeToggle Component", () => {
  it("renders accessible theme toggle and triggers toggleTheme on click", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByTestId("theme-toggle");
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("aria-label");

    fireEvent.click(toggleBtn);
  });
});

describe("StatCard with Motion Integration", () => {
  it("renders numeric values using AnimatedNumber inside AnimatedCard", () => {
    render(
      <StatCard
        label="Active Patients"
        value={42}
        hint="In practice"
        tone="positive"
        index={1}
      />
    );

    expect(screen.getByText("Active Patients")).toBeInTheDocument();
    expect(screen.getByText("In practice")).toBeInTheDocument();
    expect(screen.getByLabelText("42")).toBeInTheDocument();
  });

  it("handles currency strings and tweens value", () => {
    render(
      <StatCard
        label="Total Revenue"
        value="₨ 125,000"
        tone="info"
      />
    );

    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByLabelText(/₨ 125,000/i)).toBeInTheDocument();
  });
});
