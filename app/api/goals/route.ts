import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { database } from "@/drizzle";
import { userGoalSettingsTable } from "@/drizzle/schema";
import { getTokenFromRequest } from "@/lib/auth";
import { DEFAULT_GOAL_SETTINGS, isValidReminderTime } from "@/lib/goal-tracking";

const goalSettingsSchema = z.object({
  weeklyWorkoutGoal: z.number().int().min(1).max(14),
  reminderTime: z.string().refine(isValidReminderTime, {
    message: "reminderTime must be in HH:MM format",
  }),
  recoveryModeEnabled: z.boolean(),
});

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

    const [settings] = await database
      .select({
        weeklyWorkoutGoal: userGoalSettingsTable.weeklyWorkoutGoal,
        reminderTime: userGoalSettingsTable.reminderTime,
        recoveryModeEnabled: userGoalSettingsTable.recoveryModeEnabled,
      })
      .from(userGoalSettingsTable)
      .where(eq(userGoalSettingsTable.userId, userId))
      .limit(1);

    return NextResponse.json(settings ?? DEFAULT_GOAL_SETTINGS);
  } catch (error) {
    console.error("Failed to fetch goal settings:", error);
    return NextResponse.json({ error: "Failed to fetch goal settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const authorizedUserId = getAuthorizedUserId(request);
    const { userId, ...rawSettings }: { userId?: string } & z.infer<typeof goalSettingsSchema> = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!authorizedUserId || authorizedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const validation = goalSettingsSchema.safeParse(rawSettings);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const [settings] = await database
      .insert(userGoalSettingsTable)
      .values({
        userId,
        ...validation.data,
      })
      .onConflictDoUpdate({
        target: userGoalSettingsTable.userId,
        set: validation.data,
      })
      .returning({
        weeklyWorkoutGoal: userGoalSettingsTable.weeklyWorkoutGoal,
        reminderTime: userGoalSettingsTable.reminderTime,
        recoveryModeEnabled: userGoalSettingsTable.recoveryModeEnabled,
      });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to save goal settings:", error);
    return NextResponse.json({ error: "Failed to save goal settings" }, { status: 500 });
  }
}
