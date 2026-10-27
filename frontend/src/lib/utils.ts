import { WorkingHoursItem } from '@/lib/api';

/**
 * Combines multiple CSS class names into a single clean string, filtering out empty or false values.
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface OfficeStatus {
  isOpen: boolean;
  statusText: string;
  nextEventText: string;
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesTo12h(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  const padM = m > 0 ? `:${String(m).padStart(2, '0')}` : ':00';
  return `${h12}${padM} ${ampm}`;
}

/**
 * Calculates whether the dental clinic is currently open strictly based on
 * working hours data provided from the database API in the clinic timezone.
 * Returns null if no working hours data is available. No hardcoded schedules.
 */
export function getOfficeStatus(
  workingHours?: WorkingHoursItem[] | null,
  timeZone: string = 'Asia/Karachi'
): OfficeStatus | null {
  if (!workingHours || !Array.isArray(workingHours) || workingHours.length === 0) {
    return null;
  }

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const dayStr = parts.find((p) => p.type === 'weekday')?.value || '';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const currentMinutes = hour * 60 + minute;

    const weekdayMap: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };
    const currentDayIndex = weekdayMap[dayStr] ?? (now.getDay() === 0 ? 6 : now.getDay() - 1);

    const todayItems = workingHours.filter((h) => h.dayOfWeek === currentDayIndex);
    if (todayItems.length === 0) {
      return {
        isOpen: false,
        statusText: 'Closed Today',
        nextEventText: '',
      };
    }

    // Parse all open blocks for today
    const blocks: Array<{ start: number; end: number }> = [];
    for (const item of todayItems) {
      const isClosed = Boolean(item.isClosed ?? !item.isOpen);
      if (isClosed) continue;

      const rawOpen = item.openTime;
      const rawClose = item.closeTime;

      if (rawOpen && rawClose) {
        blocks.push({
          start: parseTimeToMinutes(rawOpen),
          end: parseTimeToMinutes(rawClose),
        });
      } else if (rawOpen && !rawClose) {
        // May contain comma-separated sub-blocks "08:00 - 12:00, 13:00 - 17:00"
        const parts = rawOpen.split(',');
        for (const p of parts) {
          const sub = p.trim().split(/\s*[-–]\s*/);
          if (sub.length === 2) {
            blocks.push({
              start: parseTimeToMinutes(sub[0]),
              end: parseTimeToMinutes(sub[1]),
            });
          }
        }
      }
    }

    if (blocks.length === 0) {
      return {
        isOpen: false,
        statusText: 'Closed Today',
        nextEventText: '',
      };
    }

    // Sort blocks chronologically
    blocks.sort((a, b) => a.start - b.start);

    // Check if open right now in any block
    for (const block of blocks) {
      if (currentMinutes >= block.start && currentMinutes < block.end) {
        return {
          isOpen: true,
          statusText: 'Open Now',
          nextEventText: `Until ${formatMinutesTo12h(block.end)} today`,
        };
      }
    }

    // Check if opens later today
    const nextBlock = blocks.find((b) => currentMinutes < b.start);
    if (nextBlock) {
      return {
        isOpen: false,
        statusText: 'Closed Now',
        nextEventText: `Opens today at ${formatMinutesTo12h(nextBlock.start)}`,
      };
    }

    // Closed for today
    return {
      isOpen: false,
      statusText: 'Closed Today',
      nextEventText: '',
    };
  } catch {
    return null;
  }
}