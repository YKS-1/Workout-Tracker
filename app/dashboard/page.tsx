"use client";

import PostInteractions from "@/components/post-interactions";
import UserAvatar from "@/components/user-avatar";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Post as BasePost } from "@/interfaces/Post";
import { useAuthSnapshot } from "@/lib/auth-store";
import {
	WorkoutCompletion,
	WorkoutProfileSummary,
	WorkoutScheduleOverride,
} from "@/app/types/workout";
import { GoalSettings } from "@/app/types/goals";
import {
	DAY_INDEX_TO_NAME,
	DAY_NAME_TO_INDEX,
	WEEK_DAY_LABELS,
	isWeekDayName,
	getDayIndexFromDateString,
	getWeekDateMap,
	countWeeklyStreak,
	addDays,
	formatLocalDate,
	formatMonthDay,
	getStartOfWeek,
	parseLocalDate,
} from "@/lib/workout-schedule";
import {
	DEFAULT_GOAL_SETTINGS,
	formatReminderTimeLabel,
	getPreviousWeekSummary,
	getRecoverySuggestion,
	getTodayCompletions,
	getWeeklyGoalProgress,
	isReminderDue,
} from "@/lib/goal-tracking";
import { useTheme } from "@/context/theme-context";

import {
	BarChart2,
	Dumbbell,
	Users,
	Bot,
	User,
	CalendarDays,
	CheckCircle2,
	X,
	ChevronRight,
	Clock3,
	Flame,
	LoaderCircle,
	MoonStar,
	Settings,
	Target,
	ClipboardList,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";

type Post = BasePost & {
  username: string;
  firstName?: string;
  lastName?: string;
  initials?: string;
};

function getQuickLinks(username: string) {
  return [
    { label: "Edit Profile", href: `/profile/${username}`, icon: <User size={16} /> },
    { label: "Browse Feed", href: "/feed", icon: <Users size={16} /> },
    { label: "Calendar", href: "/calendar", icon: <CalendarDays size={16} /> },
    { label: "Custom Workouts", href: "/workouts", icon: <ClipboardList size={16} /> },
    { label: "Ask AI Coach", href: "/ai", icon: <Bot size={16} /> },
  ];
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getPreviousWeekFeedback(summary: NonNullable<ReturnType<typeof getPreviousWeekSummary>>) {
  if (summary.met) {
    if (summary.recoverySessions > 0) {
      return "You hit your goal and used recovery mode to stay consistent. That is momentum, not perfection.";
    }
    return "You hit your target last week. Your routine is holding steady, so keep building on it.";
  }
  if (summary.recoverySessions > 0) {
    return "You missed the target, but the recovery sessions still protected your momentum. This week is a reset, not a restart.";
  }
  return "Last week fell short of the goal. Recovery mode is ready to help you bounce back without blowing up the whole routine.";
}

function areGoalSettingsEqual(left: GoalSettings, right: GoalSettings) {
  return (
    left.weeklyWorkoutGoal === right.weeklyWorkoutGoal &&
    left.reminderTime === right.reminderTime &&
    left.recoveryModeEnabled === right.recoveryModeEnabled
  );
}

export default function DashboardPage() {
  const [goalForm, setGoalForm] = useState<GoalSettings>(DEFAULT_GOAL_SETTINGS);
  const [isGoalPlannerExpanded, setIsGoalPlannerExpanded] = useState(false);
  const [isRecoveryChooserOpen, setIsRecoveryChooserOpen] = useState(false);
  const [isRecentFeedExpanded, setIsRecentFeedExpanded] = useState(false);
  const [dismissedGoalSummaryWeek, setDismissedGoalSummaryWeek] = useState<string | null>(null);

  const { userId, username: usernameFromToken, token } = useAuthSnapshot();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const isDark = theme === "dark";

  // Page background
  const pageBg = isDark ? "bg-[#0d1117] text-white" : "text-gray-900";

  // Card / panel surface
  const cardBg = isDark
    ? "bg-[#111827] border-white/8"
    : "bg-white border-gray-200";

  // Muted label text (section headers, sub-labels)
  const mutedText = isDark ? "text-gray-500" : "text-gray-400";

  // Secondary body text
  const secondaryText = isDark ? "text-gray-400" : "text-gray-500";

  // Primary body text (readable prose)
  const bodyText = isDark ? "text-gray-300" : "text-gray-700";

  // Heading / strong text
  const headingText = isDark ? "text-white" : "text-gray-900";

  // Divider / subtle border inside cards
  const innerBorder = isDark ? "border-white/8" : "border-gray-100";

  // Subtle fill for nested surfaces (post content box, inner panels)
  const subtleFill = isDark ? "bg-white/[0.04]" : "bg-gray-50";

  // Hover card (feed item hover)
  const cardHover = isDark
    ? "hover:border-white/15 hover:bg-[#151d2c]"
    : "hover:border-gray-300 hover:bg-gray-50";

  // Progress track
  const progressTrack = isDark ? "bg-white/8" : "bg-gray-200";

  // Progress fill
  const progressFill = isDark ? "bg-white" : "bg-gray-800";

  // Input fields inside goal planner
  const inputClass = isDark
    ? "border-white/10 bg-white/5 text-white focus:border-white/20"
    : "border-gray-200 bg-white text-gray-900 focus:border-gray-400";

  // Checkbox-style label block
  const checkboxCard = isDark
    ? "border-white/10 bg-white/5"
    : "border-gray-200 bg-gray-50";

  // Primary CTA button (solid white / solid dark)
  const primaryBtn = isDark
    ? "bg-white text-gray-900 hover:bg-gray-100"
    : "bg-gray-900 text-white hover:bg-gray-800";

  // Secondary / ghost button
  const ghostBtn = isDark
    ? "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white"
    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900";

  // Quick link row
  const quickLinkClass = isDark
    ? "bg-[#111827] hover:bg-white/8 border-white/8 text-gray-300 hover:text-white"
    : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900";

  const quickLinkIcon = isDark ? "text-gray-500" : "text-gray-400";
  const quickLinkChevron = isDark ? "text-gray-600" : "text-gray-300";

  // Pulse skeleton
  const skeletonBg = isDark ? "bg-white/10" : "bg-gray-200";
  const skeletonSub = isDark ? "bg-white/5" : "bg-gray-100";

  // Day cell states
  const dayCompletedScheduled = isDark
    ? "bg-green-500/15 border-green-500/30 text-green-300"
    : "bg-green-50 border-green-300 text-green-700";
  const dayScheduledOnly = isDark
    ? "border-white/20 text-gray-300"
    : "border-gray-300 text-gray-500";
  const dayCompletedExtra = isDark
    ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
    : "bg-sky-50 border-sky-300 text-sky-600";
  const dayEmpty = isDark ? "bg-white/4 text-gray-700" : "bg-gray-100 text-gray-300";
  const dayTodayRing = isDark
    ? "ring-2 ring-white/35 ring-offset-2 ring-offset-[#111827]"
    : "ring-2 ring-gray-400/50 ring-offset-2 ring-offset-white";

  // Status pill (on-track vs in-progress)
  const onTrackPill = isDark
    ? "text-green-400 bg-green-500/10 border-green-500/20"
    : "text-green-700 bg-green-50 border-green-200";
  const inProgressPill = isDark
    ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
    : "text-yellow-700 bg-yellow-50 border-yellow-200";

  // Goal met / remaining pill
  const goalMetPill = isDark
    ? "text-green-400 bg-green-500/10 border-green-500/20"
    : "text-green-700 bg-green-50 border-green-200";
  const goalRemainingPill = isDark
    ? "text-sky-300 bg-sky-500/10 border-sky-500/20"
    : "text-sky-700 bg-sky-50 border-sky-200";

  // Dismiss button (week summary)
  const dismissBtn = isDark
    ? "border-white/10 bg-black/10 text-gray-300 hover:bg-black/20 hover:text-white"
    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900";

  // Recovery chooser inner surface
  const recoveryChooserBg = isDark
    ? "border-white/8 bg-black/10"
    : "border-gray-100 bg-gray-50";

  // Recovery choice card
  const recoveryChoiceCard = isDark
    ? "border-white/8 bg-white/5 hover:border-white/15 hover:bg-white/8"
    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50";

  // Extra sessions note
  const extraSessionsText = isDark ? "text-sky-300" : "text-sky-600";

  // ──────────────────────────────────────────────────────────────────────────

  const { data: userProfile } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      return data?.user ?? null;
    },
    enabled: !!userId,
  });

  const username = userProfile?.username ?? usernameFromToken ?? "there";
  const accountCreatedDateString = userProfile?.createdAt
    ? formatLocalDate(new Date(userProfile.createdAt))
    : undefined;
  const quickLinks = getQuickLinks(username);

  const { data: recentPosts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["dashboard-posts"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/posts`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      return data?.data?.posts ?? [];
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: profiles = [] } = useQuery<WorkoutProfileSummary[]>({
    queryKey: ["profiles", userId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/workouts?userId=${userId}`
      );
      if (!res.ok) throw new Error("Failed to fetch profiles");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: completions = [] } = useQuery<WorkoutCompletion[]>({
    queryKey: ["workout-completions", userId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/workouts/completions?userId=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch workout completions");
      return res.json();
    },
    enabled: !!userId && !!token,
  });

  const { data: scheduleOverrides = [] } = useQuery<WorkoutScheduleOverride[]>({
    queryKey: ["dashboard-schedule-overrides", userId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/workouts/schedule?userId=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch schedule overrides");
      return res.json();
    },
    enabled: !!userId && !!token,
  });

  const { data: goalSettings = DEFAULT_GOAL_SETTINGS } = useQuery<GoalSettings>({
    queryKey: ["goal-settings", userId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/goals?userId=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch goal settings");
      return res.json();
    },
    enabled: !!userId && !!token,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setGoalForm(goalSettings);
  }, [goalSettings]);

  const saveGoalSettingsMutation = useMutation({
    mutationFn: async (settings: GoalSettings) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/goals`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, ...settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save goal settings");
      return data as GoalSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["goal-settings", userId], data);
      setGoalForm(data);
      setIsGoalPlannerExpanded(false);
    },
  });

  const recoveryCompletionMutation = useMutation({
    mutationFn: async ({
      profileId,
      completionMode,
    }: {
      profileId: string;
      completionMode: "minimum" | "alternate";
    }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/workouts/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          profileId,
          completedOn: formatLocalDate(new Date()),
          completionMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log recovery workout");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-completions", userId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-completions", userId] });
    },
  });

  const weekDateByDayName = getWeekDateMap();
  const todayDayIndex = new Date().getDay();
  const currentWeekDateSet = new Set(Object.values(weekDateByDayName));
  const completionsThisWeek = completions.filter((c) => currentWeekDateSet.has(c.completedOn));
  const completionKeysThisWeek = new Set(
    completionsThisWeek.map((c) => `${c.profileId}:${c.completedOn}`)
  );
  const caloriesByProfileId = new Map(
    profiles.map((p) => [p.profileId, p.estimatedCalories ?? 0] as const)
  );
  const caloriesBurnedThisWeek = completionsThisWeek.reduce(
    (sum, c) => sum + (c.estimatedCalories ?? caloriesByProfileId.get(c.profileId) ?? 0),
    0
  );
  const scheduledDayIndices = new Set(
    profiles.flatMap((p) =>
      (p.scheduledDays ?? []).filter(isWeekDayName).map((day) => DAY_NAME_TO_INDEX[day])
    )
  );
  const scheduledSessionsThisWeek = profiles.flatMap((profile) =>
    (profile.scheduledDays ?? [])
      .filter(isWeekDayName)
      .map((day) => weekDateByDayName[day])
      .filter((date): date is string => !!date)
      .map((date) => `${profile.profileId}:${date}`)
  );
  const completedScheduledSessionsThisWeek = scheduledSessionsThisWeek.filter((k) =>
    completionKeysThisWeek.has(k)
  ).length;
  const completedSessionsThisWeek = completionsThisWeek.length;
  const extraSessionsThisWeek = Math.max(
    0,
    completedSessionsThisWeek - completedScheduledSessionsThisWeek
  );
  const progressPercent =
    scheduledSessionsThisWeek.length > 0
      ? Math.min(100, (completedScheduledSessionsThisWeek / scheduledSessionsThisWeek.length) * 100)
      : 0;
  const completedDayIndices = new Set(
    completionsThisWeek.map((c) => getDayIndexFromDateString(c.completedOn))
  );
  const streakWeeks = countWeeklyStreak(completions.map((c) => c.completedOn));
  const goalProgress = getWeeklyGoalProgress(
    completions,
    goalSettings.weeklyWorkoutGoal,
    new Date(),
    accountCreatedDateString
  );
  const previousWeekSummary = getPreviousWeekSummary(
    completions,
    goalSettings.weeklyWorkoutGoal,
    new Date(),
    accountCreatedDateString
  );
  const previousWeekFeedback = previousWeekSummary
    ? getPreviousWeekFeedback(previousWeekSummary)
    : null;
  const previousWeekSummaryKey = previousWeekSummary?.startDate ?? null;
  const todayDateString = formatLocalDate(new Date());
  const todayDayName = DAY_INDEX_TO_NAME[new Date().getDay()];
  const todaySkippedProfileIds = new Set(
    scheduleOverrides
      .filter((o) => o.scheduledFor === todayDateString && o.overrideType === "skip")
      .map((o) => o.profileId)
  );
  const todayManualAddProfiles = scheduleOverrides
    .filter((o) => o.scheduledFor === todayDateString && o.overrideType === "manual_add")
    .map((o) => profiles.find((p) => p.profileId === o.profileId) ?? null)
    .filter((p): p is WorkoutProfileSummary => Boolean(p));
  const todayRecurringProfiles = profiles.filter(
    (p) => (p.scheduledDays ?? []).includes(todayDayName) && !todaySkippedProfileIds.has(p.profileId)
  );
  const todayScheduledProfiles = [...todayRecurringProfiles];
  for (const profile of todayManualAddProfiles) {
    if (!todayScheduledProfiles.some((sp) => sp.profileId === profile.profileId)) {
      todayScheduledProfiles.push(profile);
    }
  }
  todayScheduledProfiles.sort((a, b) => a.name.localeCompare(b.name));
  const reminderProfile = todayScheduledProfiles[0] ?? null;
  const reminderDueNow =
    goalSettings.weeklyWorkoutGoal > 0 &&
    goalProgress.remaining > 0 &&
    todayScheduledProfiles.length > 0 &&
    isReminderDue(goalSettings.reminderTime, completions);
  const recoverySuggestion = goalSettings.recoveryModeEnabled
    ? getRecoverySuggestion(profiles, completions)
    : null;
  const todayCompletions = getTodayCompletions(completions);
  const showRecoveryBanner = !!recoverySuggestion && todayCompletions.length === 0;
  const showReminderBanner =
    !showRecoveryBanner && reminderDueNow && !!reminderProfile && todayCompletions.length === 0;
  const recoveryChoiceProfiles = recoverySuggestion
    ? profiles.slice().sort((a, b) => {
        const ap = a.profileId === recoverySuggestion.profileId ? -1 : 0;
        const bp = b.profileId === recoverySuggestion.profileId ? -1 : 0;
        return ap - bp || a.name.localeCompare(b.name);
      })
    : [];
  const isGoalPlannerDirty = !areGoalSettingsEqual(goalForm, goalSettings);
  const scheduleStatusLabel =
    scheduledSessionsThisWeek.length === 0
      ? "Not set"
      : completedScheduledSessionsThisWeek >= scheduledSessionsThisWeek.length
      ? "On track"
      : "In progress";
  const showPreviousWeekSummary =
    !!previousWeekSummary && dismissedGoalSummaryWeek !== previousWeekSummaryKey;
  const orderedRecentPosts = recentPosts
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const visibleRecentPosts = isRecentFeedExpanded
    ? orderedRecentPosts
    : orderedRecentPosts.slice(0, 2);
  const canToggleRecentPosts = orderedRecentPosts.length > 2;

  // Derive last 6 weeks of session counts from existing completions — no extra fetch needed
  const last6WeekData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const weekStart = getStartOfWeek(addDays(today, -(5 - i) * 7));
      const weekEnd = addDays(weekStart, 6);
      const start = formatLocalDate(weekStart);
      const end = formatLocalDate(weekEnd);
      return {
        label: formatMonthDay(weekStart),
        sessions: completions.filter(
          (c) => c.completedOn >= start && c.completedOn <= end,
        ).length,
      };
    });
  }, [completions]);

  const updateGoalForm = (updater: (current: GoalSettings) => GoalSettings) => {
    if (saveGoalSettingsMutation.isSuccess || saveGoalSettingsMutation.isError) {
      saveGoalSettingsMutation.reset();
    }
    setGoalForm((current) => updater(current));
  };

  useEffect(() => {
    if (!showRecoveryBanner) setIsRecoveryChooserOpen(false);
  }, [showRecoveryBanner]);

  useEffect(() => {
    if (!previousWeekSummaryKey) {
      setDismissedGoalSummaryWeek(null);
      return;
    }
    setDismissedGoalSummaryWeek((current) =>
      current && current !== previousWeekSummaryKey ? null : current
    );
  }, [previousWeekSummaryKey]);

  return (
    <div className={`min-h-screen transition ${pageBg}`}>
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Page header ── */}
        <div className="mb-8">
          {userId === null ? (
            <div className={`h-8 w-64 animate-pulse rounded-lg mb-2 ${skeletonSub}`} />
          ) : (
            <h1 className={`text-2xl font-bold ${headingText}`}>
              Welcome back, {username} 👋
            </h1>
          )}
          <p className={`${mutedText} text-sm mt-1`}>
            Here&apos;s your fitness summary for today.
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Goal Progress", value: `${goalProgress.completed}/${goalProgress.target}` },
            { label: "Completed This Week", value: String(completedSessionsThisWeek) },
            { label: "Calories Burned", value: `~${caloriesBurnedThisWeek}` },
            { label: "Weekly Streak", value: `${streakWeeks} 🔥` },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`border rounded-2xl px-5 py-4 ${cardBg}`}
            >
              <p className={`text-2xl font-bold ${headingText}`}>{stat.value}</p>
              <p className={`text-xs ${mutedText} mt-1`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Recovery / Reminder banner ── */}
        {(showRecoveryBanner || showReminderBanner) && (
          <div className={`mb-6 rounded-3xl border px-6 py-5 ${cardBg}`}>
            {showRecoveryBanner && recoverySuggestion ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400">
                      <MoonStar className="h-3.5 w-3.5" />
                      Recovery Mode
                    </div>
                    <h2 className={`mt-3 text-xl font-bold ${headingText}`}>
                      {recoverySuggestion.name} slipped yesterday. Let&apos;s keep the week alive.
                    </h2>
                    <p className={`mt-2 text-sm ${secondaryText}`}>
                      You missed the{" "}
                      {formatMonthDay(parseLocalDate(recoverySuggestion.missedDate))} session,
                      but your streak will not reset today. Pick a recovery move: reschedule it,
                      or choose any workout to log as a quick 15-minute reset.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecoveryChooserOpen((c) => !c)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${primaryBtn}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      15-min reset
                    </button>
                    <Link
                      href="/workouts"
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${ghostBtn}`}
                    >
                      <ClipboardList className="h-4 w-4" />
                      Add or log workout
                    </Link>
                    <Link
                      href="/calendar"
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${ghostBtn}`}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Reschedule in calendar
                    </Link>
                  </div>
                </div>

                {isRecoveryChooserOpen && (
                  <div className={`rounded-2xl border p-4 ${recoveryChooserBg}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
                          Choose Your Reset
                        </p>
                        <p className={`mt-1 text-sm ${secondaryText}`}>
                          Pick any routine to log today. The missed workout is listed first.
                        </p>
                      </div>
                      <Link
                        href="/workouts"
                        className={`inline-flex items-center gap-1 text-sm font-medium transition ${bodyText} hover:${headingText}`}
                      >
                        See all workouts
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {recoveryChoiceProfiles.map((profile) => (
                        <Link
                          key={`recovery-choice-${profile.profileId}`}
                          href={`/workouts/${profile.profileId}/log?mode=minimum`}
                          className={`rounded-2xl border px-4 py-3 transition ${recoveryChoiceCard}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${headingText}`}>
                                {profile.name}
                              </p>
                              <p className={`mt-1 text-xs ${secondaryText}`}>
                                {profile.exerciseCount ?? 0} exercise
                                {(profile.exerciseCount ?? 0) === 1 ? "" : "s"} ·{" "}
                                ~{profile.estimatedCalories ?? 0} cal
                              </p>
                            </div>
                            {profile.profileId === recoverySuggestion.profileId && (
                              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">
                                Missed day
                              </span>
                            )}
                          </div>
                          <div className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${bodyText}`}>
                            Open quick log
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              showReminderBanner && reminderProfile && (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      Reminder Time
                    </div>
                    <h2 className={`mt-3 text-xl font-bold ${headingText}`}>
                      No workout logged by {formatReminderTimeLabel(goalSettings.reminderTime)}.
                    </h2>
                    <p className={`mt-2 text-sm ${secondaryText}`}>
                      Keep momentum with a minimum viable workout. A 15 to 20 minute version of{" "}
                      {reminderProfile.name} still moves your weekly goal forward.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        recoveryCompletionMutation.mutate({
                          profileId: reminderProfile.profileId,
                          completionMode: "minimum",
                        })
                      }
                      disabled={recoveryCompletionMutation.isPending}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${primaryBtn}`}
                    >
                      {recoveryCompletionMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Flame className="h-4 w-4" />
                      )}
                      Log quick session
                    </button>
                    <Link
                      href={`/workouts/${reminderProfile.profileId}/log?mode=minimum`}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${ghostBtn}`}
                    >
                      <Dumbbell className="h-4 w-4" />
                      Open log form
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ── Previous week summary ── */}
        {showPreviousWeekSummary && previousWeekSummary && previousWeekFeedback && (
          <div className={`mb-6 rounded-3xl border px-6 py-5 ${
            previousWeekSummary.met
              ? "border-green-500/20 bg-green-500/10"
              : "border-amber-500/20 bg-amber-500/10"
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${
                      previousWeekSummary.met ? "text-green-500" : "text-amber-500"
                    }`}>
                      Last Week&apos;s Goal Summary
                    </p>
                    <h2 className={`mt-2 text-xl font-bold ${headingText}`}>
                      {previousWeekSummary.met ? "Goal complete" : "Goal missed"}:{" "}
                      {previousWeekSummary.completed}/{previousWeekSummary.target} workouts
                    </h2>
                    <p className={`mt-2 text-sm ${bodyText}`}>
                      {formatMonthDay(parseLocalDate(previousWeekSummary.startDate))} to{" "}
                      {formatMonthDay(parseLocalDate(previousWeekSummary.endDate))} •{" "}
                      {previousWeekFeedback}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: `${previousWeekSummary.percent}%`, label: "Goal completion" },
                      { value: String(previousWeekSummary.recoverySessions), label: "Recovery sessions" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-2xl border px-4 py-3 ${
                          isDark
                            ? "border-white/10 bg-black/10"
                            : "border-gray-200 bg-white/60"
                        }`}
                      >
                        <p className={`text-lg font-bold ${headingText}`}>{item.value}</p>
                        <p className={`text-[11px] ${mutedText}`}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedGoalSummaryWeek(previousWeekSummaryKey)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${dismissBtn}`}
                aria-label="Dismiss goal summary"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.12fr)_330px] 2xl:grid-cols-[minmax(0,1.18fr)_340px] gap-5 items-start">

          {/* Left column */}
          <div className="flex flex-col gap-3">

            {/* Recent from feed */}
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold tracking-widest uppercase ${mutedText}`}>
                Recent From Feed
              </p>
              <div className="flex items-center gap-2">
                {canToggleRecentPosts && (
                  <button
                    type="button"
                    onClick={() => setIsRecentFeedExpanded((c) => !c)}
                    className={`text-xs transition ${secondaryText} hover:${headingText}`}
                  >
                    {isRecentFeedExpanded ? "Show less" : "Show more"}
                  </button>
                )}
                <Link
                  href="/feed"
                  className={`text-xs flex items-center gap-1 transition ${secondaryText} hover:${headingText}`}
                >
                  See all <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {postsLoading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border p-3.5 animate-pulse ${cardBg}`}
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${skeletonBg}`} />
                      <div className="flex-1">
                        <div className={`h-3 w-24 rounded ${skeletonBg}`} />
                        <div className={`mt-1.5 h-2.5 w-16 rounded ${skeletonSub}`} />
                      </div>
                    </div>
                    <div className={`h-10 rounded-xl ${skeletonSub}`} />
                    <div className={`mt-2 h-3 w-1/2 rounded ${skeletonSub}`} />
                  </div>
                ))}
              </div>
            ) : recentPosts.length === 0 ? (
              <div className={`max-w-2xl rounded-2xl border px-5 py-5 ${cardBg}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${innerBorder} ${subtleFill}`}>
                    <Users size={18} className={secondaryText} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${headingText}`}>
                      Your feed is quiet right now
                    </p>
                    <p className={`mt-1 text-xs leading-5 ${mutedText}`}>
                      Follow activity, browse shared workouts, and check in on the community
                      without leaving the dashboard.
                    </p>
                    <Link
                      href="/feed"
                      className={`mt-3 inline-flex items-center gap-1 text-xs font-medium transition ${bodyText} hover:${headingText}`}
                    >
                      Browse the feed
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleRecentPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`group rounded-2xl border transition ${cardBg} ${cardHover}`}
                  >
                    <Link href={`/feed/${post.id}`} className="block px-4 pt-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          username={post.username}
                          firstName={post.firstName}
                          lastName={post.lastName}
                          className="h-8 w-8 flex-shrink-0 text-[10px]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${headingText}`}>
                                @{post.username}
                              </p>
                              {post.firstName && post.lastName && (
                                <p className={`mt-0.5 text-[10px] ${mutedText}`}>
                                  {post.firstName} {post.lastName}
                                </p>
                              )}
                            </div>
                            <p className={`whitespace-nowrap text-[11px] ${mutedText}`}>
                              {getRelativeTime(post.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`mt-2.5 rounded-xl border px-3 py-2.5 ${innerBorder} ${subtleFill}`}>
                        <p className={`line-clamp-1 text-sm font-medium leading-5 ${headingText}`}>
                          {post.title}
                        </p>
                      </div>

                      <div className="mt-2.5 flex items-center justify-end text-[11px]">
                        <div className={`inline-flex items-center gap-1 transition ${secondaryText} group-hover:${headingText}`}>
                          <span>Open post</span>
                          <ChevronRight size={12} />
                        </div>
                      </div>
                    </Link>

                    <div className="px-4 pb-3.5">
                      <PostInteractions post={post} variant="compact" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Weekly schedule */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-semibold tracking-widest uppercase ${mutedText}`}>
                  Weekly Schedule
                </p>
                <Link
                  href="/workouts"
                  className={`flex items-center gap-1 text-xs transition ${secondaryText} hover:${headingText}`}
                >
                  <Settings size={13} /> Manage
                </Link>
              </div>

              <div className={`border rounded-2xl px-5 py-4 ${cardBg}`}>
                {scheduledSessionsThisWeek.length === 0 ? (
                  <>
                    <p className={`text-sm font-semibold mb-1 ${headingText}`}>
                      No schedule configured yet
                    </p>
                    <p className={`text-xs mb-4 ${mutedText}`}>
                      Add scheduled days to your workout templates to build a weekly plan.
                    </p>
                    <Link
                      href="/workouts"
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${primaryBtn}`}
                    >
                      Open workouts
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className={`text-2xl font-bold ${headingText}`}>
                          {completedScheduledSessionsThisWeek}/{scheduledSessionsThisWeek.length}
                        </p>
                        <p className={`text-xs mt-0.5 ${mutedText}`}>
                          scheduled sessions completed
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href="/calendar"
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${ghostBtn}`}
                        >
                          <CalendarDays size={12} />
                          View calendar
                        </Link>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          completedScheduledSessionsThisWeek >= scheduledSessionsThisWeek.length
                            ? onTrackPill
                            : inProgressPill
                        }`}>
                          {scheduleStatusLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 mb-4">
                      {WEEK_DAY_LABELS.map((day, i) => {
                        const isScheduled = scheduledDayIndices.has(i);
                        const isCompleted = completedDayIndices.has(i);
                        const isToday = i === todayDayIndex;
                        const isPast = i < todayDayIndex;
                        return (
                          <div key={day} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-semibold border ${
                              isScheduled && isCompleted
                                ? dayCompletedScheduled
                                : isScheduled
                                ? dayScheduledOnly
                                : isCompleted
                                ? dayCompletedExtra
                                : dayEmpty
                            } ${isToday ? dayTodayRing : ""}`}>
                              {isCompleted ? "✓" : isScheduled ? "·" : ""}
                            </div>
                            <span className={`text-[9px] ${
                              isToday
                                ? headingText
                                : isScheduled || isCompleted
                                ? secondaryText
                                : mutedText
                            }`}>
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <div className={`flex justify-between text-[11px] mb-1.5 ${mutedText}`}>
                        <span>
                          {completedScheduledSessionsThisWeek} of{" "}
                          {scheduledSessionsThisWeek.length} done
                        </span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <div className={`w-full rounded-full h-1 ${progressTrack}`}>
                        <div
                          className={`h-1 rounded-full transition-all ${progressFill}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      {extraSessionsThisWeek > 0 && (
                        <p className={`mt-2 text-[11px] ${extraSessionsText}`}>
                          +{extraSessionsThisWeek} extra session
                          {extraSessionsThisWeek === 1 ? "" : "s"} outside your saved schedule
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* Goal planner */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-semibold tracking-widest uppercase ${mutedText}`}>
                  Goal Planner
                </p>
                <span className={`flex items-center gap-1 text-xs ${mutedText}`}>
                  <Target size={13} />
                  Weekly target
                </span>
              </div>

              <div className={`border rounded-2xl px-5 py-4 ${cardBg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className={`text-2xl font-bold ${headingText}`}>
                      {goalProgress.completed}/{goalProgress.target}
                    </p>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      workouts completed toward your weekly goal
                    </p>
                  </div>
                  <span className={`inline-flex min-w-[60px] items-center justify-center whitespace-nowrap text-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                    goalProgress.met ? goalMetPill : goalRemainingPill
                  }`}>
                    {goalProgress.met ? "Goal met" : `${goalProgress.remaining} left`}
                  </span>
                </div>

                <div className="mb-5">
                  <div className={`flex justify-between text-[11px] mb-1.5 ${mutedText}`}>
                    <span>{goalProgress.completed} done</span>
                    <span>{goalProgress.percent}%</span>
                  </div>
                  <div className={`w-full rounded-full h-1.5 ${progressTrack}`}>
                    <div
                      className={`h-1.5 rounded-full transition-all ${progressFill}`}
                      style={{ width: `${goalProgress.percent}%` }}
                    />
                  </div>
                </div>

                {isGoalPlannerExpanded ? (
                  <>
                    <div className="space-y-4">
                      <label className="block">
                        <span className={`text-xs font-medium ${secondaryText}`}>
                          Weekly workout goal
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={14}
                          value={goalForm.weeklyWorkoutGoal}
                          onChange={(e) =>
                            updateGoalForm((c) => ({
                              ...c,
                              weeklyWorkoutGoal: Math.min(14, Math.max(1, Number(e.target.value) || 1)),
                            }))
                          }
                          className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${inputClass}`}
                        />
                      </label>

                      <label className="block">
                        <span className={`text-xs font-medium ${secondaryText}`}>
                          Reminder time
                        </span>
                        <input
                          type="time"
                          value={goalForm.reminderTime}
                          onChange={(e) =>
                            updateGoalForm((c) => ({ ...c, reminderTime: e.target.value }))
                          }
                          className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${inputClass}`}
                        />
                      </label>

                      <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${checkboxCard}`}>
                        <input
                          type="checkbox"
                          checked={goalForm.recoveryModeEnabled}
                          onChange={(e) =>
                            updateGoalForm((c) => ({ ...c, recoveryModeEnabled: e.target.checked }))
                          }
                          className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                        />
                        <span>
                          <span className={`block text-sm font-medium ${headingText}`}>
                            Recovery mode
                          </span>
                          <span className={`mt-1 block text-xs ${mutedText}`}>
                            Flexible reminders, quick fallback sessions, and missed-day recovery
                            suggestions.
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className={`text-[11px] ${mutedText}`}>
                        Reminder set for {formatReminderTimeLabel(goalForm.reminderTime)}
                      </p>
                      <button
                        type="button"
                        onClick={() => saveGoalSettingsMutation.mutate(goalForm)}
                        disabled={saveGoalSettingsMutation.isPending}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${primaryBtn}`}
                      >
                        {saveGoalSettingsMutation.isPending ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Settings className="h-4 w-4" />
                        )}
                        Save goal
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-[11px] ${mutedText}`}>
                      Reminder set for {formatReminderTimeLabel(goalSettings.reminderTime)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsGoalPlannerExpanded(true)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${ghostBtn}`}
                    >
                      <Settings className="h-4 w-4" />
                      Edit goal
                    </button>
                  </div>
                )}

                {saveGoalSettingsMutation.isError && (
                  <p className="mt-3 text-xs text-red-500">
                    {saveGoalSettingsMutation.error.message}
                  </p>
                )}
                {saveGoalSettingsMutation.isSuccess &&
                  !isGoalPlannerExpanded &&
                  !isGoalPlannerDirty && (
                    <p className="mt-3 text-xs text-green-600">Goal settings saved.</p>
                  )}
              </div>
            </div>

            {/* Activity Trend mini chart — derived from existing completions, no extra fetch */}
            <div className={`rounded-2xl px-5 py-4 border ${cardBg}`}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2">
                  <BarChart2 size={13} className={mutedText} />
                  <p className={`text-xs font-bold tracking-widest uppercase ${mutedText}`}>
                    Weekly Activity
                  </p>
                </div>
                <Link
                  href="/analytics"
                  className={`text-xs transition ${
                    isDark ? "text-gray-400 hover:text-white" : "text-blue-500 hover:text-blue-700"
                  }`}
                >
                  Full analytics →
                </Link>
              </div>
              <p className={`text-xs mb-3 ${secondaryText}`}>Sessions per week · last 6 weeks</p>
              <ResponsiveContainer width="100%" height={96}>
                <BarChart
                  data={last6WeekData}
                  barSize={14}
                  margin={{ top: 2, right: 4, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fill: isDark ? "#6b7280" : "#9ca3af", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={
                      isDark
                        ? { background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9", fontSize: "11px" }
                        : { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827", fontSize: "11px" }
                    }
                    labelStyle={isDark ? { color: "#94a3b8" } : { color: "#6b7280" }}
                    formatter={(v) => [v, "sessions"]}
                    cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
                  />
                  <Bar dataKey="sessions" radius={[3, 3, 0, 0]}>
                    {last6WeekData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index === last6WeekData.length - 1 ? "#60a5fa" : "#818cf8"}
                        fillOpacity={index === last6WeekData.length - 1 ? 1 : 0.65}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick links */}
            <div>
              <p className={`text-xs font-semibold tracking-widest uppercase mb-3 ${mutedText}`}>
                Quick Links
              </p>
              <div className="flex flex-col gap-1.5">
                {quickLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`flex items-center gap-3 border text-sm font-medium px-4 py-3 rounded-xl transition ${quickLinkClass}`}
                  >
                    <span className={quickLinkIcon}>{link.icon}</span>
                    {link.label}
                    <ChevronRight size={13} className={`ml-auto ${quickLinkChevron}`} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
