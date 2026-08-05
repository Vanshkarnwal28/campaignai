/**
 * Time Calculation Engine — /lib/scheduler/time-engine.ts
 *
 * Calculates exact next 10:00 AM Unix timestamps based on business local timezone.
 * Supports scheduling rules: 'daily_10am', 'alternate_days_10am', 'every_5_days_10am'.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ScheduleRule = 'daily_10am' | 'alternate_days_10am' | 'every_5_days_10am';

export interface TimeSlot {
  /** Target Date object (UTC representation of 10:00 AM in target timezone) */
  targetDate: Date;
  /** ISO 8601 string */
  isoString: string;
  /** Unix timestamp in milliseconds */
  timestampMs: number;
  /** Unix timestamp in seconds (for Cloud Tasks scheduleTime) */
  timestampSec: number;
  /** Human-readable local time string */
  formattedLocal: string;
  /** Whether this slot falls on the same calendar day as the reference date */
  isToday: boolean;
  /** 0-indexed slot position in a batch */
  slotIndex: number;
}

export interface ScheduleBatchResult {
  /** The scheduling rule applied */
  rule: ScheduleRule;
  /** IANA timezone string used */
  timezone: string;
  /** Total number of slots generated */
  count: number;
  /** Array of computed time slots */
  slots: TimeSlot[];
  /** All timestamps in milliseconds */
  timestampsMs: number[];
  /** All timestamps in seconds */
  timestampsSec: number[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TARGET_HOUR = 10; // 10:00 AM
const TARGET_MINUTE = 0;
const TARGET_SECOND = 0;

/** Step size in calendar days for each scheduling rule */
const RULE_STEP_DAYS: Record<ScheduleRule, number> = {
  daily_10am: 1,
  alternate_days_10am: 2,
  every_5_days_10am: 5,
};

// ─── Core Functions ────────────────────────────────────────────────────────────

/**
 * Extracts the current date/time components in a specific IANA timezone.
 * Falls back to system local time if timezone is invalid.
 */
function getTimezoneParts(date: Date, timeZone: string): {
  year: number;
  month: number; // 1-indexed
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

/**
 * Calculates the offset in milliseconds between UTC and the target timezone
 * for a given reference date. This accounts for DST transitions.
 */
function getTimezoneOffsetMs(refDate: Date, timeZone: string): number {
  const parts = getTimezoneParts(refDate, timeZone);
  // Build a UTC date from the local parts
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  // The offset is: localAsUtc - refDate.getTime()
  // Positive means timezone is ahead of UTC (e.g., +05:30)
  return localAsUtc - refDate.getTime();
}

/**
 * Calculates the exact next 10:00 AM in the specified timezone.
 *
 * Logic:
 * 1. Convert `fromDate` to the target timezone to get local date/time parts.
 * 2. If local time is before 10:00 AM, target is today at 10:00 AM.
 * 3. If local time is at or past 10:00 AM, target is tomorrow at 10:00 AM.
 * 4. Convert back to UTC Date.
 *
 * @param timeZone - IANA timezone (e.g., 'Asia/Kolkata', 'America/New_York'). Defaults to UTC.
 * @param fromDate - Reference date. Defaults to now.
 */
export function calculateNext10AM(
  timeZone: string = 'UTC',
  fromDate?: Date,
): TimeSlot {
  const base = fromDate ? new Date(fromDate.getTime()) : new Date();

  try {
    const localParts = getTimezoneParts(base, timeZone);

    // Determine if today's 10 AM has already passed in the target timezone
    let dayOffset = 0;
    if (
      localParts.hour > TARGET_HOUR ||
      (localParts.hour === TARGET_HOUR && localParts.minute >= TARGET_MINUTE)
    ) {
      dayOffset = 1; // Schedule for tomorrow
    }

    // Build the target local date at 10:00:00 AM
    const targetLocalYear = localParts.year;
    const targetLocalMonth = localParts.month - 1; // 0-indexed for Date.UTC
    const targetLocalDay = localParts.day + dayOffset;

    // Create target as if it were UTC, then adjust by timezone offset
    const targetAsUtcMs = Date.UTC(
      targetLocalYear,
      targetLocalMonth,
      targetLocalDay,
      TARGET_HOUR,
      TARGET_MINUTE,
      TARGET_SECOND,
      0,
    );

    // We need to find the actual UTC time when it's 10:00 AM in the target timezone.
    // offset = localAsUtc - actualUtc  =>  actualUtc = localAsUtc - offset
    const offsetMs = getTimezoneOffsetMs(new Date(targetAsUtcMs), timeZone);
    const targetUtcMs = targetAsUtcMs - offsetMs;

    const targetDate = new Date(targetUtcMs);
    const isToday =
      localParts.day + dayOffset === localParts.day &&
      dayOffset === 0;

    return {
      targetDate,
      isoString: targetDate.toISOString(),
      timestampMs: targetDate.getTime(),
      timestampSec: Math.floor(targetDate.getTime() / 1000),
      formattedLocal: targetDate.toLocaleString('en-US', { timeZone }),
      isToday,
      slotIndex: 0,
    };
  } catch {
    // Fallback: use system local timezone
    const target = new Date(base.getTime());
    target.setHours(TARGET_HOUR, TARGET_MINUTE, TARGET_SECOND, 0);
    if (target.getTime() <= base.getTime()) {
      target.setDate(target.getDate() + 1);
      target.setHours(TARGET_HOUR, TARGET_MINUTE, TARGET_SECOND, 0);
    }

    return {
      targetDate: target,
      isoString: target.toISOString(),
      timestampMs: target.getTime(),
      timestampSec: Math.floor(target.getTime() / 1000),
      formattedLocal: target.toLocaleString('en-US'),
      isToday: target.getDate() === base.getDate() && target.getMonth() === base.getMonth(),
      slotIndex: 0,
    };
  }
}

/**
 * Generates a batch of N future 10:00 AM time slots based on a scheduling rule.
 *
 * @param rule - Scheduling rule: 'daily_10am', 'alternate_days_10am', 'every_5_days_10am'.
 * @param timeZone - IANA timezone string.
 * @param count - Number of slots to generate. Default: 10.
 * @param fromDate - Starting reference date. Default: now.
 */
export function generateScheduleSlots(
  rule: ScheduleRule = 'daily_10am',
  timeZone: string = 'UTC',
  count: number = 10,
  fromDate?: Date,
): ScheduleBatchResult {
  const stepDays = RULE_STEP_DAYS[rule] || 1;
  const base = fromDate ? new Date(fromDate.getTime()) : new Date();
  const slots: TimeSlot[] = [];

  // Calculate the first slot (next 10 AM from base)
  const firstSlot = calculateNext10AM(timeZone, base);
  slots.push({ ...firstSlot, slotIndex: 0 });

  // Generate subsequent slots by advancing stepDays from the first slot
  for (let i = 1; i < count; i++) {
    const previousSlotDate = slots[i - 1].targetDate;
    // Advance by stepDays in the target timezone
    const advancedDate = new Date(previousSlotDate.getTime() + stepDays * 24 * 60 * 60 * 1000);

    // Recalculate to ensure exact 10:00 AM (handles DST shifts)
    try {
      const localParts = getTimezoneParts(advancedDate, timeZone);
      const targetAsUtcMs = Date.UTC(
        localParts.year,
        localParts.month - 1,
        localParts.day,
        TARGET_HOUR,
        TARGET_MINUTE,
        TARGET_SECOND,
        0,
      );
      const offsetMs = getTimezoneOffsetMs(new Date(targetAsUtcMs), timeZone);
      const targetUtcMs = targetAsUtcMs - offsetMs;
      const targetDate = new Date(targetUtcMs);

      slots.push({
        targetDate,
        isoString: targetDate.toISOString(),
        timestampMs: targetDate.getTime(),
        timestampSec: Math.floor(targetDate.getTime() / 1000),
        formattedLocal: targetDate.toLocaleString('en-US', { timeZone }),
        isToday: false,
        slotIndex: i,
      });
    } catch {
      // Fallback: simple day arithmetic
      const fallback = new Date(previousSlotDate.getTime() + stepDays * 24 * 60 * 60 * 1000);
      slots.push({
        targetDate: fallback,
        isoString: fallback.toISOString(),
        timestampMs: fallback.getTime(),
        timestampSec: Math.floor(fallback.getTime() / 1000),
        formattedLocal: fallback.toLocaleString('en-US'),
        isToday: false,
        slotIndex: i,
      });
    }
  }

  return {
    rule,
    timezone: timeZone,
    count: slots.length,
    slots,
    timestampsMs: slots.map((s) => s.timestampMs),
    timestampsSec: slots.map((s) => s.timestampSec),
  };
}

/**
 * Validates whether a given string is a valid ScheduleRule.
 */
export function isValidScheduleRule(rule: string): rule is ScheduleRule {
  return ['daily_10am', 'alternate_days_10am', 'every_5_days_10am'].includes(rule);
}

/**
 * Returns human-readable label for a schedule rule.
 */
export function getScheduleRuleLabel(rule: ScheduleRule): string {
  const labels: Record<ScheduleRule, string> = {
    daily_10am: 'Daily at 10:00 AM',
    alternate_days_10am: 'Every other day at 10:00 AM',
    every_5_days_10am: 'Every 5 days at 10:00 AM',
  };
  return labels[rule] || rule;
}
