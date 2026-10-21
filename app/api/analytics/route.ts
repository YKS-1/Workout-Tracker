import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { listWorkoutLogs } from "@/lib/workout-log-data";
import {
  addDays,
  formatLocalDate,
  getStartOfWeek,
  parseLocalDate,
} from "@/lib/workout-schedule";
import type {
  AnalyticsResponse,
  ExerciseAnalytics,
  ExerciseHistoryPoint,
  MuscleGroupBreakdown,
  WeeklySummary,
} from "@/app/types/workout";

function getAuthorizedUserId(request: NextRequest) {
  return request.headers.get("x-user-id") ?? getTokenFromRequest(request)?.userId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const authorizedUserId = getAuthorizedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await listWorkoutLogs({ userId, includeExercises: true });

    if (logs.length === 0) {
      return NextResponse.json<AnalyticsResponse>({
        exercises: [],
        weeklySummaries: [],
        muscleGroupBreakdown: [],
      });
    }

    // --- Pass 1: Exercise progression ---
    // Group all logged exercises by exerciseId (preferred) or normalised name.
    // Rest exercises are excluded — they have no trackable metrics.
    const exerciseMap = new Map<
      string,
      { meta: Omit<ExerciseAnalytics, "history">; points: ExerciseHistoryPoint[] }
    >();

    for (const log of logs) {
      if (!log.exercises) continue;

      for (const ex of log.exercises) {
        if (ex.type === "rest") continue;

        const key = ex.exerciseId ?? ex.name.toLowerCase().trim();

        if (!exerciseMap.has(key)) {
          exerciseMap.set(key, {
            meta: {
              exerciseId: ex.exerciseId,
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              type: ex.type,
            },
            points: [],
          });
        }

        const volume =
          ex.sets !== null && ex.reps !== null && ex.weight !== null
            ? ex.sets * ex.reps * ex.weight
            : null;

        exerciseMap.get(key)!.points.push({
          date: log.performedOn,
          weight: ex.weight,
          sets: ex.sets,
          reps: ex.reps,
          volume,
          duration: ex.duration,
          distance: ex.distance,
        });
      }
    }

    const exercises: ExerciseAnalytics[] = Array.from(exerciseMap.values()).map(
      ({ meta, points }) => ({
        ...meta,
        history: points.sort((a, b) => a.date.localeCompare(b.date)),
      }),
    );

    // --- Pass 2: Weekly summaries (last 12 weeks) ---
    // Pre-populate all 12 weeks so weeks with no activity still appear as 0
    // rather than being absent from the chart.
    const weeklyMap = new Map<
      string,
      { sessionCount: number; totalCalories: number; totalVolume: number }
    >();

    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const key = formatLocalDate(getStartOfWeek(addDays(today, -i * 7)));
      if (!weeklyMap.has(key)) {
        weeklyMap.set(key, { sessionCount: 0, totalCalories: 0, totalVolume: 0 });
      }
    }

    const twelveWeeksAgo = formatLocalDate(getStartOfWeek(addDays(today, -11 * 7)));

    for (const log of logs) {
      if (log.performedOn < twelveWeeksAgo) continue;

      const weekStart = formatLocalDate(getStartOfWeek(parseLocalDate(log.performedOn)));
      if (!weeklyMap.has(weekStart)) continue;

      const entry = weeklyMap.get(weekStart)!;
      entry.sessionCount += 1;
      entry.totalCalories += log.estimatedCalories ?? 0;

      if (log.exercises) {
        for (const ex of log.exercises) {
          if (ex.sets !== null && ex.reps !== null && ex.weight !== null) {
            entry.totalVolume += ex.sets * ex.reps * ex.weight;
          }
        }
      }
    }

    const weeklySummaries: WeeklySummary[] = Array.from(weeklyMap.entries())
      .map(([weekStart, data]) => ({ weekStart, ...data }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // --- Pass 3: Muscle group breakdown ---
    // Count the number of distinct sessions that trained each muscle group.
    // Counted per-session (not per-exercise) so doing 3 chest exercises in one
    // session still only counts as 1 chest session.
    const muscleGroupMap = new Map<string, number>();

    for (const log of logs) {
      if (!log.exercises) continue;

      const sessionGroups = new Set<string>();
      for (const ex of log.exercises) {
        if (ex.type === "rest") continue;
        sessionGroups.add(ex.muscleGroup ?? "unknown");
      }

      for (const group of sessionGroups) {
        muscleGroupMap.set(group, (muscleGroupMap.get(group) ?? 0) + 1);
      }
    }

    const muscleGroupBreakdown: MuscleGroupBreakdown[] = Array.from(muscleGroupMap.entries())
      .map(([muscleGroup, sessionCount]) => ({ muscleGroup, sessionCount }))
      .sort((a, b) => b.sessionCount - a.sessionCount);

    return NextResponse.json<AnalyticsResponse>({
      exercises,
      weeklySummaries,
      muscleGroupBreakdown,
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
