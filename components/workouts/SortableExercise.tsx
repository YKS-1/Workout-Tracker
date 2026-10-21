"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { SortableExerciseItem } from "@/app/types/workout";
import { estimateCalories } from "@/lib/workoutUtils";

export type { SortableExerciseItem };


export function SortableExercise({
  ex,
  itemId,
  index,
  total,
  onRemove,
  onUpdate,
  onMoveUp,
  onMoveDown,
  confirmRemoveId,
  setConfirmRemoveId,
}: {
  ex: SortableExerciseItem;
  itemId: string;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  confirmRemoveId: string | null;
  setConfirmRemoveId: (id: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const calories = estimateCalories(ex);

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg px-4 py-2">
      {confirmRemoveId === itemId ? (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Remove {ex.name}?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onRemove(itemId)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
            >
              Remove
            </button>
            <button
              onClick={() => setConfirmRemoveId(null)}
              className="border border-gray-300 px-3 py-1 rounded text-xs hover:border-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical className="w-4 h-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{ex.name}</p>
                <p className="text-xs text-gray-500">
                  {ex.type} · {ex.muscleGroup ?? ex.unit}
                  {calories !== null && (
                    <span className="ml-2 text-gray-400">~{calories} cal</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  onClick={() => onMoveUp(index)}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMoveDown(index)}
                  disabled={index === total - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setConfirmRemoveId(itemId)}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>

          {ex.type === "weights" && (
            <div className="flex gap-2 mt-1">
              <input type="number" placeholder="kg *" value={ex.weight ?? ""} onChange={(e) => onUpdate(itemId, "weight", parseFloat(e.target.value))} className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900" />
              <input type="number" placeholder="sets *" value={ex.sets ?? ""} onChange={(e) => onUpdate(itemId, "sets", parseInt(e.target.value))} className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900" />
              <input type="number" placeholder="reps *" value={ex.reps ?? ""} onChange={(e) => onUpdate(itemId, "reps", parseInt(e.target.value))} className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900" />
            </div>
          )}
          {ex.type === "cardio" && (
            <div className="flex gap-2 mt-1">
              <input type="number" placeholder="mins *" value={ex.duration ?? ""} onChange={(e) => onUpdate(itemId, "duration", parseInt(e.target.value))} className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900" />
              {ex.unit !== "Variable" && (
                <input type="number" placeholder="km *" value={ex.distance ?? ""} onChange={(e) => onUpdate(itemId, "distance", parseFloat(e.target.value))} className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900" />
              )}
              <span className="text-xs text-gray-400 self-center">{ex.unit}</span>
            </div>
          )}
          {ex.type === "rest" && (
            <div className="flex gap-2 mt-1">
              <input type="number" placeholder="mins *" value={ex.duration ?? ""} onChange={(e) => onUpdate(itemId, "duration", parseInt(e.target.value))} className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900" />
            </div>
          )}
        </>
      )}
    </div>
  );
}