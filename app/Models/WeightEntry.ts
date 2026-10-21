export class WeightEntry {
  date: Date;
  weight: number;
  reps: number;

  constructor(date: Date, weight: number, reps: number) {
    this.date = date;
    this.weight = weight;
    this.reps = reps;
  }
}