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
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const currentDayIndex = weekdayMap[dayStr] ?? now.getDay();

    const todaySchedule = workingHours.find((h) => h.dayOfWeek === currentDayIndex);

    if (!todaySchedule || !todaySchedule.isOpen || !todaySchedule.openTime || !todaySchedule.closeTime) {
      return {
        isOpen: false,
        statusText: 'Closed Today',
        nextEventText: '',
      };
    }

    const openMinutes = parseTimeToMinutes(todaySchedule.openTime);
    const closeMinutes = parseTimeToMinutes(todaySchedule.closeTime);

    // Check lunch/break if defined
    let isInBreak = false;
    if (todaySchedule.breakStartTime && todaySchedule.breakEndTime) {
      const breakStart = parseTimeToMinutes(todaySchedule.breakStartTime);
      const breakEnd = parseTimeToMinutes(todaySchedule.breakEndTime);
      if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
        isInBreak = true;
      }
    }

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes && !isInBreak) {
      return {
        isOpen: true,
        statusText: 'Open Now',
        nextEventText: `Until ${formatMinutesTo12h(closeMinutes)} today`,
      };
    }

    if (currentMinutes < openMinutes) {
      return {
        isOpen: false,
        statusText: 'Closed Now',
        nextEventText: `Opens today at ${formatMinutesTo12h(openMinutes)}`,
      };
    }

    // Closed for today
    return {
      isOpen: false,
      statusText: 'Closed Now',
      nextEventText: '',
    };
  } catch {
    return null;
  }
}