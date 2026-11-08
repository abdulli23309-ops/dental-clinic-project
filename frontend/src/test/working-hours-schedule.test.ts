import { describe, it, expect } from "vitest";
import { formatWorkingHoursSchedule, formatTime12, formatTimeRangeString } from "@/lib/currency";

describe("formatWorkingHoursSchedule", () => {
  it("formats standard week into clean grouped ranges", () => {
    const hours = [
      { dayOfWeek: 0, openTime: "08:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 1, openTime: "08:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 2, openTime: "08:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 3, openTime: "08:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 4, openTime: "08:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 5, openTime: "09:00", closeTime: "13:00", isClosed: false },
      { dayOfWeek: 6, openTime: null, closeTime: null, isClosed: true },
    ];

    const lines = formatWorkingHoursSchedule(hours);
    expect(lines).toEqual([
      { label: "Mon – Fri", timeRange: "8:00 AM – 5:00 PM", isClosed: false },
      { label: "Sat", timeRange: "9:00 AM – 1:00 PM", isClosed: false },
      { label: "Sun", timeRange: "Closed", isClosed: true },
    ]);
  });

  it("merges multiple blocks on the same day into comma-separated ranges", () => {
    const hours = [
      { dayOfWeek: 0, openTime: "09:00", closeTime: "13:00", isClosed: false },
      { dayOfWeek: 0, openTime: "14:00", closeTime: "18:00", isClosed: false },
      { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isClosed: false },
    ];

    const lines = formatWorkingHoursSchedule(hours);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({
      label: "Mon",
      timeRange: "9:00 AM – 1:00 PM, 2:00 PM – 6:00 PM",
      isClosed: false,
    });
    expect(lines[1]).toEqual({
      label: "Tue",
      timeRange: "9:00 AM – 5:00 PM",
      isClosed: false,
    });
  });

  it("handles composite range strings in openTime", () => {
    const hours = [
      { dayOfWeek: 0, openTime: "08:00 - 12:00, 13:00 - 17:00", closeTime: null, isClosed: false },
      { dayOfWeek: 1, openTime: "08:00 - 12:00, 13:00 - 17:00", closeTime: null, isClosed: false },
    ];

    const lines = formatWorkingHoursSchedule(hours);
    expect(lines).toEqual([
      { label: "Mon, Tue", timeRange: "8:00 AM – 12:00 PM, 1:00 PM – 5:00 PM", isClosed: false },
    ]);
  });

  it("never duplicates Monday when multiple entries exist for the same day", () => {
    const hours = [
      { dayOfWeek: 0, openTime: "08:00", closeTime: "17:00", isClosed: false },
      { dayOfWeek: 0, openTime: "10:00", closeTime: "18:00", isClosed: false },
      { dayOfWeek: 0, openTime: "08:00", closeTime: "18:00", isClosed: false },
    ];

    const lines = formatWorkingHoursSchedule(hours);
    // Should be exactly 1 line for Monday, not 3 separate lines!
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe("Monday");
  });

  it("correctly converts 24h times to 12h representation via formatTime12", () => {
    expect(formatTime12("08:00")).toBe("8:00 AM");
    expect(formatTime12("12:00")).toBe("12:00 PM");
    expect(formatTime12("13:30")).toBe("1:30 PM");
    expect(formatTime12("17:00")).toBe("5:00 PM");
    expect(formatTime12("00:00")).toBe("12:00 AM");
  });
});
