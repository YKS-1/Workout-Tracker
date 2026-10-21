"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  LoaderCircle,
  MoveRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  WorkoutCompletion,
  WorkoutProfileSummary,
  WorkoutScheduleOverride,
} from "@/app/types/workout";
import { useAuthSnapshot } from "@/lib/auth-store";
import {
  DAY_INDEX_TO_NAME,
  WEEK_DAY_LABELS,
  addDays,
  addMonths,
  formatLocalDate,
  formatMonthDayWithWeekday,
  getMonthGridDates,
  getMonthKey,
  getMonthLabel,
  isSameMonth,
  parseMonthKey,
  parseLocalDate,
} from "@/lib/workout-schedule";
import { useTheme } from "@/context/theme-context";

type CalendarSession = {
  profileId: string;
  name: string;
  date: string;
  estimatedCalories: number;
  completed: boolean;
  sourceType: "recurring" | "manual" | "extra";
};

type CalendarSessionState = "scheduled" | "completed" | "missed" | "extra";
type CalendarUser = {
  createdAt: string;
};
type CalendarDeleteType = "manual" | "recurring" | "extra";

function getSessionKey(profileId: string, date: string) {
  return `${profileId}:${date}`;
}

function getSessionStyles(state: CalendarSessionState, isDark: boolean) {
  if (state === "completed") {
    return isDark
      ? "border-green-500/25 bg-green-500/10 text-green-200"
      : "border-green-300 bg-green-100 text-green-700";
  }

  if (state === "extra") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-200";
  }

  if (state === "missed") {
    return isDark
      ? "border-amber-500/20 bg-amber-500/8 text-amber-200"
      : "border-amber-300 bg-amber-100 text-amber-700";
  }

  return isDark
    ? "border-white/10 bg-white/5 text-gray-200"
    : "border-slate-200 bg-slate-50 text-slate-700";
}

function getSessionState(session: CalendarSession, todayDateString: string): CalendarSessionState {
  if (session.sourceType === "extra") {
    return "extra";
  }

  if (session.completed) {
    return "completed";
  }

  if (session.date < todayDateString) {
    return "missed";
  }

  return "scheduled";
}

function getSessionSourceLabel(session: CalendarSession) {
  if (session.sourceType === "manual") {
    return "Added for this day";
  }

  if (session.sourceType === "extra") {
    return "Logged outside the schedule";
  }

  return "From weekly schedule";
}

function getSessionDeleteType(session: CalendarSession): CalendarDeleteType {
  if (session.sourceType === "manual") {
    return "manual";
  }

  if (session.sourceType === "extra") {
    return "extra";
  }

  return "recurring";
}

