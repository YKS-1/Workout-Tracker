"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { WorkoutLogDraftExercise } from "@/app/types/workout";
import { estimateCalories } from "@/lib/workoutUtils";

type WorkoutLogExerciseCardProps = {
  exercise: WorkoutLogDraftExercise;
  isDark?: boolean;
  onToggleIncluded: () => void;
  onUpdate: (
    field: "weight" | "sets" | "reps" | "duration" | "distance",
    value: number | null,
  ) => void;
};

function parseNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function WorkoutLogExerciseCard({
  exercise,
  isDark = false,
  onToggleIncluded,
  onUpdate,
}: WorkoutLogExerciseCardProps) {
  const estimatedCalories = estimateCalories(exercise);

  return (
    <div
      className={`rounded-2xl border px-4 py-4 transition ${
        exercise.included
          ? isDark
            ? "border-white/10 bg-[#111827]"
            : "border-gray-300 bg-white"
          : isDark
            ? "border-white/8 bg-[#162033]"
            : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onToggleIncluded}
            className="inline-flex items-center gap-2 text-left"
          >
            {exercise.included ? (
              <CheckCircle2 className="h-5 w-5 text-blue-900" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{exercise.name}</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {exercise.type} · {exercise.muscleGroup ?? exercise.unit ?? "custom"}
              </p>
            </div>
          </button>
        </div>

        <div className="text-right">
          <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {exercise.included ? "Logged" : "Skipped"}
          </p>
          {estimatedCalories !== null && (
            <p className={`mt-1 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>~{estimatedCalories} cal</p>
          )}
        </div>
      </div>

      {exercise.included ? (
        <>
          {exercise.type === "weights" && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Weight"
                value={exercise.weight ?? ""}
                onChange={(event) => onUpdate("weight", parseNumber(event.target.value))}
                className={`rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isDark
                    ? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400 focus:ring-blue-400/20"
                    : "border-gray-300 bg-white text-gray-900 focus:border-blue-900 focus:ring-blue-900/20"
                }`}
              />
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Sets"
                value={exercise.sets ?? ""}
                onChange={(event) => onUpdate("sets", parseNumber(event.target.value))}
                className={`rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isDark
                    ? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400 focus:ring-blue-400/20"
                    : "border-gray-300 bg-white text-gray-900 focus:border-blue-900 focus:ring-blue-900/20"
                }`}
              />
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Reps"
                value={exercise.reps ?? ""}
                onChange={(event) => onUpdate("reps", parseNumber(event.target.value))}
                className={`rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isDark
                    ? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400 focus:ring-blue-400/20"
                    : "border-gray-300 bg-white text-gray-900 focus:border-blue-900 focus:ring-blue-900/20"
                }`}
              />
            </div>
          )}

          {exercise.type === "cardio" && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Duration (min)"
                value={exercise.duration ?? ""}
                onChange={(event) => onUpdate("duration", parseNumber(event.target.value))}
                className={`rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isDark
                    ? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400 focus:ring-blue-400/20"
                    : "border-gray-300 bg-white text-gray-900 focus:border-blue-900 focus:ring-blue-900/20"
                }`}
              />
              {exercise.unit !== "Variable" ? (
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Distance"
                  value={exercise.distance ?? ""}
                  onChange={(event) => onUpdate("distance", parseNumber(event.target.value))}
                  className={`rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    isDark
                      ? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400 focus:ring-blue-400/20"
                      : "border-gray-300 bg-white text-gray-900 focus:border-blue-900 focus:ring-blue-900/20"
                  }`}
                />
              ) : (
                <div className={`rounded-xl border border-dashed px-3 py-2 text-sm ${isDark ? "border-white/10 text-gray-500" : "border-gray-300 text-gray-400"}`}>
                  Distance varies
                </div>
              )}
              <div className={`flex items-center text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {exercise.unit ?? "cardio"}
              </div>
            </div>
          )}

          {exercise.type === "rest" && (
            <div className="mt-4 max-w-[220px]">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Duration (min)"
                value={exercise.duration ?? ""}
                onChange={(event) => onUpdate("duration", parseNumber(event.target.value))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isDark
                    ? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400 focus:ring-blue-400/20"
                    : "border-gray-300 bg-white text-gray-900 focus:border-blue-900 focus:ring-blue-900/20"
                }`}
              />
            </div>
          )}
        </>
      ) : (
        <p className={`mt-4 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          This exercise will stay out of this session log.
        </p>
      )}
    </div>
  );
}
