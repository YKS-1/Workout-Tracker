import { SourceExercise, PendingExercise, WorkoutProfileSummary, SortableExerciseItem } from "@/app/types/workout";

export type CalorieEstimableExercise = Pick<
  SortableExerciseItem,
  "type" | "caloriesBurnedPerMin" | "weight" | "sets" | "reps" | "duration" | "distance"
>;

// Toggle a difficulty tag — casual and intense are mutually exclusive, moderate can coexist with either
export function toggleDifficultyTag(prev: string[], tag: string): string[] {
  if (prev.includes(tag)) return prev.filter((t) => t !== tag);
  if (tag === 'casual') return [...prev.filter((t) => t !== 'intense'), 'casual'];
  if (tag === 'intense') return [...prev.filter((t) => t !== 'casual'), 'intense'];
  return [...prev, tag];
}

// Validate all required fields are filled for each exercise type
export function isWorkoutValid(name: string, exercises: { type: string; weight: number | null; sets: number | null; reps: number | null; duration: number | null; distance: number | null; unit: string | null }[]): boolean {
  if (!name.trim()) return false;
  for (const ex of exercises) {
    if (ex.type === "weights" && (ex.weight === null || ex.sets === null || ex.reps === null)) return false;
    if (ex.type === "cardio" && (ex.duration === null || (ex.unit !== "Variable" && ex.distance === null))) return false;
    if (ex.type === "rest" && ex.duration === null) return false;
  }
  return true;
}

// Build a new pending exercise from a source exercise
export function buildPendingExercise(exercise: SourceExercise): PendingExercise {
  return {
    tempId: crypto.randomUUID(),
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    type: exercise.type,
    muscleGroup: exercise.muscleGroup,
    unit: exercise.unit,
    caloriesBurnedPerMin: exercise.caloriesBurnedPerMin,
    weight: null,
    sets: null,
    reps: null,
    duration: null,
    distance: null,
  };
}

// Get new index order after a drag end event
export function getDragEndIndices(
  items: { id: string }[],
  activeId: string,
  overId: string
): { oldIndex: number; newIndex: number } | null {
  if (activeId === overId) return null;
  const oldIndex = items.findIndex((ex) => ex.id === activeId);
  const newIndex = items.findIndex((ex) => ex.id === overId);
  if (oldIndex === -1 || newIndex === -1) return null;
  return { oldIndex, newIndex };
}

// Filter profiles by search term and selected tags
export function filterProfiles<T extends WorkoutProfileSummary>(
  profiles: T[],
  search: string,
  selectedDifficulty: string[],
  selectedMuscles: string[]
): T[] {
  return profiles.filter((profile) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      profile.name.toLowerCase().includes(searchLower) ||
      profile.tags?.some((t) => t.toLowerCase().includes(searchLower));

    const matchesDifficulty =
      selectedDifficulty.length === 0 ||
      selectedDifficulty.some((t) => profile.tags?.includes(t));

    const matchesMuscle =
      selectedMuscles.length === 0 ||
      selectedMuscles.some((t) => profile.tags?.includes(t));

    return matchesSearch && matchesDifficulty && matchesMuscle;
  });
}

// Sort profiles by name, exercise count, or default (date created)
export function sortProfiles<T extends WorkoutProfileSummary>(profiles: T[], sortBy: string): T[] {
  return [...profiles].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "exercise count") return (b.exerciseCount ?? 0) - (a.exerciseCount ?? 0);
    return 0;
  });
}

// Estimates calories burned for a single exercise.
// Cardio/rest (no distance): caloriesBurnedPerMin * duration
// Cardio (with distance):    caloriesBurnedPerMin * duration * speedFactor
//   speedFactor = 1 + (distance / duration) * 2 — faster pace scales up the estimate
//   ex: 6 km/h (0.1 km/min) -> 1.2x, 12 km/h (0.2 km/min) -> 1.4x
// Weights: caloriesBurnedPerMin * ((sets * reps * 3s) / 60) * weightFactor
//   weightFactor = 1 + (weight / 100) * 0.3 — heavier lifts scale up the estimate
//   ex: 0kg -> 1.0x, 50kg -> 1.15x, 100kg -> 1.30x
// Returns null if there isn't enough data to calculate.
export function estimateCalories(ex: CalorieEstimableExercise): number | null {
  if (!ex.caloriesBurnedPerMin) return null;

  if (ex.type === "cardio" || ex.type === "rest") {
    if (!ex.duration) return null;
    // If distance is available, use speed to scale the estimate
    // faster pace = higher intensity = more calories
    const speedFactor = ex.distance ? 1 + (ex.distance / ex.duration) * 2 : 1;
    return Math.round(ex.caloriesBurnedPerMin * ex.duration * speedFactor);
  }

  if (ex.type === "weights") {
    if (!ex.sets || !ex.reps) return null;
    const minutes = (ex.sets * ex.reps * 3) / 60;
    const weightFactor = ex.weight ? 1 + (ex.weight / 100) * 0.3 : 1;
    return Math.round(ex.caloriesBurnedPerMin * minutes * weightFactor);
  }

  return null;
}

export function estimateWorkoutCalories(exercises: CalorieEstimableExercise[]): number {
  return exercises.reduce((sum, exercise) => sum + (estimateCalories(exercise) ?? 0), 0);
}
