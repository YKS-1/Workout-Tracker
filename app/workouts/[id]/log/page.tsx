"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  LoaderCircle,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  WorkoutCompletionMode,
  WorkoutLogDraft,
  WorkoutLogDraftExercise,
} from "@/app/types/workout";
import { useAuthSnapshot } from "@/lib/auth-store";
import { WorkoutLogExerciseCard } from "@/components/workouts/WorkoutLogExerciseCard";
import { estimateWorkoutCalories } from "@/lib/workoutUtils";
import { formatLocalDate, formatMonthDay, parseLocalDate } from "@/lib/workout-schedule";
import { useTheme } from "@/context/theme-context";

function isLoggedExerciseValid(exercise: WorkoutLogDraftExercise) {
  if (!exercise.included) {
    return true;
  }

  if (exercise.type === "weights") {
    return exercise.weight !== null && exercise.sets !== null && exercise.reps !== null;
  }

  if (exercise.type === "cardio") {
    return (
      exercise.duration !== null &&
      (exercise.unit === "Variable" || exercise.distance !== null)
    );
  }

  return exercise.duration !== null;
}

function getDraftSummary(draft: WorkoutLogDraft) {
  if (draft.prefillSource === "existing-log") {
    return `Editing the session you already logged for ${formatMonthDay(parseLocalDate(draft.performedOn))}.`;
  }

  if (draft.prefillSource === "last-log" && draft.sourcePerformedOn) {
    return `Prefilled from your most recent ${draft.profileName} log on ${formatMonthDay(
      parseLocalDate(draft.sourcePerformedOn),
    )}.`;
  }

  return "Prefilled from the routine defaults because there is no detailed session log yet.";
}

function getRequestedCompletionMode(value: string | null): WorkoutCompletionMode | null {
  if (value === "standard" || value === "minimum" || value === "alternate") {
    return value;
  }

  return null;
}

