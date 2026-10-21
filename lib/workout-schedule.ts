export const WEEK_DAY_OPTIONS = [
  { label: "Sun", value: "sunday" },
  { label: "Mon", value: "monday" },
  { label: "Tue", value: "tuesday" },
  { label: "Wed", value: "wednesday" },
  { label: "Thu", value: "thursday" },
  { label: "Fri", value: "friday" },
  { label: "Sat", value: "saturday" },
] as const;

export type WeekDayName = (typeof WEEK_DAY_OPTIONS)[number]["value"];

export const WEEK_DAY_LABELS = WEEK_DAY_OPTIONS.map((day) => day.label);
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_NAME_TO_INDEX: Record<WeekDayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const DAY_INDEX_TO_NAME = WEEK_DAY_OPTIONS.map((day) => day.value);

export function isWeekDayName(dayName: string): dayName is WeekDayName {
  return dayName in DAY_NAME_TO_INDEX;
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getStartOfMonthGrid(date: Date): Date {
  const start = getStartOfMonth(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getEndOfMonthGrid(date: Date): Date {
  const end = getEndOfMonth(date);
  end.setDate(end.getDate() + (6 - end.getDay()));
  return end;
}

export function getWeekDateMap(date: Date = new Date()): Record<WeekDayName, string> {
  const start = getStartOfWeek(date);
  return DAY_INDEX_TO_NAME.reduce((acc, dayName, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    acc[dayName] = formatLocalDate(current);
    return acc;
  }, {} as Record<WeekDayName, string>);
}

export function getDayIndexFromDateString(dateString: string): number {
  return parseLocalDate(dateString).getDay();
}

export function getWeekKey(dateOrString: Date | string): string {
  const date = typeof dateOrString === "string" ? parseLocalDate(dateOrString) : dateOrString;
  return formatLocalDate(getStartOfWeek(date));
}

export function countWeeklyStreak(completedDates: string[], currentDate: Date = new Date()): number {
  const completedWeeks = new Set(completedDates.map((date) => getWeekKey(date)));
  let streak = 0;
  let cursor = getStartOfWeek(currentDate);

  while (completedWeeks.has(formatLocalDate(cursor))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

export function getDayLabel(dayName: string): string {
  const match = WEEK_DAY_OPTIONS.find((day) => day.value === dayName);
  return match?.label ?? dayName;
}

export function getMonthKey(date: Date): string {
  return formatLocalDate(getStartOfMonth(date)).slice(0, 7);
}

export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) {
    return getStartOfMonth(new Date());
  }
  return new Date(year, month - 1, 1);
}

export function getMonthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function isSameMonth(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

export function getMonthGridDates(date: Date): Date[] {
  const start = getStartOfMonthGrid(date);
  const end = getEndOfMonthGrid(date);
  const dates: Date[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    dates.push(new Date(cursor));
  }

  return dates;
}

export function formatMonthDay(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

export function formatMonthDayWithWeekday(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${formatMonthDay(date)}`;
}
