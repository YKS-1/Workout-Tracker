import { v4 as uuidv4 } from "uuid";
import { inArray } from "drizzle-orm";
import { database } from "@/drizzle";
import {
  workoutProfilesTable,
  profileExercisesTable,
  workoutProfileTagsTable,
  exercisesTable,
} from "@/drizzle/schema";

type Tag = typeof workoutProfileTagsTable.tag.enumValues[number];

// Each default workout definition.
const DEFAULT_WORKOUTS: {
  name: string;
  exerciseNames: string[];
  // Weights exercises get reps, sets, and weight; cardio gets duration + distance
  exerciseDefaults: Record<string, { sets?: number; reps?: number; weight?: number; duration?: number; distance?: number }>;
  tags: Tag[];
}[] = [
  {
    name: "Upper Body",
    exerciseNames: [
      "Bench Press",
      "Barbell Row",
      "Shoulder Press",
      "Bicep Curl",
      "Tricep Pushdown",
    ],
    exerciseDefaults: {
      "Bench Press":     { sets: 3, reps: 10, weight: 60 },
      "Barbell Row":     { sets: 3, reps: 10, weight: 60 },
      "Shoulder Press":  { sets: 3, reps: 10, weight: 40 },
      "Bicep Curl":      { sets: 3, reps: 12, weight: 15 },
      "Tricep Pushdown": { sets: 3, reps: 12, weight: 25 },
    },
    tags: ["chest", "back", "shoulders", "arms", "moderate"],
  },
  {
    name: "Lower Body",
    exerciseNames: [
      "Squat",
      "Leg Press",
      "Romanian Deadlift",
      "Leg Extension",
      "Leg Curl",
    ],
    exerciseDefaults: {
      "Squat":             { sets: 3, reps: 10, weight: 80 },
      "Leg Press":         { sets: 3, reps: 12, weight: 100 },
      "Romanian Deadlift": { sets: 3, reps: 10, weight: 60 },
      "Leg Extension":     { sets: 3, reps: 12, weight: 40 },
      "Leg Curl":          { sets: 3, reps: 12, weight: 40 },
    },
    tags: ["legs", "moderate"],
  },
  {
    name: "Cardio",
    exerciseNames: [
      "Treadmill",
      "Rowing Machine",
      "Stationary Bike",
    ],
    exerciseDefaults: {
      "Treadmill":       { duration: 20, distance: 3 },
      "Rowing Machine":  { duration: 15, distance: 2 },
      "Stationary Bike": { duration: 15, distance: 4 },
    },
    tags: ["cardio", "moderate"],
  },
];

export async function createDefaultWorkoutsForUser(userId: string): Promise<void> {
  // Collect all exercise names we need across all workouts
  const allExerciseNames = DEFAULT_WORKOUTS.flatMap((w) => w.exerciseNames);

  // Single DB call to resolve all names -> IDs
  const foundExercises = await database
    .select({ exerciseId: exercisesTable.exerciseId, name: exercisesTable.name })
    .from(exercisesTable)
    .where(inArray(exercisesTable.name, allExerciseNames));

  const nameToId = new Map(foundExercises.map((e) => [e.name, e.exerciseId]));

  for (const workout of DEFAULT_WORKOUTS) {
    const shareCode = uuidv4().slice(0, 8).toUpperCase();

    const inserted = await database
      .insert(workoutProfilesTable)
      .values({
        name: workout.name,
        shareCode,
        ownerId: userId,
      })
      .returning({ profileId: workoutProfilesTable.profileId });

    const profileId = inserted[0]?.profileId;
    if (!profileId) throw new Error(`Failed to insert workout profile: ${workout.name}`);

    // Build exercise rows, silently skipping any name not found in the DB
    // (only useful if database not seeded)
    const exerciseRows = workout.exerciseNames
      .filter((name) => nameToId.has(name))
      .map((name) => {
        const defaults = workout.exerciseDefaults[name] ?? {};
        return {
          profileId,
          exerciseId: nameToId.get(name)!,
          weight:   defaults.weight   ?? null,
          sets:     defaults.sets     ?? null,
          reps:     defaults.reps     ?? null,
          duration: defaults.duration ?? null,
          distance: defaults.distance ?? null,
        };
      });

    if (exerciseRows.length > 0) {
      await database.insert(profileExercisesTable).values(exerciseRows);
    }

    if (workout.tags.length > 0) {
      await database
        .insert(workoutProfileTagsTable)
        .values(workout.tags.map((tag) => ({ profileId, tag })))
        .onConflictDoNothing();
    }
  }
}