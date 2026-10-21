import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import {
  buildWorkoutLogDraft,
  isFutureWorkoutDateString,
  isValidWorkoutDateString,
} from "@/lib/workout-log-data";

function getAuthorizedUserId(request: NextRequest) {
  return request.headers.get("x-user-id") ?? getTokenFromRequest(request)?.userId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const performedOn = searchParams.get("performedOn");
    const authorizedUserId = getAuthorizedUserId(request);

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

    const draft = await buildWorkoutLogDraft({
      userId,
      profileId,
      performedOn,
    });

    if (!draft) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Failed to build workout log draft:", error);
    return NextResponse.json(
      { error: "Failed to build workout log draft" },
      { status: 500 },
    );
  }
}
