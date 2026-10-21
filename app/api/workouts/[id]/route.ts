import { NextResponse, NextRequest } from 'next/server';
import { database } from '@/drizzle';
import { workoutProfilesTable, profileExercisesTable, exercisesTable, workoutProfileTagsTable, scheduledDaysTable } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

type Tag = typeof workoutProfileTagsTable.tag.enumValues[number];
type DayOfWeek = typeof scheduledDaysTable.dayOfWeek.enumValues[number];

// Sync muscle/cardio tags based on current exercises
async function syncMuscleGroupTags(profileId: string) {
  const currentExercises = await database
    .select({ type: exercisesTable.type, muscleGroup: exercisesTable.muscleGroup })
    .from(profileExercisesTable)
    .innerJoin(exercisesTable, eq(profileExercisesTable.exerciseId, exercisesTable.exerciseId))
    .where(eq(profileExercisesTable.profileId, profileId));

  const activeTags = new Set<string>();
  for (const ex of currentExercises) {
    if (ex.type === 'cardio') activeTags.add('cardio');
    if (ex.type === 'weights' && ex.muscleGroup) activeTags.add(ex.muscleGroup);
  }

  const MUSCLE_TAGS = ['chest', 'legs', 'shoulders', 'back', 'arms', 'core', 'cardio'];

  const existingTagRows = await database
    .select({ tag: workoutProfileTagsTable.tag })
    .from(workoutProfileTagsTable)
    .where(eq(workoutProfileTagsTable.profileId, profileId));

  const existingMuscleTags = existingTagRows
    .map((t) => t.tag)
    .filter((t) => MUSCLE_TAGS.includes(t));

  for (const tag of activeTags) {
    if (!existingMuscleTags.includes(tag as Tag)) {
      await database
        .insert(workoutProfileTagsTable)
        .values({ profileId, tag: tag as Tag })
        .onConflictDoNothing();
    }
  }

  for (const tag of existingMuscleTags) {
    if (!activeTags.has(tag)) {
      await database
        .delete(workoutProfileTagsTable)
        .where(and(
          eq(workoutProfileTagsTable.profileId, profileId),
          eq(workoutProfileTagsTable.tag, tag)
        ));
    }
  }
}

