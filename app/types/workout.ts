export type SourceExercise = {
  exerciseId: string;
  name: string;
  type: "cardio" | "weights" | "rest";
  caloriesBurnedPerMin: number;
  muscleGroup: string | null;
  unit: string | null;
};

export type WorkoutCompletionMode = "standard" | "minimum" | "alternate";
export type WorkoutScheduleOverrideType = "manual_add" | "skip";

export type WorkoutExerciseFields = {
  weight: number | null;
  sets: number | null;
  reps: number | null;
  duration: number | null;
  distance: number | null;
};

export type SortableExerciseItem = {
  exerciseId: string;
  name: string;
  type: "cardio" | "weights" | "rest";
  caloriesBurnedPerMin: number;
  muscleGroup: string | null;
  unit: string | null;
} & WorkoutExerciseFields;

export type PendingExercise = SortableExerciseItem & {
  tempId: string;
};

export type ProfileExercise = SortableExerciseItem & {
  id: string;
};

export type WorkoutProfile = {
  profileId: string;
  name: string;
  shareCode: string;
  exercises: ProfileExercise[];
  tags: string[];
  scheduledDays: string[];
};

export type WorkoutProfileSummary = {
  profileId: string;
  name: string;
  shareCode: string;
  tags?: string[];
  exerciseCount?: number;
  scheduledDays?: string[];
  estimatedCalories?: number;
};

export type WorkoutCompletion = {
  id: string;
  profileId: string;
  completedOn: string;
  completionMode: WorkoutCompletionMode;
  estimatedCalories?: number;
  exerciseCount?: number;
};

export type WorkoutScheduleOverride = {
  id: string;
  profileId: string;
  scheduledFor: string;
  overrideType: WorkoutScheduleOverrideType;
};

export type WorkoutLogExercise = {
  id: string;
  profileExerciseId: string | null;
  exerciseId: string | null;
  name: string;
  type: "cardio" | "weights" | "rest";
  caloriesBurnedPerMin: number;
  muscleGroup: string | null;
  unit: string | null;
  sortOrder: number;
} & WorkoutExerciseFields;

export type WorkoutLog = {
  id: string;
  profileId: string;
  profileName: string;
  performedOn: string;
  completionMode: WorkoutCompletionMode;
  estimatedCalories: number;
  exerciseCount: number;
  createdAt: string;
  exercises?: WorkoutLogExercise[];
};

export type WorkoutLogDraftExercise = {
  profileExerciseId: string | null;
  exerciseId: string | null;
  name: string;
  type: "cardio" | "weights" | "rest";
  caloriesBurnedPerMin: number;
  muscleGroup: string | null;
  unit: string | null;
  sortOrder: number;
  included: boolean;
} & WorkoutExerciseFields;

export type WorkoutLogDraft = {
  existingLogId: string | null;
  profileId: string;
  profileName: string;
  performedOn: string;
  completionMode: WorkoutCompletionMode;
  prefillSource: "existing-log" | "last-log" | "routine-defaults";
  sourcePerformedOn: string | null;
  exercises: WorkoutLogDraftExercise[];
};

// Analytics types

export type ExerciseHistoryPoint = {
  date: string;           // YYYY-MM-DD
  weight: number | null;
  sets: number | null;
  reps: number | null;
  volume: number | null;  // sets * reps * weight, null if any factor is missing
  duration: number | null;
  distance: number | null;
};

export type ExerciseAnalytics = {
  exerciseId: string | null;
  name: string;
  muscleGroup: string | null;
  type: "weights" | "cardio" | "rest";
  history: ExerciseHistoryPoint[]; // sorted oldest → newest
};

export type WeeklySummary = {
  weekStart: string;      // YYYY-MM-DD (Sunday of that week)
  sessionCount: number;
  totalCalories: number;
  totalVolume: number;
};

export type MuscleGroupBreakdown = {
  muscleGroup: string;    // "unknown" when null in DB
  sessionCount: number;
};

export type AnalyticsResponse = {
  exercises: ExerciseAnalytics[];
  weeklySummaries: WeeklySummary[];
  muscleGroupBreakdown: MuscleGroupBreakdown[];
};
