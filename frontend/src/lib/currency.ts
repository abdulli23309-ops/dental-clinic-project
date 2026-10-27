/**
 * Currency and Locale formatting utilities for Marlow Dental.
 *
 * Implements organization-configured currency (default PKR, ISO code 'PKR', symbol 'Rs')
 * and Asia/Karachi 12-hour clinic local time presentation.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  timezone: string;
}

export const DEFAULT_CURRENCY: CurrencyConfig = {
  code: "PKR",
  symbol: "Rs",
  timezone: "Asia/Karachi",
};

/**
 * Formats a monetary price using the clinic currency symbol.
 * Handles numbers or strings (e.g. 1500, "1500", "from $140", "$140").
 * Strips hardcoded "$" or legacy currency signs and ensures the configured symbol is displayed.
 */
export function formatPrice(
  amount: number | string | null | undefined,
  symbol: string = DEFAULT_CURRENCY.symbol
): string {
  if (amount === null || amount === undefined || amount === "") {
    return "";
  }

  const str = String(amount).trim();

  // If already formatted like "from $140" or "from 140"
  if (/^from\s+/i.test(str)) {
    const rawNum = str.replace(/^from\s+/i, "").replace(/[^\d.,]/g, "").trim();
    if (!rawNum) return `from ${symbol}`;
    return `from ${symbol} ${rawNum}`;
  }

  // If contains a number, strip any legacy $ signs
  const numericOnly = str.replace(/[^\d.,]/g, "").trim();
  if (!numericOnly) {
    return str;
  }

  // If already starts with currency symbol (like "Rs" or "PKR"), leave as is or normalize
  if (str.startsWith(symbol)) {
    return str;
  }

  // Format standard numeric amounts
  const num = parseFloat(numericOnly.replace(/,/g, ""));
  if (!isNaN(num) && Number.isFinite(num)) {
    // If integer, format without unnecessary decimal places
    const formattedNum = num.toLocaleString("en-PK", {
      maximumFractionDigits: 0,
    });
    return `${symbol} ${formattedNum}`;
  }

  return `${symbol} ${numericOnly}`;
}

/**
 * Formats a date/time into 12-hour clinic timezone (Asia/Karachi) representation (e.g., "10:30 AM").
 */
export function formatTime12(
  dateOrTime: string | Date | null | undefined,
  timezone: string = DEFAULT_CURRENCY.timezone
): string {
  if (!dateOrTime) return "";

  if (typeof dateOrTime === "string") {
    const trimmed = dateOrTime.trim();
    // If already in 12-hour string format (e.g. "10:00 AM", "4:30 PM", "8:00 AM"), return normalized
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
    // If in 24-hour "HH:MM" or "HH:MM:SS" format
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    }
  }

  try {
    const d = typeof dateOrTime === "string" ? new Date(dateOrTime) : dateOrTime;
    if (isNaN(d.getTime())) return String(dateOrTime);

    return d.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateOrTime);
  }
}

/**
 * Formats a single time range or composite range string into clean 12-hour format.
 */
export function formatTimeRangeString(
  open: string | null | undefined,
  close: string | null | undefined
): string {
  if (!open && !close) return "Closed";
  if (open && close) {
    return `${formatTime12(open)} – ${formatTime12(close)}`;
  }
  if (open && !close) {
    if (open.includes(",")) {
      return open
        .split(",")
        .map((part) => {
          const sub = part.trim().split(/\s*[-–]\s*/);
          if (sub.length === 2) {
            return `${formatTime12(sub[0])} – ${formatTime12(sub[1])}`;
          }
          return formatTime12(part.trim());
        })
        .join(", ");
    }
    const sub = open.trim().split(/\s*[-–]\s*/);
    if (sub.length === 2) {
      return `${formatTime12(sub[0])} – ${formatTime12(sub[1])}`;
    }
    return formatTime12(open);
  }
  return "Closed";
}

export interface FormattedHoursLine {
  label: string;
  timeRange: string;
  isClosed: boolean;
}

/**
 * Groups and formats clinic_working_hours into clean, human-readable schedule lines.
 * Automatically merges multiple blocks per day and groups consecutive days with identical operating hours.
 * (e.g., 'Mon – Fri: 8:00 AM – 5:00 PM', 'Sat: 9:00 AM – 1:00 PM', 'Sun: Closed').
 */
export function formatWorkingHoursSchedule(
  workingHours: Array<{
    dayOfWeek?: number;
    day_of_week?: number;
    dayName?: string;
    openTime?: string | null;
    open_time?: string | null;
    closeTime?: string | null;
    close_time?: string | null;
    isClosed?: boolean;
    is_closed?: boolean;
  }>
): FormattedHoursLine[] {
  if (!workingHours || workingHours.length === 0) return [];

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const fullDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // 1. Group input entries by day_of_week (0 through 6)
  const byDow = new Map<number, typeof workingHours>();
  for (const h of workingHours) {
    const dow = h.dayOfWeek ?? h.day_of_week ?? 0;
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow)!.push(h);
  }

  // Determine which days of week to present: if full week or subset
  const dowsPresent = Array.from(byDow.keys()).sort((a, b) => a - b);
  const items: Array<{
    dow: number;
    dayName: string;
    shortName: string;
    timeStr: string;
    isClosed: boolean;
  }> = [];

  for (const dow of dowsPresent) {
    const entries = byDow.get(dow) || [];
    const openEntries = entries.filter((e) => {
      const closed = Boolean(e.isClosed ?? e.is_closed);
      const open = e.openTime ?? e.open_time;
      return !closed && Boolean(open);
    });

    if (openEntries.length === 0) {
      items.push({
        dow,
        dayName: fullDayNames[dow] || `Day ${dow}`,
        shortName: dayNames[dow] || `Day ${dow}`,
        timeStr: "Closed",
        isClosed: true,
      });
    } else {
      // Merge multiple blocks on the same day
      const blockStrings = openEntries.map((e) => {
        const open = e.openTime ?? e.open_time;
        const close = e.closeTime ?? e.close_time;
        return formatTimeRangeString(open, close);
      });
      items.push({
        dow,
        dayName: fullDayNames[dow] || `Day ${dow}`,
        shortName: dayNames[dow] || `Day ${dow}`,
        timeStr: blockStrings.join(", "),
        isClosed: false,
      });
    }
  }

  // 2. Group consecutive days with identical timeStr
  const grouped: FormattedHoursLine[] = [];
  let i = 0;
  while (i < items.length) {
    let j = i;
    while (
      j + 1 < items.length &&
      items[j + 1].timeStr === items[i].timeStr &&
      items[j + 1].dow === items[j].dow + 1
    ) {
      j++;
    }

    let label = "";
    if (i === j) {
      // Single day: if exactly 1 day present in total input, use full name, otherwise short
      label = items.length === 1 ? items[i].dayName : items[i].shortName;
    } else if (j === i + 1) {
      label = `${items[i].shortName}, ${items[j].shortName}`;
    } else {
      label = `${items[i].shortName} – ${items[j].shortName}`;
    }

    grouped.push({
      label,
      timeRange: items[i].timeStr,
      isClosed: items[i].isClosed,
    });
    i = j + 1;
  }

  return grouped;
}
