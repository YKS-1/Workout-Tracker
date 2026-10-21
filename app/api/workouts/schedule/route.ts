import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/drizzle";
import {
  scheduledDaysTable,
  workoutProfilesTable,
  workoutScheduleOverridesTable,
} from "@/drizzle/schema";
import { getTokenFromRequest } from "@/lib/auth";
import {
  deleteWorkoutLog,
  isValidWorkoutDateString,
} from "@/lib/workout-log-data";
import { DAY_INDEX_TO_NAME, parseLocalDate } from "@/lib/workout-schedule";

type CalendarSessionDeleteType = "manual" | "recurring" | "extra";

function getAuthorizedUserId(request: NextRequest) {
  return request.headers.get("x-user-id") ?? getTokenFromRequest(request)?.userId ?? null;
}

async function getOwnedProfile(userId: string, profileId: string) {
  const [profile] = await database
    .select({
      profileId: workoutProfilesTable.profileId,
    })
    .from(workoutProfilesTable)
    .where(
      and(
        eq(workoutProfilesTable.profileId, profileId),
        eq(workoutProfilesTable.ownerId, userId),
      ),
    )
    .limit(1);

  return profile ?? null;
}

async function getExistingOverride(userId: string, profileId: string, scheduledFor: string) {
  const [override] = await database
    .select({
      id: workoutScheduleOverridesTable.id,
      overrideType: workoutScheduleOverridesTable.overrideType,
    })
    .from(workoutScheduleOverridesTable)
    .where(
      and(
        eq(workoutScheduleOverridesTable.userId, userId),
        eq(workoutScheduleOverridesTable.profileId, profileId),
        eq(workoutScheduleOverridesTable.scheduledFor, scheduledFor),
      ),
    )
    .limit(1);

  return override ?? null;
}

async function isRecurringOnDate(profileId: string, scheduledFor: string) {
  const dayOfWeek = DAY_INDEX_TO_NAME[parseLocalDate(scheduledFor).getDay()];

  const [scheduledDay] = await database
    .select({
      id: scheduledDaysTable.id,
    })
    .from(scheduledDaysTable)
    .where(
      and(
        eq(scheduledDaysTable.profileId, profileId),
        eq(scheduledDaysTable.dayOfWeek, dayOfWeek),
      ),
    )
    .limit(1);

  return Boolean(scheduledDay);
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

    const overrides = await database
      .select({
        id: workoutScheduleOverridesTable.id,
        profileId: workoutScheduleOverridesTable.profileId,
        scheduledFor: workoutScheduleOverridesTable.scheduledFor,
        overrideType: workoutScheduleOverridesTable.overrideType,
      })
      .from(workoutScheduleOverridesTable)
      .where(eq(workoutScheduleOverridesTable.userId, userId));

    return NextResponse.json(overrides);
  } catch (error) {
    console.error("Failed to fetch workout schedule overrides:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout schedule overrides" },
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
      scheduledFor,
    }: {
      userId?: string;
      profileId?: string;
      scheduledFor?: string;
    } = body;

    if (!userId || !profileId || !scheduledFor) {
      return NextResponse.json(
        { error: "userId, profileId, and scheduledFor are required" },
        { status: 400 },
      );
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isValidWorkoutDateString(scheduledFor)) {
      return NextResponse.json(
        { error: "scheduledFor must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    const profile = await getOwnedProfile(userId, profileId);
    if (!profile) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const [existingOverride, recurring] = await Promise.all([
      getExistingOverride(userId, profileId, scheduledFor),
      isRecurringOnDate(profileId, scheduledFor),
    ]);

    if (existingOverride?.overrideType === "manual_add") {
      return NextResponse.json({
        profileId,
        scheduledFor,
        overrideType: "manual_add",
        sourceType: "manual",
      });
    }

    if (existingOverride?.overrideType === "skip") {
      if (recurring) {
        await database
          .delete(workoutScheduleOverridesTable)
          .where(eq(workoutScheduleOverridesTable.id, existingOverride.id));

        return NextResponse.json({
          profileId,
          scheduledFor,
          overrideType: null,
          sourceType: "recurring",
        });
      }

      const [updatedOverride] = await database
        .update(workoutScheduleOverridesTable)
        .set({
          overrideType: "manual_add",
        })
        .where(eq(workoutScheduleOverridesTable.id, existingOverride.id))
        .returning({
          id: workoutScheduleOverridesTable.id,
          profileId: workoutScheduleOverridesTable.profileId,
          scheduledFor: workoutScheduleOverridesTable.scheduledFor,
          overrideType: workoutScheduleOverridesTable.overrideType,
        });

      return NextResponse.json(updatedOverride);
    }

    if (recurring) {
      return NextResponse.json({
        profileId,
        scheduledFor,
        overrideType: null,
        sourceType: "recurring",
      });
    }

    const [createdOverride] = await database
      .insert(workoutScheduleOverridesTable)
      .values({
        userId,
        profileId,
        scheduledFor,
        overrideType: "manual_add",
      })
      .returning({
        id: workoutScheduleOverridesTable.id,
        profileId: workoutScheduleOverridesTable.profileId,
        scheduledFor: workoutScheduleOverridesTable.scheduledFor,
        overrideType: workoutScheduleOverridesTable.overrideType,
      });

    return NextResponse.json(createdOverride, { status: 201 });
  } catch (error) {
    console.error("Failed to update workout schedule:", error);
    return NextResponse.json({ error: "Failed to update workout schedule" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const authorizedUserId = getAuthorizedUserId(request);
    const {
      userId,
      profileId,
      scheduledFor,
      sessionType,
    }: {
      userId?: string;
      profileId?: string;
      scheduledFor?: string;
      sessionType?: CalendarSessionDeleteType;
    } = body;

    if (!userId || !profileId || !scheduledFor || !sessionType) {
      return NextResponse.json(
        { error: "userId, profileId, scheduledFor, and sessionType are required" },
        { status: 400 },
      );
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isValidWorkoutDateString(scheduledFor)) {
      return NextResponse.json(
        { error: "scheduledFor must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    const profile = await getOwnedProfile(userId, profileId);
    if (!profile) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const [existingOverride, recurring] = await Promise.all([
      getExistingOverride(userId, profileId, scheduledFor),
      isRecurringOnDate(profileId, scheduledFor),
    ]);

    await deleteWorkoutLog({
      userId,
      profileId,
      performedOn: scheduledFor,
    });

    if (sessionType === "manual") {
      if (existingOverride?.overrideType === "manual_add") {
        await database
          .delete(workoutScheduleOverridesTable)
          .where(eq(workoutScheduleOverridesTable.id, existingOverride.id));
      }
    } else if (sessionType === "recurring") {
      if (recurring) {
        if (existingOverride?.overrideType === "manual_add") {
          await database
            .delete(workoutScheduleOverridesTable)
            .where(eq(workoutScheduleOverridesTable.id, existingOverride.id));
        } else if (existingOverride?.overrideType !== "skip") {
          await database.insert(workoutScheduleOverridesTable).values({
            userId,
            profileId,
            scheduledFor,
            overrideType: "skip",
          });
        }
      } else if (existingOverride?.overrideType === "manual_add") {
        await database
          .delete(workoutScheduleOverridesTable)
          .where(eq(workoutScheduleOverridesTable.id, existingOverride.id));
      }
    }

    return NextResponse.json({ message: "Workout removed from that day" });
  } catch (error) {
    console.error("Failed to delete scheduled workout:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled workout" },
      { status: 500 },
    );
  }
}
