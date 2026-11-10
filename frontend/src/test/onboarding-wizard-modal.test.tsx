import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OnboardingWizardModal } from "@/components/modals/onboarding-wizard-modal";

const mockUser = {
  id: "user-123",
  email: "doctor@hiradental.com",
  fullName: "Dr. Sarah Dentist",
  role: "doctor",
  isActive: true,
  hasCompletedOnboarding: false,
};

let currentUserState: any = mockUser;

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: currentUserState,
  }),
}));

vi.mock("@/components/ui/clinic-logo", () => ({
  useClinicBranding: () => ({
    fullBrandName: "Hira Dental Clinic",
    shortBrandName: "DHDC",
  }),
}));

const mockCompleteOnboarding = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/api", () => ({
  completeOnboarding: (name?: string) => mockCompleteOnboarding(name),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("OnboardingWizardModal Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    currentUserState = { ...mockUser };
  });

  it("STRICTLY does not render for admin users", () => {
    currentUserState = {
      id: "admin-1",
      email: "admin@hiradental.com",
      fullName: "Admin Boss",
      role: "admin",
      isActive: true,
      hasCompletedOnboarding: false,
    };

    const { container } = render(<OnboardingWizardModal />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render if user has already completed onboarding (database flag true)", () => {
    currentUserState = {
      ...mockUser,
      hasCompletedOnboarding: true,
    };

    const { container } = render(<OnboardingWizardModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not render if user has completed onboarding in local storage", () => {
    localStorage.setItem(`marlow_onboarding_completed_${mockUser.id}`, "true");

    const { container } = render(<OnboardingWizardModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders on 1st login for new non-admin user and has NO branch/location selection", () => {
    render(<OnboardingWizardModal />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2: Profile & Alerts")).toBeInTheDocument();
    expect(screen.getByText("Welcome to Hira Dental Clinic")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dr. Sarah Dentist")).toBeInTheDocument();

    // Verify location selection is completely stripped out
    expect(screen.queryByText(/Branch/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Location/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("completes onboarding, calls API, updates local storage, and closes modal", async () => {
    render(<OnboardingWizardModal />);

    // Proceed to Step 2
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(screen.getByText("Step 2 of 2: All Set")).toBeInTheDocument();

    // Finish onboarding
    fireEvent.click(screen.getByRole("button", { name: /Enter Dashboard/i }));

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledWith("Dr. Sarah Dentist");
      expect(localStorage.getItem(`marlow_onboarding_completed_${mockUser.id}`)).toBe("true");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

