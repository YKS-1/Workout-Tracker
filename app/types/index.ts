export type Exercise = CardioExercise | WeightsExercise | RestExercise;

export type CardioExercise = {
  type: "cardio";
  exerciseId: string;
  name: string;
  caloriesBurnedPerMin: number;
  unit: "Adjustable" | "Variable";
};

export type WeightsExercise = {
  type: "weights";
  exerciseId: string;
  name: string;
  caloriesBurnedPerMin: number;
  muscleGroup:
    | "chest"
    | "legs"
    | "shoulders"
    | "back"
    | "arms"
    | "core";
};

export type RestExercise = {
  type: "rest";
  exerciseId: string;
  name: string;
  caloriesBurnedPerMin: number;
};

export type WorkoutProfile = {
  profileId: string;
  name: string;
  shareCode: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduledDay = {
  id: string;
  profileId: string;
  dayOfWeek:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  createdAt: Date;
};

export type ProfileExercise = {
  id: string;
  profileId: string;
  exerciseId: string;
  createdAt: Date;

  // Weights fields
  weight: number | null;
  sets: number | null;
  reps: number | null;
  // Cardio/rest fields
  duration: number | null;
  distance: number | null;
};
export type Tag = 
  | 'casual' | 'moderate' | 'intense'
  | 'chest' | 'legs' | 'shoulders' | 'back' | 'arms' | 'core' | 'cardio';