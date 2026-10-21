import { Exercise } from "./exercise";

export class CardioExercise extends Exercise {
  duration: number;
  distance: number;
  intensity: string;

  constructor(
    exerciseId: string,
    name: string,
    caloriesBurnedPerMin: number,
    duration: number,
    distance: number,
    intensity: string
  ) {
    super(exerciseId, name, caloriesBurnedPerMin);

    this.duration = duration;
    this.distance = distance;
    this.intensity = intensity;
  }

  logCardio(duration: number, distance: number, intensity: string): void {
    this.duration = duration;
    this.distance = distance;
    this.intensity = intensity;
  }
}