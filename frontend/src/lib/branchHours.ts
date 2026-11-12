/**
 * Pure helper to calculate whether a branch is open in Pakistan Standard Time (Asia/Karachi).
 * Gracefully parses standard hours strings like:
 * "Mon - Sat: 9:00 AM - 9:00 PM\nSunday: 11:00 AM - 6:00 PM"
 * or "Monday – Saturday: 9:00 AM – 9:00 PM"
 */
export function getOpenStatus(
  hoursText?: string,
  now = new Date()
): { open: boolean; label: string } {
  if (!hoursText || typeof hoursText !== "string") {
    return { open: true, label: "Open today · 9:00 AM – 9:00 PM" };
  }

  try {
    // Get current day of week and time in Karachi time
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekdayPart = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() || "";
    const hourPart = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minutePart = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const currentMins = hourPart * 60 + minutePart;

    const isSunday = weekdayPart.startsWith("sun");

    // Standard clinic defaults if parsing is ambiguous
    const weekdayOpen = 9 * 60; // 9:00 AM
    const weekdayClose = 21 * 60; // 9:00 PM
    const sundayOpen = 11 * 60; // 11:00 AM
    const sundayClose = 18 * 60; // 6:00 PM

    let openMins = isSunday ? sundayOpen : weekdayOpen;
    let closeMins = isSunday ? sundayClose : weekdayClose;
    let openStr = isSunday ? "11:00 AM" : "9:00 AM";
    let closeStr = isSunday ? "6:00 PM" : "9:00 PM";

    // Attempt to extract specific times if present in hoursText
    const lines = hoursText.split(/[\n|;]+/);
    for (const line of lines) {
      const lower = line.toLowerCase();
      const matchesDay = isSunday ? lower.includes("sun") : (lower.includes("mon") || lower.includes("sat") || lower.includes("daily"));
      if (matchesDay) {
        const timeMatch = line.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)\s*[-–—to]+\s*(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
        if (timeMatch) {
          const parseTime = (hStr: string, mStr: string | undefined, ampm: string) => {
            let h = parseInt(hStr, 10);
            const m = mStr ? parseInt(mStr, 10) : 0;
            if (ampm.toLowerCase() === "pm" && h < 12) h += 12;
            if (ampm.toLowerCase() === "am" && h === 12) h = 0;
            return h * 60 + m;
          };
          openMins = parseTime(timeMatch[1], timeMatch[2], timeMatch[3]);
          closeMins = parseTime(timeMatch[4], timeMatch[5], timeMatch[6]);
          openStr = `${timeMatch[1]}:${timeMatch[2] || "00"} ${timeMatch[3].toUpperCase()}`;
          closeStr = `${timeMatch[4]}:${timeMatch[5] || "00"} ${timeMatch[6].toUpperCase()}`;
        }
      }
    }

    if (currentMins >= openMins && currentMins < closeMins) {
      return { open: true, label: `Open now · Closes ${closeStr}` };
    } else {
      return { open: false, label: `Closed · Opens ${openStr}` };
    }
  } catch {
    return { open: true, label: "Open today · 9:00 AM – 9:00 PM" };
  }
}

/**
 * Parses branch hours into clean structured day-time rows.
 * E.g., "Mon - Sat: 9:00 AM - 9:00 PM\nSunday: 11:00 AM - 6:00 PM"
 * -> [{ days: "Mon – Sat", time: "9:00 AM – 9:00 PM" }, { days: "Sunday", time: "11:00 AM – 6:00 PM" }]
 */
export function parseBranchHoursRows(
  hoursText?: string
): { days: string; time: string }[] {
  if (!hoursText || typeof hoursText !== "string") {
    return [
      { days: "Mon – Sat", time: "9:00 AM – 9:00 PM" },
      { days: "Sunday", time: "11:00 AM – 6:00 PM" },
    ];
  }

  const rawLines = hoursText
    .split(/[\n|;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: { days: string; time: string }[] = [];

  for (const line of rawLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < line.length - 1) {
      const days = line.slice(0, colonIdx).trim();
      const time = line.slice(colonIdx + 1).trim();
      parsed.push({ days, time });
    } else {
      parsed.push({ days: "Schedule", time: line });
    }
  }

  return parsed.length > 0
    ? parsed
    : [
        { days: "Mon – Sat", time: "9:00 AM – 9:00 PM" },
        { days: "Sunday", time: "11:00 AM – 6:00 PM" },
      ];
}