export default function CalendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingPreviewCount = 4;
  const [monthKey, setMonthKey] = useState(() => getMonthKey(today));
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(today));
  const [isAddRoutineOpen, setIsAddRoutineOpen] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [addingProfileId, setAddingProfileId] = useState<string | null>(null);
  const [removingSessionKey, setRemovingSessionKey] = useState<string | null>(null);
  const { isAuthenticated, userId, token } = useAuthSnapshot();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const pageShell = isDark ? "min-h-screen bg-[#0d1117] text-white" : "min-h-screen bg-white text-slate-900";
  const primaryCard = isDark
    ? "rounded-3xl border border-white/10 bg-[#111827]"
    : "rounded-3xl border border-slate-200 bg-white shadow-sm";
  const secondaryCard = isDark
    ? "rounded-2xl border border-white/8 bg-white/5"
    : "rounded-2xl border border-slate-200 bg-slate-50";
  const headingText = isDark ? "text-white" : "text-slate-900";
  const mutedText = isDark ? "text-gray-400" : "text-slate-500";
  const labelText = isDark ? "text-gray-500" : "text-slate-400";
  const subtleButton = isDark
    ? "inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
    : "inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900";
  const primaryButton = isDark
    ? "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
    : "inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950";
  const actionButton = isDark
    ? "inline-flex min-w-[88px] items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500"
    : "inline-flex min-w-[88px] items-center justify-center rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500";

  const { data: profiles = [], isLoading: profilesLoading, isError: profilesError } = useQuery<
    WorkoutProfileSummary[]
  >({
    queryKey: ["calendar-profiles", userId],
    queryFn: async () => {
      const res = await fetch(`/api/workouts?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch workouts");
      }

      return res.json();
    },
    enabled: !!userId && !!token,
  });

  const {
    data: completions = [],
    isLoading: completionsLoading,
    isError: completionsError,
  } = useQuery<WorkoutCompletion[]>({
    queryKey: ["calendar-completions", userId],
    queryFn: async () => {
      const res = await fetch(`/api/workouts/completions?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch completions");
      }

      return res.json();
    },
    enabled: !!userId && !!token,
  });

  const {
    data: scheduleOverrides = [],
    isLoading: overridesLoading,
    isError: overridesError,
  } = useQuery<WorkoutScheduleOverride[]>({
    queryKey: ["calendar-schedule-overrides", userId],
    queryFn: async () => {
      const res = await fetch(`/api/workouts/schedule?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch schedule overrides");
      }

      return res.json();
    },
    enabled: !!userId && !!token,
  });

  const {
    data: userProfile,
    isLoading: userLoading,
    isError: userError,
  } = useQuery<CalendarUser | null>({
    queryKey: ["calendar-user", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);

      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }

      const data = await res.json();
      return data?.user ?? null;
    },
    enabled: !!userId,
  });

  const refreshCalendarData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["calendar-completions", userId] }),
      queryClient.invalidateQueries({ queryKey: ["workout-completions", userId] }),
      queryClient.invalidateQueries({ queryKey: ["calendar-schedule-overrides", userId] }),
    ]);
  };

  const addScheduleMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await fetch("/api/workouts/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          profileId,
          scheduledFor: selectedDateString,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add workout to that day");
      }

      return data;
    },
    onMutate: (profileId) => {
      setAddingProfileId(profileId);
    },
    onSuccess: async () => {
      setIsAddRoutineOpen(false);
      await refreshCalendarData();
    },
    onSettled: () => {
      setAddingProfileId(null);
    },
  });

  const removeScheduleMutation = useMutation({
    mutationFn: async ({
      profileId,
      scheduledFor,
      sessionType,
    }: {
      profileId: string;
      scheduledFor: string;
      sessionType: CalendarDeleteType;
    }) => {
      const res = await fetch("/api/workouts/schedule", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          profileId,
          scheduledFor,
          sessionType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove workout from that day");
      }

      return data;
    },
    onMutate: ({ profileId, scheduledFor }) => {
      setRemovingSessionKey(getSessionKey(profileId, scheduledFor));
    },
    onSuccess: async () => {
      await refreshCalendarData();
    },
    onSettled: () => {
      setRemovingSessionKey(null);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className={pageShell}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className={`${primaryCard} px-8 py-12 text-center`}>
            <CalendarDays className={`mx-auto mb-4 h-10 w-10 ${labelText}`} />
            <h1 className={`text-2xl font-bold ${headingText}`}>Sign in to view your calendar</h1>
            <p className={`mt-2 text-sm ${mutedText}`}>
              Your workout schedule and upcoming sessions will show up here once you&apos;re logged in.
            </p>
            <Link
              href="/login"
              className={`mt-6 ${primaryButton}`}
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (
    !userId ||
    !token ||
    profilesLoading ||
    completionsLoading ||
    overridesLoading ||
    userLoading
  ) {
    return (
      <div className={pageShell}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className={`animate-pulse ${primaryCard} p-6`}>
            <div className={`mb-4 h-8 w-56 rounded-lg ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
            <div className={`mb-6 h-4 w-80 rounded-lg ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
              <div className={`h-[720px] rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
              <div className="space-y-6">
                <div className={`h-72 rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
                <div className={`h-64 rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
                <div className={`h-72 rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profilesError || completionsError || overridesError || userError || !userProfile) {
    return (
      <div className={pageShell}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-8 py-10 text-center">
            <h1 className={`text-2xl font-bold ${headingText}`}>Couldn&apos;t load your calendar</h1>
            <p className="mt-2 text-sm text-red-100/80">
              Try refreshing the page. If it keeps happening, the workout API may still be restarting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const todayDateString = formatLocalDate(today);
  const displayedMonth = parseMonthKey(monthKey);
  const monthDates = getMonthGridDates(displayedMonth);
  const accountCreatedDateString = formatLocalDate(new Date(userProfile.createdAt));
  const addError =
    addScheduleMutation.error instanceof Error ? addScheduleMutation.error.message : null;
  const removeError =
    removeScheduleMutation.error instanceof Error ? removeScheduleMutation.error.message : null;

  const profileById = new Map(profiles.map((profile) => [profile.profileId, profile] as const));
  const visibleCompletions = completions;
  const completionKeys = new Set(
    visibleCompletions.map((completion) => getSessionKey(completion.profileId, completion.completedOn)),
  );

  const visibleOverrides = scheduleOverrides;
  const skipKeys = new Set(
    visibleOverrides
      .filter((override) => override.overrideType === "skip")
      .map((override) => getSessionKey(override.profileId, override.scheduledFor)),
  );
  const manualAddsByDate = new Map<string, WorkoutScheduleOverride[]>();

  for (const override of visibleOverrides) {
    if (override.overrideType !== "manual_add") {
      continue;
    }

    if (!manualAddsByDate.has(override.scheduledFor)) {
      manualAddsByDate.set(override.scheduledFor, []);
    }

    manualAddsByDate.get(override.scheduledFor)!.push(override);
  }

  const completedSessionsByDate = new Map<string, CalendarSession[]>();
  for (const completion of visibleCompletions) {
    const profile = profileById.get(completion.profileId);
    if (!profile) continue;

    if (!completedSessionsByDate.has(completion.completedOn)) {
      completedSessionsByDate.set(completion.completedOn, []);
    }

    completedSessionsByDate.get(completion.completedOn)!.push({
      profileId: completion.profileId,
      name: profile.name,
      date: completion.completedOn,
      estimatedCalories: completion.estimatedCalories ?? profile.estimatedCalories ?? 0,
      completed: true,
      sourceType: "extra",
    });
  }

  const scheduledSessionsByDate = new Map<string, CalendarSession[]>();
  for (
    let cursor = new Date(monthDates[0]);
    cursor <= monthDates[monthDates.length - 1];
    cursor = addDays(cursor, 1)
  ) {
    const dateString = formatLocalDate(cursor);
    const isBeforeAccountCreated = dateString < accountCreatedDateString;
    const dayName = DAY_INDEX_TO_NAME[cursor.getDay()];
    const recurringSessions = isBeforeAccountCreated
      ? []
      : profiles
          .filter((profile) => (profile.scheduledDays ?? []).includes(dayName))
          .filter((profile) => !skipKeys.has(getSessionKey(profile.profileId, dateString)))
          .map((profile) => ({
            profileId: profile.profileId,
            name: profile.name,
            date: dateString,
            estimatedCalories: profile.estimatedCalories ?? 0,
            completed: completionKeys.has(getSessionKey(profile.profileId, dateString)),
            sourceType: "recurring" as const,
          }));

    const manualSessions = (manualAddsByDate.get(dateString) ?? [])
      .map((override) => {
        const profile = profileById.get(override.profileId);
        if (!profile) {
          return null;
        }

        return {
          profileId: profile.profileId,
          name: profile.name,
          date: dateString,
          estimatedCalories: profile.estimatedCalories ?? 0,
          completed: completionKeys.has(getSessionKey(profile.profileId, dateString)),
          sourceType: "manual" as const,
        };
      })
      .filter((session): session is CalendarSession => Boolean(session))
      .filter(
        (session) =>
          !recurringSessions.some((recurringSession) => recurringSession.profileId === session.profileId),
      );

    const sessionsForDate = [...recurringSessions, ...manualSessions].sort(
      (left, right) => left.name.localeCompare(right.name),
    );

    if (sessionsForDate.length > 0) {
      scheduledSessionsByDate.set(dateString, sessionsForDate);
    }
  }

  const monthPrefix = monthKey;
  const scheduledSessionsThisMonth = Array.from(scheduledSessionsByDate.values())
    .flat()
    .filter((session) => session.date.startsWith(monthPrefix))
    .sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name));
  const scheduledThisMonth = scheduledSessionsThisMonth.length;
  const completedThisMonth = visibleCompletions.filter((completion) =>
    completion.completedOn.startsWith(monthPrefix),
  ).length;
  const caloriesThisMonth = visibleCompletions
    .filter((completion) => completion.completedOn.startsWith(monthPrefix))
    .reduce(
      (sum, completion) =>
        sum + (completion.estimatedCalories ?? profileById.get(completion.profileId)?.estimatedCalories ?? 0),
      0,
    );
  const upcomingSessionsThisMonth = scheduledSessionsThisMonth.filter(
    (session) => session.date >= todayDateString,
  );
  const visibleUpcomingSessions = showAllUpcoming
    ? upcomingSessionsThisMonth
    : upcomingSessionsThisMonth.slice(0, upcomingPreviewCount);
  const workoutsWithSchedules = profiles
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));
  const selectedDateString =
    getMonthKey(parseLocalDate(selectedDate)) === monthKey
      ? selectedDate
      : getMonthKey(displayedMonth) === getMonthKey(today)
        ? todayDateString
        : formatLocalDate(displayedMonth);
  const selectedScheduledSessions = scheduledSessionsByDate.get(selectedDateString) ?? [];
  const selectedScheduledProfileIds = new Set(
    selectedScheduledSessions.map((session) => session.profileId),
  );
  const selectedCompletedSessions = completedSessionsByDate.get(selectedDateString) ?? [];
  const selectedExtraSessions = selectedCompletedSessions
    .filter((session) => !selectedScheduledProfileIds.has(session.profileId))
    .map((session) => ({
      ...session,
      sourceType: "extra" as const,
    }));
  const selectedDaySessions = [...selectedScheduledSessions, ...selectedExtraSessions].sort(
    (left, right) => left.name.localeCompare(right.name),
  );
  const selectedDateInFuture = selectedDateString > todayDateString;
  const selectedLoggedExtraProfileIds = new Set(selectedExtraSessions.map((session) => session.profileId));

  const goToMonth = (nextMonth: Date) => {
    const nextMonthKey = getMonthKey(nextMonth);
    setMonthKey(nextMonthKey);
    setSelectedDate(nextMonthKey === getMonthKey(today) ? todayDateString : formatLocalDate(nextMonth));
    setIsAddRoutineOpen(false);
    setShowAllUpcoming(false);
  };

  return (
    <div className={pageShell}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${labelText}`}>
              Workout Calendar
            </p>
            <h1 className={`mt-2 text-3xl font-bold ${headingText}`}>
              See your workouts, scheduled sessions, and what&apos;s coming next
            </h1>
            <p className={`mt-2 text-sm ${mutedText}`}>
              Click any day to manage that date. You can add a routine for a one-off session or remove a workout and its completed log together.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/workouts"
              className={subtleButton.replace("gap-1", "gap-2")}
            >
              <Dumbbell className="h-4 w-4" />
              Manage workouts
            </Link>
            <Link
              href="/dashboard"
              className={primaryButton}
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Scheduled This Month", value: String(scheduledThisMonth) },
            { label: "Completed This Month", value: String(completedThisMonth) },
            { label: "Upcoming This Month", value: String(upcomingSessionsThisMonth.length) },
            { label: "Calories This Month", value: `~${caloriesThisMonth}` },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${isDark ? "border-white/8 bg-[#111827]" : "border-slate-200 bg-white shadow-sm"} rounded-2xl border px-5 py-4`}
            >
              <p className={`text-2xl font-bold ${headingText}`}>{stat.value}</p>
              <p className={`mt-1 text-xs ${labelText}`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {profiles.length === 0 ? (
          <div className={`${primaryCard} px-8 py-12 text-center`}>
            <CalendarDays className={`mx-auto mb-4 h-10 w-10 ${labelText}`} />
            <h2 className={`text-2xl font-bold ${headingText}`}>No workouts yet</h2>
            <p className={`mt-2 text-sm ${mutedText}`}>
              Create a workout and add scheduled days to start filling out your calendar.
            </p>
            <Link
              href="/workouts/create"
              className={`mt-6 ${primaryButton}`}
            >
              Create workout
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2.35fr)_320px] 2xl:grid-cols-[minmax(0,2.45fr)_340px]">
            <section className={`${primaryCard} p-5`}>
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${labelText}`}>
                    Month View
                  </p>
                  <h2 className={`mt-2 text-2xl font-bold ${headingText}`}>
                    {getMonthLabel(displayedMonth)}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToMonth(addMonths(displayedMonth, -1))}
                    className={subtleButton}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => goToMonth(today)}
                    className={subtleButton}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => goToMonth(addMonths(displayedMonth, 1))}
                    className={subtleButton}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto xl:overflow-visible">
                <div className="grid min-w-[700px] grid-cols-7 gap-1.5 text-center xl:min-w-0">
                  {WEEK_DAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className={`${isDark ? "bg-white/5" : "bg-slate-50"} rounded-xl px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${labelText}`}
                    >
                      {label}
                    </div>
                  ))}

                  {monthDates.map((date) => {
                    const dateString = formatLocalDate(date);
                    const scheduledSessions = scheduledSessionsByDate.get(dateString) ?? [];
                    const completedSessions = completedSessionsByDate.get(dateString) ?? [];
                    const completedProfileIds = new Set(
                      completedSessions.map((session) => session.profileId),
                    );
                    const extraCompletedSessions = completedSessions.filter(
                      (session) =>
                        !scheduledSessions.some((scheduled) => scheduled.profileId === session.profileId),
                    );
                    const calendarItems = [
                      ...scheduledSessions,
                      ...extraCompletedSessions.map((session) => ({
                        ...session,
                        sourceType: "extra" as const,
                      })),
                    ];
                    const hiddenCount = Math.max(0, calendarItems.length - 3);
                    const isToday = dateString === todayDateString;
                    const isSelected = dateString === selectedDateString;
                    const beforeSignup = dateString < accountCreatedDateString;

                    return (
                      <div
                        key={dateString}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedDate(dateString);
                          setIsAddRoutineOpen(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedDate(dateString);
                            setIsAddRoutineOpen(false);
                          }
                        }}
                        className={`min-h-[136px] cursor-pointer rounded-2xl border p-2.5 text-left transition xl:min-h-[148px] ${
                          isSameMonth(date, displayedMonth)
                            ? isDark
                              ? "bg-[#0d1117]"
                              : "bg-white"
                            : isDark
                              ? "bg-[#0f1520]/70"
                              : "bg-slate-50"
                        } ${
                          isSelected
                            ? "border-blue-400/45 ring-1 ring-blue-400/30"
                            : isSameMonth(date, displayedMonth)
                              ? isDark
                                ? "border-white/8 hover:border-white/15"
                                : "border-slate-200 hover:border-slate-300"
                              : isDark
                                ? "border-white/5 hover:border-white/10"
                                : "border-slate-200/80 hover:border-slate-300"
                        } ${beforeSignup ? "opacity-60" : ""}`}
                      >
                        <div className="mb-2.5 flex items-center justify-between">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                              isToday
                                ? isDark
                                  ? "bg-white text-gray-900"
                                  : "bg-blue-900 text-white"
                                : isSameMonth(date, displayedMonth)
                                  ? headingText
                                  : isDark
                                    ? "text-gray-600"
                                    : "text-slate-400"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {completedProfileIds.size > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-300">
                              <CheckCircle2 className="h-3 w-3" />
                              {completedProfileIds.size}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {calendarItems.slice(0, 3).map((session) => {
                            const state = getSessionState(session, todayDateString);

                            return (
                              <div
                                key={`${session.profileId}-${session.date}-${session.sourceType}`}
                                className={`rounded-xl border px-2 py-1.5 text-[10px] xl:text-[11px] ${getSessionStyles(state, isDark)}`}
                                title={`${session.name} • ${session.estimatedCalories} estimated calories`}
                              >
                                <p className="truncate font-medium">{session.name}</p>
                                <p className="mt-0.5 text-[10px] opacity-75">
                                  {state === "completed"
                                    ? "Completed"
                                    : state === "missed"
                                      ? "Missed"
                                      : state === "extra"
                                        ? "Extra session"
                                        : "Scheduled"}
                                </p>
                              </div>
                            );
                          })}

                          {hiddenCount > 0 && (
                            <p className={`px-1 text-[11px] ${labelText}`}>+{hiddenCount} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-6">
              <section className={`${primaryCard} p-5`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${labelText}`}>
                      Selected Day
                    </p>
                    <h2 className={`mt-2 text-xl font-bold ${headingText}`}>
                      {formatMonthDayWithWeekday(parseLocalDate(selectedDateString))}
                    </h2>
                    <p className={`mt-1 text-xs ${mutedText}`}>
                      Log a workout, add a routine to this date, or remove a scheduled session from here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddRoutineOpen((current) => !current)}
                    className={`${subtleButton} text-xs`}
                  >
                    <Plus className="h-4 w-4" />
                    {selectedDateInFuture ? "Add workout" : "Add or log workout"}
                  </button>
                </div>

                {selectedDateInFuture && (
                  <div className={`mb-4 ${secondaryCard} px-4 py-3 text-sm ${mutedText}`}>
                    You can add workouts to future dates here, but workout logs are only available for today or earlier.
                  </div>
                )}

                {addError && (
                  <p className="mb-3 text-sm text-red-300">{addError}</p>
                )}
                {removeError && (
                  <p className="mb-3 text-sm text-red-300">{removeError}</p>
                )}

                {isAddRoutineOpen && (
                  <div className={`mb-4 ${secondaryCard} p-3`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${labelText}`}>
                      Choose A Routine
                    </p>
                    {selectedDateInFuture && (
                      <p className={`mt-2 text-xs ${mutedText}`}>
                        You can schedule a routine for this future date now. Logging stays disabled until that date arrives.
                      </p>
                    )}
                    <div className="mt-3 space-y-2">
                      {workoutsWithSchedules.map((profile) => {
                        const alreadyScheduled = selectedScheduledProfileIds.has(profile.profileId);
                        const alreadyLoggedExtra = selectedLoggedExtraProfileIds.has(profile.profileId);
                        const isAddingThisProfile = addingProfileId === profile.profileId;

                        return (
                          <div
                            key={`add-${selectedDateString}-${profile.profileId}`}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 ${isDark ? "border-white/8 bg-[#0d1117]" : "border-slate-200 bg-white"}`}
                          >
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${headingText}`}>{profile.name}</p>
                              <p className={`mt-1 text-xs ${mutedText}`}>
                                {profile.exerciseCount ?? 0} exercise
                                {(profile.exerciseCount ?? 0) === 1 ? "" : "s"} · ~
                                {profile.estimatedCalories ?? 0} cal
                                {alreadyLoggedExtra ? " · already logged on this date" : ""}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {!selectedDateInFuture && (
                                <Link
                                  href={`/workouts/${profile.profileId}/log?date=${selectedDateString}`}
                                  className={`${subtleButton} min-w-[88px] justify-center text-xs`}
                                >
                                  Log
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => addScheduleMutation.mutate(profile.profileId)}
                                disabled={alreadyScheduled || addScheduleMutation.isPending}
                                className={actionButton}
                              >
                                {isAddingThisProfile ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : alreadyScheduled ? (
                                  "Scheduled"
                                ) : (
                                  "Add to day"
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDaySessions.length === 0 ? (
                  <div className={`${secondaryCard} px-4 py-5 text-sm ${mutedText}`}>
                    Nothing is scheduled or logged for this date yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDaySessions.map((session) => {
                      const sessionKey = getSessionKey(session.profileId, session.date);
                      const sessionState = getSessionState(session, todayDateString);
                      const isRemovingThisSession = removingSessionKey === sessionKey;

                      return (
                        <div
                          key={`${session.profileId}-${session.date}-${session.sourceType}`}
                          className={`rounded-2xl border px-4 py-3 ${getSessionStyles(sessionState, isDark)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${headingText}`}>{session.name}</p>
                              <p className="mt-1 text-xs opacity-80">
                                {getSessionSourceLabel(session)} · ~{session.estimatedCalories} cal
                              </p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-90 ${isDark ? "bg-black/15" : "bg-black/5"}`}>
                              {sessionState === "completed"
                                ? "Completed"
                                : sessionState === "missed"
                                  ? "Missed"
                                  : sessionState === "extra"
                                    ? "Extra"
                                    : "Scheduled"}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {!selectedDateInFuture && (
                                <Link
                                  href={`/workouts/${session.profileId}/log?date=${session.date}`}
                                  className={`inline-flex items-center gap-1 text-xs font-medium transition ${isDark ? "text-gray-200 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                                >
                                  {session.completed ? "Edit log" : "Log workout"}
                                  <MoveRight className="h-3.5 w-3.5" />
                                </Link>
                              )}
                              <Link
                                href={`/workouts/${session.profileId}`}
                                className={`inline-flex items-center gap-1 text-xs font-medium transition ${isDark ? "text-gray-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
                              >
                                View workout
                                <MoveRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeScheduleMutation.mutate({
                                  profileId: session.profileId,
                                  scheduledFor: session.date,
                                  sessionType: getSessionDeleteType(session),
                                })
                              }
                              disabled={removeScheduleMutation.isPending}
                              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "border-white/10 bg-black/15 text-white/90 hover:bg-black/25" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                              {isRemovingThisSession ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className={`${primaryCard} p-5`}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${labelText}`}>
                      Upcoming Scheduled Workouts This Month
                    </p>
                    <h2 className={`mt-2 text-xl font-bold ${headingText}`}>
                      {getMonthLabel(displayedMonth)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {upcomingSessionsThisMonth.length > upcomingPreviewCount && (
                      <button
                        type="button"
                        onClick={() => setShowAllUpcoming((current) => !current)}
                        className={`${isDark ? "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"} rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition`}
                      >
                        {showAllUpcoming ? "Show less" : "Show all"}
                      </button>
                    )}
                    <Clock3 className={`h-5 w-5 ${labelText}`} />
                  </div>
                </div>

                {upcomingSessionsThisMonth.length === 0 ? (
                  <p className={`text-sm ${mutedText}`}>
                    No upcoming scheduled workouts in {getMonthLabel(displayedMonth)}.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {visibleUpcomingSessions.map((session) => (
                      <div
                        key={`${session.profileId}-${session.date}-${session.sourceType}`}
                        className={`${secondaryCard} px-3.5 py-3`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(session.date);
                                setIsAddRoutineOpen(false);
                              }}
                              className="text-left"
                            >
                              <p className={`text-[13px] font-semibold ${headingText}`}>{session.name}</p>
                              <p className={`mt-1 text-[11px] ${mutedText}`}>
                                {formatMonthDayWithWeekday(parseLocalDate(session.date))}
                              </p>
                            </button>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              session.completed
                                ? isDark
                                  ? "bg-green-500/10 text-green-300"
                                  : "border border-green-300 bg-green-100 text-green-700"
                                : isDark
                                  ? "bg-blue-500/10 text-blue-200"
                                  : "border border-blue-300 bg-blue-100 text-blue-700"
                            }`}
                          >
                            {session.completed ? "Done" : "Upcoming"}
                          </span>
                        </div>
                        <div className={`mt-2.5 flex items-center justify-between text-[11px] ${mutedText}`}>
                          <span>~{session.estimatedCalories} cal</span>
                          <Link
                            href={`/workouts/${session.profileId}`}
                            className={`inline-flex items-center gap-1 transition ${isDark ? "text-gray-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            View workout
                            <MoveRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
