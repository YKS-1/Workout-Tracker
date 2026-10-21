import { database } from "@/drizzle";
import { exercisesTable } from "@/drizzle/schema";

export async function GET() {
  try {
    const exercises = await database.select().from(exercisesTable);

    return Response.json(exercises);
  } catch (error) {
    console.error("Failed to fetch exercises:", error);

    return Response.json(
      { error: "Failed to fetch exercises" },
      { status: 500 }
    );
  }
}