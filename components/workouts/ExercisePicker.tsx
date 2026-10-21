"use client";

import { SourceExercise } from "@/app/types/workout";

export function ExercisePicker({
  exercises,
  onAdd,
}: {
  exercises: SourceExercise[];
  onAdd: (exercise: SourceExercise) => void;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Add Exercises</h2>
      <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
        {exercises.map((ex) => (
          <div key={ex.exerciseId} className="flex items-center justify-between px-2 py-1">
            <div>
              <p className="text-sm font-medium">{ex.name}</p>
              <p className="text-xs text-gray-500">{ex.type} · {ex.muscleGroup ?? ex.unit}</p>
            </div>
            <button onClick={() => onAdd(ex)} className="text-xs text-blue-900 hover:underline">
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}