import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { database } from "@/drizzle";
import {
  completionModeEnum,
  exercisesTable,
  profileExercisesTable,
  workoutCompletionsTable,
  workoutLogExercisesTable,
  workoutLogsTable,
  workoutProfilesTable,
} from "@/drizzle/schema";
import {
  WorkoutCompletion,
  WorkoutCompletionMode,
  WorkoutLog,
  WorkoutLogDraft,
  WorkoutLogDraftExercise,
  WorkoutLogExercise,
} from "@/app/types/workout";
import { formatLocalDate } from "@/lib/workout-schedule";
import { estimateWorkoutCalories } from "@/lib/workoutUtils";

type WorkoutLogListParams = {
  userId: string;
  profileId?: string;
  performedOn?: string;
  includeExercises?: boolean;
  limit?: number;
};

type WorkoutLogInputExercise = Omit<WorkoutLogDraftExercise, "included"> & {
  included?: boolean;
};

type UpsertWorkoutLogParams = {
  userId: string;
  profileId: string;
  performedOn: string;
  completionMode?: WorkoutCompletionMode;
  exercises?: WorkoutLogInputExercise[];
};

type DeleteWorkoutLogParams = {
  userId: string;
  logId?: string;
  profileId?: string;
  performedOn?: string;
};

type CurrentProfileExercise = {
  profileExerciseId: string;
  exerciseId: string;
  name: string;
  type: "cardio" | "weights" | "rest";
  caloriesBurnedPerMin: number;
  muscleGroup: string | null;
  unit: string | null;
  weight: number | null;
  sets: number | null;
  reps: number | null;
  duration: number | null;
  distance: number | null;
};

function getWorkoutSessionKey(profileId: string, performedOn: string) {
  return `${profileId}:${performedOn}`;
}

export function isValidWorkoutDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isFutureWorkoutDateString(value: string, referenceDate: Date = new Date()) {
  return value > formatLocalDate(referenceDate);
}

