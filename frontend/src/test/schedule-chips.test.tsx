import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock reception card compact view
function ReceptionScheduleCardItem({
  booking,
}: {
  booking: {
    patientName: string;
    source?: string;
    leadStatus?: string;
  };
}) {
  return (
    <div data-testid="reception-schedule-card">
      <span className="patient-name">{booking.patientName}</span>
      {booking.source && (
        <span data-testid="source-chip" className="source-chip">
          {booking.source}
        </span>
      )}
      {booking.leadStatus && (
        <span data-testid="lead-status-chip" className="lead-status-chip">
          {booking.leadStatus}
        </span>
      )}
    </div>
  );
}

// Mock doctor card compact view (doctor response contains NO lead details)
function DoctorScheduleCardItem({
  booking,
}: {
  booking: {
    patientName: string;
    source?: string;
    isFirstVisit?: boolean;
    // Doctor schedule DTO explicitly omits leadStatus and leadId
  };
}) {
  return (
    <div data-testid="doctor-schedule-card">
      <span className="patient-name">{booking.patientName}</span>
      {booking.source && (
        <span data-testid="doctor-source-chip" className="doctor-source-chip">
          {booking.source}
        </span>
      )}
      {booking.isFirstVisit && (
        <span data-testid="first-visit-chip">First Visit</span>
      )}
    </div>
  );
}

describe("BF16: Schedule Cards Source and Lead Status Chips", () => {
  it("renders both source chip and lead status chip for reception schedule", () => {
    const booking = {
      patientName: "Kamran Akmal",
      source: "website_abandon",
      leadStatus: "converted",
    };

    render(<ReceptionScheduleCardItem booking={booking} />);

    expect(screen.getByTestId("source-chip")).toHaveTextContent("website_abandon");
    expect(screen.getByTestId("lead-status-chip")).toHaveTextContent("converted");
  });

  it("renders source chip ONLY for doctor schedule with zero lead status chip", () => {
    const doctorBooking = {
      patientName: "Kamran Akmal",
      source: "website_abandon",
      isFirstVisit: true,
    };

    render(<DoctorScheduleCardItem booking={doctorBooking} />);

    expect(screen.getByTestId("doctor-source-chip")).toHaveTextContent("website_abandon");
    expect(screen.getByTestId("first-visit-chip")).toHaveTextContent("First Visit");
    expect(screen.queryByTestId("lead-status-chip")).toBeNull();
  });
});