// Get a single workout profile with its exercises, tags, and scheduled days
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url);

    // RIGHT NOW: Read from query params
    // FUTURE: Change this to request.headers.get('x-user-id')
    const userId = searchParams.get("userId");
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const [profile] = await database
      .select()
      .from(workoutProfilesTable)
      .where(and(
        eq(workoutProfilesTable.profileId, id),
        eq(workoutProfilesTable.ownerId, userId)
      ));

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch exercises, tags, and scheduled days in parallel
    const [exercises, tagRows, dayRows] = await Promise.all([
      database
        .select({
          id: profileExercisesTable.id,
          exerciseId: exercisesTable.exerciseId,
          name: exercisesTable.name,
          type: exercisesTable.type,
          caloriesBurnedPerMin: exercisesTable.caloriesBurnedPerMin,
          muscleGroup: exercisesTable.muscleGroup,
          unit: exercisesTable.unit,
          weight: profileExercisesTable.weight,
          sets: profileExercisesTable.sets,
          reps: profileExercisesTable.reps,
          duration: profileExercisesTable.duration,
          distance: profileExercisesTable.distance,
        })
        .from(profileExercisesTable)
        .innerJoin(exercisesTable, eq(profileExercisesTable.exerciseId, exercisesTable.exerciseId))
        .where(eq(profileExercisesTable.profileId, id))
        .orderBy(profileExercisesTable.sortOrder),  // ← preserve saved order

      database
        .select({ tag: workoutProfileTagsTable.tag })
        .from(workoutProfileTagsTable)
        .where(eq(workoutProfileTagsTable.profileId, id)),

      database
        .select({ dayOfWeek: scheduledDaysTable.dayOfWeek, id: scheduledDaysTable.id })
        .from(scheduledDaysTable)
        .where(eq(scheduledDaysTable.profileId, id)),
    ]);

    return NextResponse.json({
      ...profile,
      exercises,
      tags: tagRows.map((t) => t.tag),
      scheduledDays: dayRows.map((d) => d.dayOfWeek),
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// Add/remove exercise, tag, or scheduled day
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // RIGHT NOW: Read from body
    // FUTURE: Change this to request.headers.get('x-user-id')
    const userId = body.userId;

    const { action, exerciseId, profileExerciseId, tag, name, day, weight, sets, reps, duration, distance, orderedIds }: {
      action: string;
      exerciseId?: string;
      profileExerciseId?: string;
      tag?: Tag;
      name?: string;
      day?: DayOfWeek;
      weight?: number;
      sets?: number;
      reps?: number;
      duration?: number;
      distance?: number;
      orderedIds?: string[];
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const [profile] = await database
      .select()
      .from(workoutProfilesTable)
      .where(and(
        eq(workoutProfilesTable.profileId, id),
        eq(workoutProfilesTable.ownerId, userId)
      ));

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (action === 'rename') {
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      const [updated] = await database
        .update(workoutProfilesTable)
        .set({ name })
        .where(eq(workoutProfilesTable.profileId, id))
        .returning();
      return NextResponse.json(updated);
    }

    if (action === 'add') {
      // Place new exercise at the end of the current list
      const existing = await database
        .select({ id: profileExercisesTable.id })
        .from(profileExercisesTable)
        .where(eq(profileExercisesTable.profileId, id));

      const [entry] = await database
        .insert(profileExercisesTable)
        .values({
          profileId: id,
          exerciseId: exerciseId!,
          sortOrder: existing.length,  // ← append to end
          weight: weight ?? null,
          sets: sets ?? null,
          reps: reps ?? null,
          duration: duration ?? null,
          distance: distance ?? null,
        })
        .returning();
      await syncMuscleGroupTags(id);
      return NextResponse.json(entry, { status: 201 });
    }

    if (action === 'update') {
      const [updated] = await database
        .update(profileExercisesTable)
        .set({
          weight: weight ?? null,
          sets: sets ?? null,
          reps: reps ?? null,
          duration: duration ?? null,
          distance: distance ?? null,
        })
        .where(eq(profileExercisesTable.id, profileExerciseId!))
        .returning();
      return NextResponse.json(updated);
    }

    if (action === 'remove') {
      await database
        .delete(profileExercisesTable)
        .where(eq(profileExercisesTable.id, profileExerciseId!));
      await syncMuscleGroupTags(id);
      return NextResponse.json({ message: "Exercise removed" });
    }

    // Persist the display order of exercises
    if (action === 'reorder') {
      if (!Array.isArray(orderedIds)) {
        return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
      }
      for (let i = 0; i < orderedIds.length; i++) {
        await database
          .update(profileExercisesTable)
          .set({ sortOrder: i })
          .where(eq(profileExercisesTable.id, orderedIds[i]));
      }
      return NextResponse.json({ message: "Order saved" });
    }

    if (action === 'addTag') {
      await database
        .insert(workoutProfileTagsTable)
        .values({ profileId: id, tag: tag! })
        .onConflictDoNothing();
      return NextResponse.json({ message: "Tag added" });
    }

    if (action === 'removeTag') {
      await database
        .delete(workoutProfileTagsTable)
        .where(and(
          eq(workoutProfileTagsTable.profileId, id),
          eq(workoutProfileTagsTable.tag, tag!)
        ));
      return NextResponse.json({ message: "Tag removed" });
    }

    if (action === 'addDay') {
      if (!day) return NextResponse.json({ error: "day is required" }, { status: 400 });
      await database
        .insert(scheduledDaysTable)
        .values({ profileId: id, dayOfWeek: day })
        .onConflictDoNothing();
      return NextResponse.json({ message: "Day added" });
    }

    if (action === 'removeDay') {
      if (!day) return NextResponse.json({ error: "day is required" }, { status: 400 });
      await database
        .delete(scheduledDaysTable)
        .where(and(
          eq(scheduledDaysTable.profileId, id),
          eq(scheduledDaysTable.dayOfWeek, day)
        ));
      return NextResponse.json({ message: "Day removed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

// Delete a workout profile
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // RIGHT NOW: Read from body
    // FUTURE: Change this to request.headers.get('x-user-id')
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const [profile] = await database
      .select()
      .from(workoutProfilesTable)
      .where(and(
        eq(workoutProfilesTable.profileId, id),
        eq(workoutProfilesTable.ownerId, userId)
      ));

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Delete all related data before deleting the profile
    await database.delete(scheduledDaysTable).where(eq(scheduledDaysTable.profileId, id));
    await database.delete(workoutProfileTagsTable).where(eq(workoutProfileTagsTable.profileId, id));
    await database.delete(profileExercisesTable).where(eq(profileExercisesTable.profileId, id));
    await database.delete(workoutProfilesTable).where(eq(workoutProfilesTable.profileId, id));

    return NextResponse.json({ message: "Profile deleted" });
  } catch (error) {
    console.error("Failed to delete profile:", error);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}