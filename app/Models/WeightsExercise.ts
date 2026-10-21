import { Exercise } from "./exercise";
import { WeightEntry } from "./WeightEntry";

export class WeightsExercise extends Exercise {
  weight: number;
  reps: number;
  sets: number;
  weightHistory: WeightEntry[];

  constructor(
    exerciseId: string,
    name: string,
    caloriesBurnedPerMin: number,
    weight: number,
    reps: number,
    sets: number
  ) {
    super(exerciseId, name, caloriesBurnedPerMin);
    this.weight = weight;
    this.reps = reps;
    this.sets = sets;
    this.weightHistory = [];
  }

  logWeight(weight: number, reps: number): void {
    const entry = new WeightEntry(new Date(), weight, reps);
    this.weightHistory.push(entry);
    this.weight = weight;
    this.reps = reps;
  }

  getProgressChart(): WeightEntry[] {
    return this.weightHistory;
  }
}