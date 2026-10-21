import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import {
  deleteWorkoutLog,
  isFutureWorkoutDateString,
  isValidWorkoutDateString,
  listWorkoutLogs,
  upsertWorkoutLog,
} from "@/lib/workout-log-data";
import { WorkoutCompletionMode, WorkoutLogDraftExercise } from "@/app/types/workout";

function getAuthorizedUserId(request: NextRequest) {
  return request.headers.get("x-user-id") ?? getTokenFromRequest(request)?.userId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId") ?? undefined;
    const performedOn = searchParams.get("performedOn") ?? undefined;
    const includeExercises = searchParams.get("includeExercises") === "true";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const authorizedUserId = getAuthorizedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (performedOn && !isValidWorkoutDateString(performedOn)) {
      return NextResponse.json(
        { error: "performedOn must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) {
      return NextResponse.json({ error: "limit must be a positive number" }, { status: 400 });
    }

    const logs = await listWorkoutLogs({
      userId,
      profileId,
      performedOn,
      includeExercises,
      limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch workout logs:", error);
    return NextResponse.json({ error: "Failed to fetch workout logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authorizedUserId = getAuthorizedUserId(request);
    const {
      userId,
      profileId,
      performedOn,
      completionMode,
      exercises,
    }: {
      userId?: string;
      profileId?: string;
      performedOn?: string;
      completionMode?: WorkoutCompletionMode;
      exercises?: WorkoutLogDraftExercise[];
    } = body;

    if (!userId || !profileId || !performedOn) {
      return NextResponse.json(
        { error: "userId, profileId, and performedOn are required" },
        { status: 400 },
      );
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isValidWorkoutDateString(performedOn)) {
      return NextResponse.json(
        { error: "performedOn must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    if (isFutureWorkoutDateString(performedOn)) {
      return NextResponse.json(
        { error: "You cannot log workouts for a future date" },
        { status: 400 },
      );
    }

    if (Array.isArray(exercises) && exercises.filter((exercise) => exercise.included !== false).length === 0) {
      return NextResponse.json(
        { error: "Log at least one exercise or use the quick completion actions instead" },
        { status: 400 },
      );
    }

    const log = await upsertWorkoutLog({
      userId,
      profileId,
      performedOn,
      completionMode,
      exercises,
    });

    if (!log) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Failed to save workout log:", error);
    return NextResponse.json({ error: "Failed to save workout log" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const authorizedUserId = getAuthorizedUserId(request);
    const {
      userId,
      logId,
      profileId,
      performedOn,
    }: {
      userId?: string;
      logId?: string;
      profileId?: string;
      performedOn?: string;
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!logId && (!profileId || !performedOn)) {
      return NextResponse.json(
        { error: "Provide logId or profileId and performedOn" },
        { status: 400 },
      );
    }

    if (performedOn && !isValidWorkoutDateString(performedOn)) {
      return NextResponse.json(
        { error: "performedOn must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    await deleteWorkoutLog({
      userId,
      logId,
      profileId,
      performedOn,
    });

    return NextResponse.json({ message: "Workout log removed" });
  } catch (error) {
    console.error("Failed to delete workout log:", error);
    return NextResponse.json({ error: "Failed to delete workout log" }, { status: 500 });
  }
}