async function getOwnedProfile(userId: string, profileId: string) {
  const [profile] = await database
    .select({
      profileId: workoutProfilesTable.profileId,
      name: workoutProfilesTable.name,
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

async function getCurrentProfileExercises(profileId: string): Promise<CurrentProfileExercise[]> {
  const exercises = await database
    .select({
      profileExerciseId: profileExercisesTable.id,
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
    .where(eq(profileExercisesTable.profileId, profileId));

  return exercises;
}

async function getProfileEstimatedCaloriesMap(profileIds: string[]) {
  if (profileIds.length === 0) {
    return new Map<string, number>();
  }

  const profileExercises = await database
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
    .where(inArray(profileExercisesTable.profileId, profileIds));

  const grouped = new Map<string, typeof profileExercises>();

  for (const row of profileExercises) {
    if (!grouped.has(row.profileId)) {
      grouped.set(row.profileId, []);
    }

    grouped.get(row.profileId)!.push(row);
  }

  return new Map(
    profileIds.map((profileId) => [
      profileId,
      estimateWorkoutCalories(grouped.get(profileId) ?? []),
    ]),
  );
}

function mapLogExercisesByLogId(
  rows: {
    workoutLogId: string;
    id: string;
    profileExerciseId: string | null;
    exerciseId: string | null;
    name: string;
    type: "cardio" | "weights" | "rest";
    caloriesBurnedPerMin: number;
    muscleGroup: string | null;
    unit: string | null;
    sortOrder: number;
    weight: number | null;
    sets: number | null;
    reps: number | null;
    duration: number | null;
    distance: number | null;
  }[],
) {
  const map = new Map<string, WorkoutLogExercise[]>();

  for (const row of rows) {
    if (!map.has(row.workoutLogId)) {
      map.set(row.workoutLogId, []);
    }

    map.get(row.workoutLogId)!.push({
      id: row.id,
      profileExerciseId: row.profileExerciseId,
      exerciseId: row.exerciseId,
      name: row.name,
      type: row.type,
      caloriesBurnedPerMin: row.caloriesBurnedPerMin,
      muscleGroup: row.muscleGroup,
      unit: row.unit,
      sortOrder: row.sortOrder,
      weight: row.weight,
      sets: row.sets,
      reps: row.reps,
      duration: row.duration,
      distance: row.distance,
    });
  }

  return map;
}

export async function listWorkoutLogs({
  userId,
  profileId,
  performedOn,
  includeExercises = false,
  limit,
}: WorkoutLogListParams): Promise<WorkoutLog[]> {
  const filters = [eq(workoutLogsTable.userId, userId)];

  if (profileId) {
    filters.push(eq(workoutLogsTable.profileId, profileId));
  }

  if (performedOn) {
    filters.push(eq(workoutLogsTable.performedOn, performedOn));
  }

  const baseQuery = database
    .select({
      id: workoutLogsTable.id,
      profileId: workoutLogsTable.profileId,
      profileName: workoutProfilesTable.name,
      performedOn: workoutLogsTable.performedOn,
      completionMode: workoutLogsTable.completionMode,
      createdAt: workoutLogsTable.createdAt,
    })
    .from(workoutLogsTable)
    .innerJoin(workoutProfilesTable, eq(workoutLogsTable.profileId, workoutProfilesTable.profileId))
    .where(and(...filters))
    .orderBy(desc(workoutLogsTable.performedOn), desc(workoutLogsTable.createdAt));

  const logRows = limit ? await baseQuery.limit(limit) : await baseQuery;

  if (logRows.length === 0) {
    return [];
  }

  const logIds = logRows.map((row) => row.id);
  const profileIds = Array.from(new Set(logRows.map((row) => row.profileId)));
  const [exerciseRows, profileCalories] = await Promise.all([
    database
      .select({
        workoutLogId: workoutLogExercisesTable.workoutLogId,
        id: workoutLogExercisesTable.id,
        profileExerciseId: workoutLogExercisesTable.profileExerciseId,
        exerciseId: workoutLogExercisesTable.exerciseId,
        name: workoutLogExercisesTable.name,
        type: workoutLogExercisesTable.type,
        caloriesBurnedPerMin: workoutLogExercisesTable.caloriesBurnedPerMin,
        muscleGroup: workoutLogExercisesTable.muscleGroup,
        unit: workoutLogExercisesTable.unit,
        sortOrder: workoutLogExercisesTable.sortOrder,
        weight: workoutLogExercisesTable.weight,
        sets: workoutLogExercisesTable.sets,
        reps: workoutLogExercisesTable.reps,
        duration: workoutLogExercisesTable.duration,
        distance: workoutLogExercisesTable.distance,
      })
      .from(workoutLogExercisesTable)
      .where(inArray(workoutLogExercisesTable.workoutLogId, logIds))
      .orderBy(
        asc(workoutLogExercisesTable.sortOrder),
        asc(workoutLogExercisesTable.createdAt),
      ),
    getProfileEstimatedCaloriesMap(profileIds),
  ]);

  const exercisesByLogId = mapLogExercisesByLogId(exerciseRows);

  return logRows.map((row) => {
    const exercises = exercisesByLogId.get(row.id) ?? [];
    const estimatedCalories =
      exercises.length > 0
        ? estimateWorkoutCalories(exercises)
        : profileCalories.get(row.profileId) ?? 0;

    return {
      id: row.id,
      profileId: row.profileId,
      profileName: row.profileName,
      performedOn: row.performedOn,
      completionMode: row.completionMode,
      estimatedCalories,
      exerciseCount: exercises.length,
      createdAt: new Date(row.createdAt).toISOString(),
      exercises: includeExercises ? exercises : undefined,
    };
  });
}

function mapWorkoutLogToCompletion(log: WorkoutLog): WorkoutCompletion {
  return {
    id: log.id,
    profileId: log.profileId,
    completedOn: log.performedOn,
    completionMode: log.completionMode,
    estimatedCalories: log.estimatedCalories,
    exerciseCount: log.exerciseCount,
  };
}

export async function listWorkoutCompletionSummaries({
  userId,
  profileId,
  completedOn,
}: {
  userId: string;
  profileId?: string;
  completedOn?: string;
}): Promise<WorkoutCompletion[]> {
  const [logs, legacyRows] = await Promise.all([
    listWorkoutLogs({
      userId,
      profileId,
      performedOn: completedOn,
    }),
    (async () => {
      const filters = [eq(workoutCompletionsTable.userId, userId)];

      if (profileId) {
        filters.push(eq(workoutCompletionsTable.profileId, profileId));
      }

      if (completedOn) {
        filters.push(eq(workoutCompletionsTable.completedOn, completedOn));
      }

      return database
        .select({
          id: workoutCompletionsTable.id,
          profileId: workoutCompletionsTable.profileId,
          completedOn: workoutCompletionsTable.completedOn,
          completionMode: workoutCompletionsTable.completionMode,
        })
        .from(workoutCompletionsTable)
        .where(and(...filters))
        .orderBy(desc(workoutCompletionsTable.completedOn), desc(workoutCompletionsTable.createdAt));
    })(),
  ]);

  const logSummaries = logs.map(mapWorkoutLogToCompletion);
  const logKeys = new Set(logSummaries.map((log) => getWorkoutSessionKey(log.profileId, log.completedOn)));
  const legacyProfileIds = Array.from(new Set(legacyRows.map((row) => row.profileId)));
  const profileCalories = await getProfileEstimatedCaloriesMap(legacyProfileIds);

  const legacySummaries = legacyRows
    .filter((row) => !logKeys.has(getWorkoutSessionKey(row.profileId, row.completedOn)))
    .map((row) => ({
      id: row.id,
      profileId: row.profileId,
      completedOn: row.completedOn,
      completionMode: row.completionMode,
      estimatedCalories: profileCalories.get(row.profileId) ?? 0,
      exerciseCount: 0,
    }));

  return [...logSummaries, ...legacySummaries].sort((left, right) => {
    if (left.completedOn === right.completedOn) {
      return left.profileId.localeCompare(right.profileId);
    }

    return right.completedOn.localeCompare(left.completedOn);
  });
}

function buildDraftFromExistingLog(log: WorkoutLog): WorkoutLogDraft {
  return {
    existingLogId: log.id,
    profileId: log.profileId,
    profileName: log.profileName,
    performedOn: log.performedOn,
    completionMode: log.completionMode,
    prefillSource: "existing-log",
    sourcePerformedOn: log.performedOn,
    exercises: (log.exercises ?? []).map((exercise) => ({
      profileExerciseId: exercise.profileExerciseId,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      type: exercise.type,
      caloriesBurnedPerMin: exercise.caloriesBurnedPerMin,
      muscleGroup: exercise.muscleGroup,
      unit: exercise.unit,
      sortOrder: exercise.sortOrder,
      included: true,
      weight: exercise.weight,
      sets: exercise.sets,
      reps: exercise.reps,
      duration: exercise.duration,
      distance: exercise.distance,
    })),
  };
}

function buildPrefilledExercises(
  currentExercises: CurrentProfileExercise[],
  sourceExercises: WorkoutLogExercise[],
): WorkoutLogDraftExercise[] {
  const sourceByProfileExerciseId = new Map<string, WorkoutLogExercise>();
  const sourceByExerciseId = new Map<string, WorkoutLogExercise[]>();
  const usedExerciseIds = new Set<string>();

  for (const exercise of sourceExercises) {
    if (exercise.profileExerciseId) {
      sourceByProfileExerciseId.set(exercise.profileExerciseId, exercise);
    }

    if (exercise.exerciseId) {
      if (!sourceByExerciseId.has(exercise.exerciseId)) {
        sourceByExerciseId.set(exercise.exerciseId, []);
      }

      sourceByExerciseId.get(exercise.exerciseId)!.push(exercise);
    }
  }

  return currentExercises.map((exercise, index) => {
    let matched: WorkoutLogExercise | undefined;

    if (sourceByProfileExerciseId.has(exercise.profileExerciseId)) {
      matched = sourceByProfileExerciseId.get(exercise.profileExerciseId);
    }

    if (!matched) {
      const matchingExercises = sourceByExerciseId.get(exercise.exerciseId) ?? [];
      matched = matchingExercises.find((candidate) => !usedExerciseIds.has(candidate.id));
    }

    if (matched) {
      usedExerciseIds.add(matched.id);
    }

    return {
      profileExerciseId: exercise.profileExerciseId,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      type: exercise.type,
      caloriesBurnedPerMin: exercise.caloriesBurnedPerMin,
      muscleGroup: exercise.muscleGroup,
      unit: exercise.unit,
      sortOrder: index,
      included: true,
      weight: matched?.weight ?? exercise.weight,
      sets: matched?.sets ?? exercise.sets,
      reps: matched?.reps ?? exercise.reps,
      duration: matched?.duration ?? exercise.duration,
      distance: matched?.distance ?? exercise.distance,
    };
  });
}

export async function buildWorkoutLogDraft({
  userId,
  profileId,
  performedOn,
}: {
  userId: string;
  profileId: string;
  performedOn: string;
}): Promise<WorkoutLogDraft | null> {
  const profile = await getOwnedProfile(userId, profileId);

  if (!profile) {
    return null;
  }

  const [currentExercises, logs] = await Promise.all([
    getCurrentProfileExercises(profileId),
    listWorkoutLogs({
      userId,
      profileId,
      includeExercises: true,
    }),
  ]);

  const existingLog = logs.find((log) => log.performedOn === performedOn) ?? null;

  if (existingLog && (existingLog.exercises?.length ?? 0) > 0) {
    return buildDraftFromExistingLog(existingLog);
  }

  const lastDetailedLog =
    logs.find(
      (log) => log.id !== existingLog?.id && (log.exercises?.length ?? 0) > 0,
    ) ?? null;

  return {
    existingLogId: existingLog?.id ?? null,
    profileId: profile.profileId,
    profileName: profile.name,
    performedOn,
    completionMode: existingLog && (existingLog.exercises?.length ?? 0) === 0
      ? "standard"
      : existingLog?.completionMode ?? "standard",
    prefillSource: lastDetailedLog ? "last-log" : "routine-defaults",
    sourcePerformedOn: lastDetailedLog?.performedOn ?? null,
    exercises: buildPrefilledExercises(currentExercises, lastDetailedLog?.exercises ?? []),
  };
}

function normalizeCompletionMode(mode?: WorkoutCompletionMode): WorkoutCompletionMode {
  if (mode && completionModeEnum.enumValues.includes(mode)) {
    return mode;
  }

  return "standard";
}

function normalizeLoggedUnit(unit: string | null): "Adjustable" | "Variable" | null {
  return unit === "Adjustable" || unit === "Variable" ? unit : null;
}

function normalizeLoggedMuscleGroup(
  muscleGroup: string | null,
): "chest" | "legs" | "shoulders" | "back" | "arms" | "core" | null {
  return ["chest", "legs", "shoulders", "back", "arms", "core"].includes(muscleGroup ?? "")
    ? (muscleGroup as "chest" | "legs" | "shoulders" | "back" | "arms" | "core")
    : null;
}

export async function upsertWorkoutLog({
  userId,
  profileId,
  performedOn,
  completionMode,
  exercises,
}: UpsertWorkoutLogParams): Promise<WorkoutLog | null> {
  const profile = await getOwnedProfile(userId, profileId);

  if (!profile) {
    return null;
  }

  const normalizedMode = normalizeCompletionMode(completionMode);
  const includedExercises = (exercises ?? [])
    .filter((exercise) => exercise.included !== false)
    .map((exercise, index) => ({
      profileExerciseId: exercise.profileExerciseId ?? null,
      exerciseId: exercise.exerciseId ?? null,
      name: exercise.name,
      type: exercise.type,
      caloriesBurnedPerMin: exercise.caloriesBurnedPerMin,
      muscleGroup: exercise.muscleGroup,
      unit: exercise.unit,
      sortOrder: exercise.sortOrder ?? index,
      weight: exercise.weight ?? null,
      sets: exercise.sets ?? null,
      reps: exercise.reps ?? null,
      duration: exercise.duration ?? null,
      distance: exercise.distance ?? null,
    }));

  const [existingLog] = await database
    .select({
      id: workoutLogsTable.id,
    })
    .from(workoutLogsTable)
    .where(
      and(
        eq(workoutLogsTable.userId, userId),
        eq(workoutLogsTable.profileId, profileId),
        eq(workoutLogsTable.performedOn, performedOn),
      ),
    )
    .limit(1);

  let workoutLogId = existingLog?.id ?? null;

  if (workoutLogId) {
    await database
      .update(workoutLogsTable)
      .set({
        completionMode: normalizedMode,
      })
      .where(eq(workoutLogsTable.id, workoutLogId));

    if (exercises) {
      await database
        .delete(workoutLogExercisesTable)
        .where(eq(workoutLogExercisesTable.workoutLogId, workoutLogId));
    }
  } else {
    const [createdLog] = await database
      .insert(workoutLogsTable)
      .values({
        userId,
        profileId,
        performedOn,
        completionMode: normalizedMode,
      })
      .returning({
        id: workoutLogsTable.id,
      });

    workoutLogId = createdLog.id;
  }

  if (workoutLogId && exercises && includedExercises.length > 0) {
    const resolvedWorkoutLogId = workoutLogId;

    await database.insert(workoutLogExercisesTable).values(
      includedExercises.map((exercise) => ({
        workoutLogId: resolvedWorkoutLogId,
        profileExerciseId: exercise.profileExerciseId,
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        type: exercise.type,
        caloriesBurnedPerMin: exercise.caloriesBurnedPerMin,
        muscleGroup: normalizeLoggedMuscleGroup(exercise.muscleGroup),
        unit: normalizeLoggedUnit(exercise.unit),
        sortOrder: exercise.sortOrder,
        weight: exercise.weight,
        sets: exercise.sets,
        reps: exercise.reps,
        duration: exercise.duration,
        distance: exercise.distance,
      })),
    );
  }

  await database
    .delete(workoutCompletionsTable)
    .where(
      and(
        eq(workoutCompletionsTable.userId, userId),
        eq(workoutCompletionsTable.profileId, profileId),
        eq(workoutCompletionsTable.completedOn, performedOn),
      ),
    );

  const [savedLog] = await listWorkoutLogs({
    userId,
    profileId,
    performedOn,
    includeExercises: true,
    limit: 1,
  });

  return savedLog ?? null;
}

export async function deleteWorkoutLog({
  userId,
  logId,
  profileId,
  performedOn,
}: DeleteWorkoutLogParams) {
  let resolvedProfileId = profileId ?? null;
  let resolvedPerformedOn = performedOn ?? null;

  if (logId) {
    const [existingLog] = await database
      .select({
        id: workoutLogsTable.id,
        profileId: workoutLogsTable.profileId,
        performedOn: workoutLogsTable.performedOn,
      })
      .from(workoutLogsTable)
      .where(and(eq(workoutLogsTable.id, logId), eq(workoutLogsTable.userId, userId)))
      .limit(1);

    if (!existingLog) {
      return false;
    }

    resolvedProfileId = existingLog.profileId;
    resolvedPerformedOn = existingLog.performedOn;

    await database.delete(workoutLogsTable).where(eq(workoutLogsTable.id, existingLog.id));
  } else if (resolvedProfileId && resolvedPerformedOn) {
    await database
      .delete(workoutLogsTable)
      .where(
        and(
          eq(workoutLogsTable.userId, userId),
          eq(workoutLogsTable.profileId, resolvedProfileId),
          eq(workoutLogsTable.performedOn, resolvedPerformedOn),
        ),
      );
  }

  if (resolvedProfileId && resolvedPerformedOn) {
    await database
      .delete(workoutCompletionsTable)
      .where(
        and(
          eq(workoutCompletionsTable.userId, userId),
          eq(workoutCompletionsTable.profileId, resolvedProfileId),
          eq(workoutCompletionsTable.completedOn, resolvedPerformedOn),
        ),
      );
  }

  return true;
}
