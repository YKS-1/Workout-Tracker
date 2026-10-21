import { NextResponse, NextRequest } from 'next/server';
import { database } from '@/drizzle';
import { workoutProfilesTable, profileExercisesTable, workoutProfileTagsTable, exercisesTable, scheduledDaysTable } from '@/drizzle/schema';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { estimateWorkoutCalories } from '@/lib/workoutUtils';

const MUSCLE_TAGS = ['chest', 'legs', 'shoulders', 'back', 'arms', 'core', 'cardio'];

type Tag = typeof workoutProfileTagsTable.tag.enumValues[number];
type DayOfWeek = typeof scheduledDaysTable.dayOfWeek.enumValues[number];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // RIGHT NOW: Read from query params
    // FUTURE: Change this to request.headers.get('x-user-id')
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Fetch all profiles for this user
    const profiles = await database
      .select()
      .from(workoutProfilesTable)
      .where(eq(workoutProfilesTable.ownerId, userId));

    if (profiles.length === 0) {
      return NextResponse.json([]);
    }

    const profileIds = profiles.map((p) => p.profileId);

    // Fetch all tags, exercises, and scheduled days in parallel
    const [tags, exercises, scheduledDays] = await Promise.all([
      database
        .select({
          profileId: workoutProfileTagsTable.profileId,
          tag: workoutProfileTagsTable.tag,
        })
        .from(workoutProfileTagsTable)
        .where(inArray(workoutProfileTagsTable.profileId, profileIds)),

      database
        .select({
          profileId: profileExercisesTable.profileId,
          type: exercisesTable.type,
          caloriesBurnedPerMin: exercisesTable.caloriesBurnedPerMin,
          weight: profileExercisesTable.weight,
          sets: profileExercisesTable.sets,
          reps: profileExercisesTable.reps,
          duration: profileExercisesTable.duration,
          distance: profileExercisesTable.distance,
        })
        .from(profileExercisesTable)
        .innerJoin(exercisesTable, eq(profileExercisesTable.exerciseId, exercisesTable.exerciseId))
        .where(inArray(profileExercisesTable.profileId, profileIds)),

      database
        .select({
          profileId: scheduledDaysTable.profileId,
          dayOfWeek: scheduledDaysTable.dayOfWeek,
        })
        .from(scheduledDaysTable)
        .where(inArray(scheduledDaysTable.profileId, profileIds)),
    ]);

    // Group tags by profileId
    const tagsByProfile = new Map<string, string[]>();
    for (const row of tags) {
      if (!tagsByProfile.has(row.profileId)) tagsByProfile.set(row.profileId, []);
      tagsByProfile.get(row.profileId)!.push(row.tag);
    }

    // Count exercises by profileId
    const exerciseCountByProfile = new Map<string, number>();
    const caloriesByProfile = new Map<string, number>();
    const exercisesByProfile = new Map<string, typeof exercises>();
    for (const row of exercises) {
      exerciseCountByProfile.set(
        row.profileId,
        (exerciseCountByProfile.get(row.profileId) ?? 0) + 1
      );

      if (!exercisesByProfile.has(row.profileId)) exercisesByProfile.set(row.profileId, []);
      exercisesByProfile.get(row.profileId)!.push(row);
    }

    for (const [profileId, profileExercises] of exercisesByProfile.entries()) {
      caloriesByProfile.set(profileId, estimateWorkoutCalories(profileExercises));
    }

    // Group scheduled days by profileId
    const daysByProfile = new Map<string, string[]>();
    for (const row of scheduledDays) {
      if (!daysByProfile.has(row.profileId)) daysByProfile.set(row.profileId, []);
      daysByProfile.get(row.profileId)!.push(row.dayOfWeek);
    }

    // Merge everything into final response
    const profilesWithData = profiles.map((profile) => ({
      ...profile,
      tags: tagsByProfile.get(profile.profileId) ?? [],
      exerciseCount: exerciseCountByProfile.get(profile.profileId) ?? 0,
      scheduledDays: daysByProfile.get(profile.profileId) ?? [],
      estimatedCalories: caloriesByProfile.get(profile.profileId) ?? 0,
    }));

    return NextResponse.json(profilesWithData);
  } catch (error) {
    console.error("Failed to fetch profiles:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // RIGHT NOW: Read from body
    // FUTURE: Change this to request.headers.get('x-user-id')
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { name, exercises, tags, scheduledDays } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const shareCode = uuidv4().slice(0, 8).toUpperCase();

    const [profile] = await database
      .insert(workoutProfilesTable)
      .values({ name, shareCode, ownerId: userId })
      .returning();

    if (exercises && exercises.length > 0) {
      await database.insert(profileExercisesTable).values(
        exercises.map((ex: {
          exerciseId: string;
          weight?: number;
          sets?: number;
          reps?: number;
          duration?: number;
          distance?: number;
        }) => ({
          profileId: profile.profileId,
          exerciseId: ex.exerciseId,
          weight: ex.weight ?? null,
          sets: ex.sets ?? null,
          reps: ex.reps ?? null,
          duration: ex.duration ?? null,
          distance: ex.distance ?? null,
        }))
      );

      const exerciseDetails = await database
        .select({ type: exercisesTable.type, muscleGroup: exercisesTable.muscleGroup })
        .from(exercisesTable)
        .where(inArray(exercisesTable.exerciseId, exercises.map((ex: { exerciseId: string }) => ex.exerciseId)));

      const autoTags = new Set<string>();
      for (const ex of exerciseDetails) {
        if (ex.type === 'cardio') autoTags.add('cardio');
        if (ex.type === 'weights' && ex.muscleGroup) autoTags.add(ex.muscleGroup);
      }

      if (autoTags.size > 0) {
        await database.insert(workoutProfileTagsTable).values(
          Array.from(autoTags).map((tag) => ({ profileId: profile.profileId, tag: tag as Tag }))
        ).onConflictDoNothing();
      }
    }

    if (tags && tags.length > 0) {
      const difficultyTags = tags.filter((t: string) => !MUSCLE_TAGS.includes(t));
      if (difficultyTags.length > 0) {
        await database.insert(workoutProfileTagsTable).values(
          difficultyTags.map((tag: string) => ({ profileId: profile.profileId, tag: tag as Tag }))
        ).onConflictDoNothing();
      }
    }

    // Insert scheduled days if provided
    if (scheduledDays && scheduledDays.length > 0) {
      await database.insert(scheduledDaysTable).values(
        scheduledDays.map((day: DayOfWeek) => ({
          profileId: profile.profileId,
          dayOfWeek: day,
        }))
      ).onConflictDoNothing();
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("Failed to create profile:", error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
