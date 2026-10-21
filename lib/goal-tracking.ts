import { GoalSettings } from "@/app/types/goals";
import { WorkoutCompletion, WorkoutProfileSummary } from "@/app/types/workout";
import {
  DAY_INDEX_TO_NAME,
  addDays,
  formatLocalDate,
  getStartOfWeek,
} from "@/lib/workout-schedule";

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  weeklyWorkoutGoal: 3,
  reminderTime: "18:00",
  recoveryModeEnabled: true,
};

export type WeeklyGoalProgress = {
  completed: number;
  target: number;
  percent: number;
  remaining: number;
  met: boolean;
};

export type WeeklyGoalSummary = WeeklyGoalProgress & {
  recoverySessions: number;
  startDate: string;
  endDate: string;
};

export type RecoverySuggestion = {
  profileId: string;
  name: string;
  missedDate: string;
  scheduledToday: boolean;
};

function getCompletionKey(profileId: string, date: string) {
  return `${profileId}:${date}`;
}

function getDateString(value: string | Date): string {
  return typeof value === "string" ? formatLocalDate(new Date(value)) : formatLocalDate(value);
}

function getDayDiff(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function getEffectiveGoalTarget(
  target: number,
  weekStartDate: string,
  accountCreatedOn?: string
) {
  const safeTarget = Math.max(1, target);

  if (!accountCreatedOn) {
    return safeTarget;
  }

  const normalizedCreatedAt = getDateString(accountCreatedOn);
  const weekEndDate = formatLocalDate(addDays(new Date(`${weekStartDate}T00:00:00`), 6));

  if (normalizedCreatedAt > weekEndDate) {
    return 0;
  }

  const effectiveStartDate = normalizedCreatedAt > weekStartDate ? normalizedCreatedAt : weekStartDate;
  const activeDays = Math.max(1, getDayDiff(effectiveStartDate, weekEndDate) + 1);
  return Math.max(1, Math.ceil((safeTarget * activeDays) / 7));
}

export function isValidReminderTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function getMinutesFromReminderTime(value: string): number {
  if (!isValidReminderTime(value)) return 18 * 60;

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatReminderTimeLabel(value: string): string {
  if (!isValidReminderTime(value)) return "6:00 PM";

  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function getCompletionDateSetForWeek(
  completions: WorkoutCompletion[],
  referenceDate: Date = new Date(),
  accountCreatedOn?: string
) {
  const start = getStartOfWeek(referenceDate);
  const end = addDays(start, 6);
  const startDate = formatLocalDate(start);
  const endDate = formatLocalDate(end);
  const minimumDate = accountCreatedOn ? getDateString(accountCreatedOn) : startDate;

  return completions.filter(
    (completion) => completion.completedOn >= startDate && completion.completedOn <= endDate && completion.completedOn >= minimumDate
  );
}

export function getWeeklyGoalProgress(
  completions: WorkoutCompletion[],
  target: number,
  referenceDate: Date = new Date(),
  accountCreatedOn?: string
): WeeklyGoalProgress {
  const weekStartDate = formatLocalDate(getStartOfWeek(referenceDate));
  const effectiveTarget = getEffectiveGoalTarget(target, weekStartDate, accountCreatedOn);
  const weeklyCompletions = getCompletionDateSetForWeek(completions, referenceDate, accountCreatedOn);
  const completed = weeklyCompletions.length;

  return {
    completed,
    target: effectiveTarget,
    percent:
      effectiveTarget > 0
        ? Math.min(100, Math.round((completed / effectiveTarget) * 100))
        : 0,
    remaining: Math.max(0, effectiveTarget - completed),
    met: effectiveTarget > 0 ? completed >= effectiveTarget : false,
  };
}

export function getPreviousWeekSummary(
  completions: WorkoutCompletion[],
  target: number,
  referenceDate: Date = new Date(),
  accountCreatedOn?: string
): WeeklyGoalSummary | null {
  const currentWeekStart = getStartOfWeek(referenceDate);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const previousWeekEnd = addDays(previousWeekStart, 6);
  const startDate = formatLocalDate(previousWeekStart);
  const endDate = formatLocalDate(previousWeekEnd);
  const normalizedCreatedAt = accountCreatedOn ? getDateString(accountCreatedOn) : null;
  const completionsInPreviousWeek = completions.filter(
    (completion) => completion.completedOn >= startDate && completion.completedOn <= endDate
  );
  const allowBackdatedPreviousWeekSummary =
    !!normalizedCreatedAt &&
    normalizedCreatedAt > endDate &&
    completionsInPreviousWeek.length > 0;
  const effectiveAccountCreatedAt = allowBackdatedPreviousWeekSummary
    ? null
    : normalizedCreatedAt;

  if (effectiveAccountCreatedAt && effectiveAccountCreatedAt > endDate) {
    return null;
  }

  const previousWeekCompletions = completionsInPreviousWeek.filter(
    (completion) =>
      !effectiveAccountCreatedAt || completion.completedOn >= effectiveAccountCreatedAt
  );
  const progress = getWeeklyGoalProgress(
    previousWeekCompletions,
    target,
    previousWeekStart,
    effectiveAccountCreatedAt ?? undefined
  );

  return {
    ...progress,
    recoverySessions: previousWeekCompletions.filter(
      (completion) => completion.completionMode !== "standard"
    ).length,
    startDate,
    endDate,
  };
}

export function getTodayCompletions(
  completions: WorkoutCompletion[],
  referenceDate: Date = new Date()
) {
  const todayDate = formatLocalDate(referenceDate);
  return completions.filter((completion) => completion.completedOn === todayDate);
}

export function isReminderDue(
  reminderTime: string,
  completions: WorkoutCompletion[],
  referenceDate: Date = new Date()
) {
  const minutesNow = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  return (
    minutesNow >= getMinutesFromReminderTime(reminderTime) &&
    getTodayCompletions(completions, referenceDate).length === 0
  );
}

export function getRecoverySuggestion(
  profiles: WorkoutProfileSummary[],
  completions: WorkoutCompletion[],
  referenceDate: Date = new Date()
): RecoverySuggestion | null {
  const todayDate = formatLocalDate(referenceDate);
  const yesterdayDate = formatLocalDate(addDays(referenceDate, -1));
  const completionKeys = new Set(
    completions.map((completion) => getCompletionKey(completion.profileId, completion.completedOn))
  );

  const missedYesterday = profiles
    .filter((profile) => (profile.scheduledDays ?? []).includes(DAY_INDEX_TO_NAME[addDays(referenceDate, -1).getDay()]))
    .filter(
      (profile) =>
        !completionKeys.has(getCompletionKey(profile.profileId, yesterdayDate)) &&
        !completionKeys.has(getCompletionKey(profile.profileId, todayDate))
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  if (missedYesterday.length > 0) {
    return {
      profileId: missedYesterday[0].profileId,
      name: missedYesterday[0].name,
      missedDate: yesterdayDate,
      scheduledToday: (missedYesterday[0].scheduledDays ?? []).includes(
        DAY_INDEX_TO_NAME[referenceDate.getDay()]
      ),
    };
  }

  return null;
}

export function getReminderSuggestionProfile(
  profiles: WorkoutProfileSummary[],
  referenceDate: Date = new Date()
): WorkoutProfileSummary | null {
  const todayDayName = DAY_INDEX_TO_NAME[referenceDate.getDay()];
  const todayScheduled = profiles
    .filter((profile) => (profile.scheduledDays ?? []).includes(todayDayName))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (todayScheduled.length > 0) {
    return todayScheduled[0];
  }

  return profiles
    .slice()
    .sort((left, right) => {
      const leftScheduled = (left.scheduledDays ?? []).length;
      const rightScheduled = (right.scheduledDays ?? []).length;
      return rightScheduled - leftScheduled || left.name.localeCompare(right.name);
    })[0] ?? null;
}
