import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReferralInviteCard } from "@/components/ui/referral-invite-card";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("ReferralInviteCard Component", () => {
  it("renders genuine zero metrics correctly as '0 Patients' and '0 pts'", () => {
    render(
      <ReferralInviteCard
        referralCode="CARE-001"
        invitedCount={0}
        creditsEarned="0 pts"
      />
    );

    expect(screen.getByText("0 Patients")).toBeInTheDocument();
    expect(screen.getByText("0 pts")).toBeInTheDocument();
  });

  it("renders em-dash (—) for missing or undefined metric values without fabricating numbers", () => {
    render(<ReferralInviteCard referralCode="CARE-002" />);

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(2);
    expect(screen.queryByText(/Patients/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pts/)).not.toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading is true", () => {
    render(<ReferralInviteCard isLoading={true} />);

    expect(screen.getByLabelText("Loading referred bookings")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading care rewards")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading link")).toBeInTheDocument();
  });

  it("renders 'Unavailable' states when isError is true", () => {
    render(<ReferralInviteCard isError={true} />);

    const unavailableItems = screen.getAllByText("Unavailable");
    expect(unavailableItems.length).toBe(2);
    expect(screen.getByText("Referral link unavailable")).toBeInTheDocument();
  });

  it("renders positive counts correctly with proper singular/plural grammar", () => {
    const { rerender } = render(
      <ReferralInviteCard invitedCount={1} creditsEarned="500 pts" />
    );
    expect(screen.getByText("1 Patient")).toBeInTheDocument();
    expect(screen.getByText("500 pts")).toBeInTheDocument();

    rerender(<ReferralInviteCard invitedCount={5} creditsEarned="2,500 pts" />);
    expect(screen.getByText("5 Patients")).toBeInTheDocument();
    expect(screen.getByText("2,500 pts")).toBeInTheDocument();
  });
});

