import { database } from "./index";
import { exercisesTable } from "./schema";

async function seed() {
  await database
    .insert(exercisesTable)
    .values([
      // CARDIO
      { name: "Treadmill", type: "cardio", caloriesBurnedPerMin: 10, unit: "Adjustable", muscleGroup: null },
      { name: "Stationary Bike", type: "cardio", caloriesBurnedPerMin: 8, unit: "Adjustable", muscleGroup: null },
      { name: "Rowing Machine", type: "cardio", caloriesBurnedPerMin: 9, unit: "Adjustable", muscleGroup: null },
      { name: "Stairmaster", type: "cardio", caloriesBurnedPerMin: 9, unit: "Adjustable", muscleGroup: null },
      { name: "Jump Rope", type: "cardio", caloriesBurnedPerMin: 12, unit: "Variable", muscleGroup: null },

      // CHEST
      { name: "Bench Press", type: "weights", caloriesBurnedPerMin: 6, unit: null, muscleGroup: "chest" },
      { name: "Incline Bench Press", type: "weights", caloriesBurnedPerMin: 6, unit: null, muscleGroup: "chest" },
      { name: "Chest Fly", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "chest" },
      { name: "Cable Chest Fly", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "chest" },
      { name: "Decline Bench Press", type: "weights", caloriesBurnedPerMin: 6, unit: null, muscleGroup: "chest" },

      // LEGS
      { name: "Squat", type: "weights", caloriesBurnedPerMin: 7, unit: null, muscleGroup: "legs" },
      { name: "Leg Press", type: "weights", caloriesBurnedPerMin: 7, unit: null, muscleGroup: "legs" },
      { name: "Romanian Deadlift", type: "weights", caloriesBurnedPerMin: 7, unit: null, muscleGroup: "legs" },
      { name: "Leg Extension", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "legs" },
      { name: "Leg Curl", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "legs" },

      // SHOULDERS
      { name: "Shoulder Press", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "shoulders" },
      { name: "Lateral Raise", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "shoulders" },
      { name: "Front Raise", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "shoulders" },
      { name: "Rear Delt Fly", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "shoulders" },
      { name: "Arnold Press", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "shoulders" },

      // BACK
      { name: "Deadlift", type: "weights", caloriesBurnedPerMin: 8, unit: null, muscleGroup: "back" },
      { name: "Lat Pulldown", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "back" },
      { name: "Barbell Row", type: "weights", caloriesBurnedPerMin: 6, unit: null, muscleGroup: "back" },
      { name: "Seated Cable Row", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "back" },
      { name: "Pull Up", type: "weights", caloriesBurnedPerMin: 6, unit: null, muscleGroup: "back" },

      // ARMS
      { name: "Bicep Curl", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "arms" },
      { name: "Hammer Curl", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "arms" },
      { name: "Tricep Pushdown", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "arms" },
      { name: "Skullcrusher", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "arms" },
      { name: "Concentration Curl", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "arms" },

      // CORE
      { name: "Cable Crunch", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "core" },
      { name: "Hanging Leg Raise", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "core" },
      { name: "Russian Twist", type: "weights", caloriesBurnedPerMin: 4, unit: null, muscleGroup: "core" },
      { name: "Ab Wheel Rollout", type: "weights", caloriesBurnedPerMin: 6, unit: null, muscleGroup: "core" },
      { name: "Weighted Sit Up", type: "weights", caloriesBurnedPerMin: 5, unit: null, muscleGroup: "core" },

      // REST
      { name: "Rest", type: "rest", caloriesBurnedPerMin: 0, unit: null, muscleGroup: null }
    ])
    .onConflictDoNothing();

  console.log("Exercises seeded successfully");
}

seed()
  .then(() => {
    console.log("Seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });