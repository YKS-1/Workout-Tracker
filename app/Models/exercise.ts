export abstract class Exercise {
  exerciseId: string;
  name: string;
  caloriesBurnedPerMin: number;

  constructor(exerciseId: string, name: string, caloriesBurnedPerMin: number) {
    this.exerciseId = exerciseId;
    this.name = name;
    this.caloriesBurnedPerMin = caloriesBurnedPerMin;
  }

  logEntry(): void {
    // base method (can be overridden by subclasses)
  }
}