import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import {
  deleteWorkoutLog,
  isFutureWorkoutDateString,
  isValidWorkoutDateString,
  listWorkoutCompletionSummaries,
  upsertWorkoutLog,
} from "@/lib/workout-log-data";
import { WorkoutCompletionMode } from "@/app/types/workout";

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

    const completions = await listWorkoutCompletionSummaries({ userId });
    return NextResponse.json(completions);
  } catch (error) {
    console.error("Failed to fetch workout completions:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout completions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authorizedUserId = getAuthorizedUserId(request);
    const {
      userId,
      profileId,
      completedOn,
      completionMode,
    }: {
      userId?: string;
      profileId?: string;
      completedOn?: string;
      completionMode?: WorkoutCompletionMode;
    } = body;

    if (!userId || !profileId || !completedOn) {
      return NextResponse.json(
        { error: "userId, profileId, and completedOn are required" },
        { status: 400 },
      );
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isValidWorkoutDateString(completedOn)) {
      return NextResponse.json(
        { error: "completedOn must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    if (isFutureWorkoutDateString(completedOn)) {
      return NextResponse.json(
        { error: "You cannot log workouts for a future date" },
        { status: 400 },
      );
    }

    const log = await upsertWorkoutLog({
      userId,
      profileId,
      performedOn: completedOn,
      completionMode,
    });

    if (!log) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: log.id,
        profileId: log.profileId,
        completedOn: log.performedOn,
        completionMode: log.completionMode,
        estimatedCalories: log.estimatedCalories,
        exerciseCount: log.exerciseCount,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create workout completion:", error);
    return NextResponse.json(
      { error: "Failed to create workout completion" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const authorizedUserId = getAuthorizedUserId(request);
    const {
      userId,
      profileId,
      completedOn,
    }: {
      userId?: string;
      profileId?: string;
      completedOn?: string;
    } = body;

    if (!userId || !profileId || !completedOn) {
      return NextResponse.json(
        { error: "userId, profileId, and completedOn are required" },
        { status: 400 },
      );
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isValidWorkoutDateString(completedOn)) {
      return NextResponse.json(
        { error: "completedOn must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    await deleteWorkoutLog({
      userId,
      profileId,
      performedOn: completedOn,
    });

    return NextResponse.json({ message: "Workout completion removed" });
  } catch (error) {
    console.error("Failed to delete workout completion:", error);
    return NextResponse.json(
      { error: "Failed to delete workout completion" },
      { status: 500 },
    );
  }
}
