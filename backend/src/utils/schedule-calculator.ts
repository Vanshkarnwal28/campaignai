export type FrequencyRule = 'every_5_days' | 'alternate_days';

export interface ScheduleCalculatorOptions {
  startDate: Date | string | number;
  frequencyRule: FrequencyRule;
  count?: number; // Default: 10
  targetHour?: number; // Default: 10 (10:00 AM)
  targetMinute?: number; // Default: 0
  targetSecond?: number; // Default: 0
}

export interface ScheduleDetailsResult {
  timestampsMs: number[];
  timestampsSec: number[];
  isoStrings: string[];
  formattedDates: string[];
  frequencyRule: FrequencyRule;
  count: number;
}

/**
 * Frequency rule step mapping (in days).
 * 'every_5_days' => 5 days step
 * 'alternate_days' => 2 days step
 */
const FREQUENCY_STEP_DAYS: Record<FrequencyRule, number> = {
  every_5_days: 5,
  alternate_days: 2,
};

/**
 * Calculates and returns an array of 10 exact Unix timestamps (in milliseconds),
 * normalized to 10:00 AM in local timezone based on the specified frequency rule.
 *
 * @param startDate - The starting Date object (or date string/timestamp).
 * @param frequencyRule - 'every_5_days' or 'alternate_days'.
 * @returns Array of 10 exact Unix epoch timestamps in milliseconds.
 */
export function calculateScheduledTimestamps(
  startDate: Date | string | number,
  frequencyRule: FrequencyRule = 'every_5_days',
): number[] {
  return calculateScheduleDetails({ startDate, frequencyRule }).timestampsMs;
}

/**
 * Calculates and returns an array of 10 exact Unix timestamps (in seconds),
 * normalized to 10:00 AM in local timezone based on the specified frequency rule.
 */
export function calculateScheduledTimestampsInSeconds(
  startDate: Date | string | number,
  frequencyRule: FrequencyRule = 'every_5_days',
): number[] {
  return calculateScheduleDetails({ startDate, frequencyRule }).timestampsSec;
}

/**
 * Pure TypeScript utility function calculating precise future execution dates.
 */
export function calculateScheduleDetails(
  options: ScheduleCalculatorOptions,
): ScheduleDetailsResult {
  const {
    startDate: rawStartDate,
    frequencyRule,
    count = 10,
    targetHour = 10,
    targetMinute = 0,
    targetSecond = 0,
  } = options;

  const start = rawStartDate instanceof Date ? new Date(rawStartDate.getTime()) : new Date(rawStartDate);
  
  if (isNaN(start.getTime())) {
    throw new Error('Invalid startDate provided to schedule calculator');
  }

  const stepDays = FREQUENCY_STEP_DAYS[frequencyRule] || 5;

  const timestampsMs: number[] = [];
  const timestampsSec: number[] = [];
  const isoStrings: string[] = [];
  const formattedDates: string[] = [];

  // Determine initial execution date
  let currentDate = new Date(start.getTime());
  currentDate.setHours(targetHour, targetMinute, targetSecond, 0);

  // If initial normalized date is in the past relative to startDate, advance by 1 step
  if (currentDate.getTime() <= start.getTime()) {
    currentDate.setDate(currentDate.getDate() + stepDays);
    currentDate.setHours(targetHour, targetMinute, targetSecond, 0);
  }

  for (let i = 0; i < count; i++) {
    const execDate = new Date(currentDate.getTime());
    
    // Explicitly enforce 10:00 AM local timezone normalization
    execDate.setHours(targetHour, targetMinute, targetSecond, 0);

    const tsMs = execDate.getTime();
    const tsSec = Math.floor(tsMs / 1000);

    timestampsMs.push(tsMs);
    timestampsSec.push(tsSec);
    isoStrings.push(execDate.toISOString());
    formattedDates.push(execDate.toLocaleString());

    // Advance to next interval date
    currentDate.setDate(currentDate.getDate() + stepDays);
  }

  return {
    timestampsMs,
    timestampsSec,
    isoStrings,
    formattedDates,
    frequencyRule,
    count: timestampsMs.length,
  };
}
