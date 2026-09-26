export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface OfficeStatus {
  isOpen: boolean;
  statusText: string;
  nextEventText: string;
}

/**
 * Calculates current office status in America/Chicago timezone.
 * Schedule:
 * Mon-Thu: 8:00 AM - 6:00 PM
 * Fri: 8:00 AM - 2:00 PM
 * Sat: 9:00 AM - 1:00 PM
 * Sun: Closed
 */
export function getOfficeStatus(): OfficeStatus {
  try {
    const now = new Date();
    // Format to Chicago time components
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const day = parts.find((p) => p.type === "weekday")?.value || "Mon";
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "12", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const timeVal = hour + minute / 60;

    if (["Mon", "Tue", "Wed", "Thu"].includes(day)) {
      if (timeVal >= 8 && timeVal < 18) {
        return {
          isOpen: true,
          statusText: "Open Now",
          nextEventText: "Until 6:00 PM today",
        };
      }
      if (timeVal < 8) {
        return {
          isOpen: false,
          statusText: "Closed Now",
          nextEventText: "Opens today at 8:00 AM",
        };
      }
      return {
        isOpen: false,
        statusText: "Closed Now",
        nextEventText: "Opens tomorrow at 8:00 AM",
      };
    }

    if (day === "Fri") {
      if (timeVal >= 8 && timeVal < 14) {
        return {
          isOpen: true,
          statusText: "Open Now",
          nextEventText: "Until 2:00 PM today",
        };
      }
      if (timeVal < 8) {
        return {
          isOpen: false,
          statusText: "Closed Now",
          nextEventText: "Opens today at 8:00 AM",
        };
      }
      return {
        isOpen: false,
        statusText: "Closed Now",
        nextEventText: "Opens Saturday at 9:00 AM",
      };
    }

    if (day === "Sat") {
      if (timeVal >= 9 && timeVal < 13) {
        return {
          isOpen: true,
          statusText: "Open Now",
          nextEventText: "Until 1:00 PM today",
        };
      }
      return {
        isOpen: false,
        statusText: "Closed Now",
        nextEventText: "Opens Monday at 8:00 AM",
      };
    }

    // Sunday
    return {
      isOpen: false,
      statusText: "Closed Today",
      nextEventText: "Opens Monday at 8:00 AM",
    };
  } catch {
    // Fallback if timezone conversion fails
    return {
      isOpen: true,
      statusText: "Open Mon–Sat",
      nextEventText: "Call for immediate triage",
    };
  }
}