export default function LogWorkoutPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, token, userId } = useAuthSnapshot();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const initialDateParam = searchParams.get("date");
  const todayDateString = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(
    initialDateParam &&
      /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam) &&
      initialDateParam <= todayDateString
      ? initialDateParam
      : todayDateString,
  );
  const [draftEdits, setDraftEdits] = useState<
    Record<
      string,
      {
        exercises: WorkoutLogDraftExercise[];
        completionMode: WorkoutLogDraft["completionMode"];
        existingLogId: string | null;
      }
    >
  >({});

  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [savedLogData, setSavedLogData] = useState<WorkoutLogDraftExercise[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const workoutId = params.id;
  const requestedCompletionMode = getRequestedCompletionMode(searchParams.get("mode"));
  const pageShell = isDark ? "min-h-screen bg-[#0d1117] text-white" : "min-h-screen bg-white text-slate-900";
  const primaryCard = isDark
    ? "rounded-3xl border border-white/10 bg-[#111827]"
    : "rounded-3xl border border-slate-200 bg-white shadow-sm";
  const secondaryCard = isDark
    ? "rounded-2xl border border-white/10 bg-[#162033]"
    : "rounded-2xl border border-slate-200 bg-slate-50";
  const headingText = isDark ? "text-white" : "text-slate-900";
  const mutedText = isDark ? "text-gray-400" : "text-slate-500";
  const subtleText = isDark ? "text-gray-300" : "text-slate-700";
  const primaryButton = isDark
    ? "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60";

  const { data: draft, isLoading, isError } = useQuery<WorkoutLogDraft>({
    queryKey: ["workout-log-draft", userId, workoutId, selectedDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/workouts/logs/draft?userId=${userId}&profileId=${workoutId}&performedOn=${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load workout log");
      }

      return data;
    },
    enabled: !!userId && !!token && !!workoutId,
    refetchOnWindowFocus: false,
  });

  const draftStateKey = `${workoutId}:${selectedDate}`;
  const localDraft = draft ? draftEdits[draftStateKey] : undefined;
  const localExercises = useMemo(
    () => localDraft?.exercises ?? draft?.exercises ?? [],
    [localDraft, draft],
  );
  const completionMode =
    localDraft?.completionMode ?? requestedCompletionMode ?? draft?.completionMode ?? "standard";
  const existingLogId = localDraft?.existingLogId ?? draft?.existingLogId ?? null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workouts/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          profileId: workoutId,
          performedOn: selectedDate,
          completionMode,
          exercises: localExercises,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save workout log");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", userId] });
      queryClient.invalidateQueries({ queryKey: ["workout-completions"] });
      queryClient.invalidateQueries({ queryKey: ["workout-completions", userId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-completions", userId] });
      queryClient.invalidateQueries({ queryKey: ["workout-log-draft", userId, workoutId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["workout-logs", userId] });
      setSavedLogData(localExercises);
      setShowAiPrompt(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workouts/logs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          logId: existingLogId,
          profileId: workoutId,
          performedOn: selectedDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete workout log");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", userId] });
      queryClient.invalidateQueries({ queryKey: ["workout-completions"] });
      queryClient.invalidateQueries({ queryKey: ["workout-completions", userId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-completions", userId] });
      queryClient.invalidateQueries({ queryKey: ["workout-log-draft", userId, workoutId, selectedDate] });
      router.push("/workouts");
    },
  });

  const includedExercises = useMemo(
    () => localExercises.filter((exercise) => exercise.included),
    [localExercises],
  );
  const invalidExercises = includedExercises.filter((exercise) => !isLoggedExerciseValid(exercise));
  const estimatedCalories = estimateWorkoutCalories(includedExercises);
  const canSave = includedExercises.length > 0 && invalidExercises.length === 0 && !saveMutation.isPending;

  const updateExercise = (
    index: number,
    field: "weight" | "sets" | "reps" | "duration" | "distance",
    value: number | null,
  ) => {
    if (!draft) {
      return;
    }

    setDraftEdits((current) => {
      const baseState = current[draftStateKey] ?? {
        exercises: draft.exercises,
        completionMode: requestedCompletionMode ?? draft.completionMode,
        existingLogId: draft.existingLogId,
      };

      return {
        ...current,
        [draftStateKey]: {
          ...baseState,
          exercises: baseState.exercises.map((exercise, exerciseIndex) =>
            exerciseIndex === index ? { ...exercise, [field]: value } : exercise,
          ),
        },
      };
    });
  };

  const toggleExercise = (index: number) => {
    if (!draft) {
      return;
    }

    setDraftEdits((current) => {
      const baseState = current[draftStateKey] ?? {
        exercises: draft.exercises,
        completionMode: requestedCompletionMode ?? draft.completionMode,
        existingLogId: draft.existingLogId,
      };

      return {
        ...current,
        [draftStateKey]: {
          ...baseState,
          exercises: baseState.exercises.map((exercise, exerciseIndex) =>
            exerciseIndex === index
              ? { ...exercise, included: !exercise.included }
              : exercise,
          ),
        },
      };
    });
  };

  const handleAiSummary = async () => {
    if (!savedLogData) return;
    setAiLoading(true);
    setAiError(null);

    const exerciseSummary = savedLogData
      .filter((e) => e.included)
      .map((e) => {
        if (e.type === "weights")
          return `${e.name}: ${e.sets} sets x ${e.reps} reps @ ${e.weight}${e.unit ?? "lbs"}`;
        if (e.type === "cardio")
          return `${e.name}: ${e.duration} min${e.distance ? `, ${e.distance} ${e.unit}` : ""}`;
        return `${e.name}: ${e.duration} min`;
      })
      .join(", ");

    const prompt = `I just finished a workout called "${draft?.profileName}". Here's what I logged: ${exerciseSummary}. Give me a short motivating summary and one tip for next time.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, prompt, skipHistory: true }),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Iron Coach couldn't respond right now.");
      }

      setAiSummary(data.response ?? "Great job on completing your workout!");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Something went wrong fetching your summary.");
    } finally {
      setAiLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`${pageShell}`}>
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className={`${primaryCard} px-8 py-10 text-center`}>
            <h1 className={`text-2xl font-bold ${headingText}`}>Sign in to log a workout</h1>
            <p className={`mt-2 text-sm ${mutedText}`}>
            Logged sessions are tied to your account so goals, streaks, and calendar history stay in sync.
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

  if (isError) {
    return (
      <div className={pageShell}>
        <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl border border-red-200 bg-red-50 px-8 py-10 text-center">
          <h1 className="text-2xl font-bold text-red-950">Couldn&apos;t open this workout log</h1>
          <p className="mt-2 text-sm text-red-700/80">
            Try again in a moment. If it keeps happening, the workout log API may still be restarting.
          </p>
          <Link
            href="/workouts"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-900 transition hover:bg-red-100"
          >
            Back to workouts
          </Link>
        </div>
        </div>
      </div>
    );
  }

  if (isLoading || !draft) {
    return (
      <div className={pageShell}>
        <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className={`h-7 w-40 rounded-lg ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
          <div className={`h-10 w-72 rounded-lg ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
          <div className={`h-28 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
          <div className={`h-40 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
          <div className={`h-40 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageShell}>
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/workouts"
            className={`inline-flex items-center gap-1 text-sm font-medium transition ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to workouts
          </Link>
          <p className={`mt-4 text-xs font-semibold uppercase tracking-[0.28em] ${mutedText}`}>
            Workout Log
          </p>
          <h1 className={`mt-2 text-3xl font-bold ${headingText}`}>{draft.profileName}</h1>
          <p className={`mt-2 max-w-2xl text-sm ${mutedText}`}>{getDraftSummary(draft)}</p>
        </div>

        <div className={`${secondaryCard} px-4 py-3`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${mutedText}`}>
            Session Snapshot
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className={`text-2xl font-bold ${headingText}`}>{includedExercises.length}</p>
              <p className={`text-xs ${mutedText}`}>logged exercises</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${headingText}`}>~{estimatedCalories}</p>
              <p className={`text-xs ${mutedText}`}>estimated calories</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {localExercises.map((exercise, index) => (
            <WorkoutLogExerciseCard
              key={`${exercise.profileExerciseId ?? exercise.exerciseId ?? exercise.name}-${exercise.sortOrder}`}
              exercise={exercise}
              isDark={isDark}
              onToggleIncluded={() => toggleExercise(index)}
              onUpdate={(field, value) => updateExercise(index, field, value)}
            />
          ))}
        </div>

        <aside className={`h-fit ${primaryCard} p-5`}>
          <div className="space-y-5">
            <div>
              <label className={`block text-sm font-semibold ${headingText}`}>Workout date</label>
              <div className="relative mt-2">
                <CalendarDays className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${mutedText}`} />
                <input
                  type="date"
                  value={selectedDate}
                  max={todayDateString}
                  onChange={(event) =>
                    setSelectedDate(
                      event.target.value <= todayDateString
                        ? event.target.value
                        : todayDateString,
                    )
                  }
                  className={`w-full rounded-xl border px-10 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    isDark
                      ? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400 focus:ring-blue-400/20"
                      : "border-gray-300 bg-white text-slate-900 focus:border-blue-900 focus:ring-blue-900/20"
                  }`}
                />
              </div>
            </div>

            <div className={`${secondaryCard} px-4 py-4`}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${headingText}`}>
                <Sparkles className="h-4 w-4 text-blue-900" />
                Prefill source
              </div>
              <p className={`mt-2 text-sm ${subtleText}`}>
                {draft.prefillSource === "existing-log"
                  ? "This date already had a detailed log, so you are updating that saved session."
                  : draft.prefillSource === "last-log"
                  ? "We reused the last logged values for matching exercises and filled the rest from the routine."
                  : "This is the first detailed log for this routine, so the form starts from the routine defaults."}
              </p>
            </div>

            <div className={`${secondaryCard} px-4 py-4 text-sm ${subtleText}`}>
              <p className={`font-semibold ${headingText}`}>How this works</p>
              <p className="mt-2">
                Saving this log counts as the workout completion for {formatMonthDay(parseLocalDate(selectedDate))}.
                Future logs will reuse these values unless you change them.
              </p>
            </div>

            {completionMode === "minimum" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                This log is marked as a 15-minute reset, so it will count as a recovery workout toward your weekly goal.
              </div>
            )}

            {invalidExercises.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Fill in every required field for the exercises you kept in this session log.
              </div>
            )}

            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!canSave}
              className={`w-full ${primaryButton}`}
            >
              {saveMutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {existingLogId ? "Update log" : "Save log"}
            </button>

            {saveMutation.isError && (
              <p className="text-xs text-red-600">{saveMutation.error.message}</p>
            )}

            {existingLogId && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this saved workout log?")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDark
                    ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
                    : "border-red-200 text-red-700 hover:bg-red-50"
                }`}
              >
                {deleteMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete log
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* AI Summary Modal */}
      {showAiPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-xl ${isDark ? "border-white/10 bg-[#111827]" : "border-gray-200 bg-white"}`}>
            {aiError ? (
              <>
                <div className="flex items-center gap-2 text-lg font-bold text-red-600">
                  Couldn&apos;t load summary
                </div>
                <p className={`mt-3 text-sm leading-6 ${subtleText}`}>{aiError}</p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={handleAiSummary}
                    disabled={aiLoading}
                    className={primaryButton.replace("px-4 py-3", "flex-1 px-4 py-2.5")}
                  >
                    {aiLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/workouts")}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${isDark ? "border-white/10 text-gray-200 hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    Skip
                  </button>
                </div>
              </>
            ) : aiSummary ? (
              <>
                <div className={`flex items-center gap-2 text-lg font-bold ${headingText}`}>
                  <Sparkles className="h-5 w-5 text-blue-900" />
                  Iron Coach says
                </div>
                <p className={`mt-3 text-sm leading-6 ${subtleText}`}>{aiSummary}</p>
                <button
                  type="button"
                  onClick={() => router.push("/workouts")}
                  className={`mt-5 w-full ${primaryButton.replace("px-4 py-3", "px-4 py-2.5")}`}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <div className={`flex items-center gap-2 text-lg font-bold ${headingText}`}>
                  <Sparkles className="h-5 w-5 text-blue-900" />
                  Great work! Want an AI summary?
                </div>
                <p className={`mt-2 text-sm ${mutedText}`}>
                  Iron Coach can give you a quick breakdown of this session and a tip for next time.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={handleAiSummary}
                    disabled={aiLoading}
                    className={primaryButton.replace("px-4 py-3", "flex-1 px-4 py-2.5")}
                  >
                    {aiLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Yes, summarize it
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/workouts")}
                    disabled={aiLoading}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${isDark ? "border-white/10 text-gray-200 hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    No thanks
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
