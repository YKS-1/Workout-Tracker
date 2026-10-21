"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableExercise } from "@/components/workouts/SortableExercise";
import { DifficultyTags } from "@/components/workouts/DifficultyTags";
import { MuscleTags } from "@/components/workouts/MuscleTags";
import { ExercisePicker } from "@/components/workouts/ExercisePicker";
import { ScheduledDays } from "@/components/workouts/ScheduledDays";
import { toggleDifficultyTag, isWorkoutValid, buildPendingExercise, getDragEndIndices, estimateCalories } from "@/lib/workoutUtils";
import { SourceExercise, PendingExercise } from "@/app/types/workout";
import { useTheme } from "@/context/theme-context";

function getUserId(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function fetchExercises(): Promise<SourceExercise[] | null> {
  try {
    const res = await fetch("/api/exercises");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function CreateWorkoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const [name, setName] = useState("");
  const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>([]);
  const [difficultyTags, setDifficultyTags] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scheduledDays, setScheduledDays] = useState<string[]>([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isDark = theme === "dark";

  const pageBg = isDark ? "bg-[#0d1117] text-white" : "text-gray-900";
  const headingText = isDark ? "text-white" : "text-gray-900";
  const mutedText = isDark ? "text-gray-500" : "text-gray-400";
  const secondaryText = isDark ? "text-gray-400" : "text-gray-500";

  // Labels
  const labelText = isDark ? "text-gray-300" : "text-gray-700";

  // Inputs
  const inputClass = isDark
    ? "bg-[#111827] border-white/10 text-white placeholder-gray-600 focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-900";

  // Ghost / outline button (cancel, back)
  const ghostBtn = isDark
    ? "border-white/10 text-gray-400 hover:border-white/25 hover:text-white"
    : "border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900";

  // Discard confirm text
  const discardLabel = isDark ? "text-gray-400" : "text-gray-600";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: exercises, isLoading } = useQuery<SourceExercise[] | null>({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
  });

  const createMutation = useMutation({
    mutationFn: async (): Promise<null> => {
      try {
        await fetch("/api/workouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            userId: getUserId(),
            name,
            // Include sortOrder so the API can persist the display order from the start
            exercises: pendingExercises.map((ex, index) => ({ ...ex, sortOrder: index })),
            tags: difficultyTags,
            scheduledDays,
          }),
        });
      } catch {
        // ignore
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      router.push("/workouts");
    },
  });

  const hasChanges = () =>
    name.trim() !== "" || pendingExercises.length > 0 || difficultyTags.length > 0 || scheduledDays.length > 0;

  const handleBack = () => {
    if (hasChanges()) { setConfirmDiscard(true); } else { router.push("/workouts"); }
  };

  const addPendingExercise = (exercise: SourceExercise) => {
    setPendingExercises((prev) => [...prev, buildPendingExercise(exercise)]);
  };

  const updatePendingExercise = (tempId: string, field: string, value: number) => {
    setPendingExercises((prev) =>
      prev.map((ex) => (ex.tempId === tempId ? { ...ex, [field]: value } : ex))
    );
  };

  const removePendingExercise = (tempId: string) => {
    setPendingExercises((prev) => prev.filter((ex) => ex.tempId !== tempId));
    setConfirmRemoveId(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setPendingExercises((prev) => arrayMove(prev, index, index - 1));
  };

  const moveDown = (index: number) => {
    if (index === pendingExercises.length - 1) return;
    setPendingExercises((prev) => arrayMove(prev, index, index + 1));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    const items = pendingExercises.map((ex) => ({ id: ex.tempId }));
    const result = getDragEndIndices(items, active.id, over?.id);
    if (result) {
      setPendingExercises((prev) => arrayMove(prev, result.oldIndex, result.newIndex));
    }
  };

  const handleToggleDifficulty = (tag: string) => {
    setDifficultyTags((prev) => toggleDifficultyTag(prev, tag));
  };

  const handleToggleDay = (day: string) => {
    setScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const isValid = () => isWorkoutValid(name, pendingExercises);

  const handleSave = () => {
    const newWarnings: string[] = [];
    if (pendingExercises.length === 0) newWarnings.push("You are saving a workout with no exercises.");
    if (difficultyTags.length === 0) newWarnings.push("You haven't set a difficulty tag.");
    if (newWarnings.length > 0) {
      setWarnings(newWarnings);
      return;
    }
    createMutation.mutate();
  };

  const handleConfirmSave = () => {
    setWarnings([]);
    createMutation.mutate();
  };

  const exerciseList = exercises ?? [];

  if (isLoading) {
    return (
      <div className={`min-h-screen p-8 ${pageBg}`}>
        <p className={mutedText}>Loading exercises...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 max-w-4xl mx-auto ${pageBg}`}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-3xl font-bold ${headingText}`}>Create Workout</h1>

        {confirmDiscard ? (
          <div className="flex items-center gap-2">
            <p className={`text-xs font-medium ${discardLabel}`}>Discard unsaved changes?</p>
            <button
              onClick={() => router.push("/workouts")}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition"
            >
              Discard
            </button>
            <button
              onClick={() => setConfirmDiscard(false)}
              className={`border px-3 py-1 rounded text-xs transition ${ghostBtn}`}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleBack}
            className="text-sm text-blue-500 hover:underline"
          >
            Back to Workouts
          </button>
        )}
      </div>

      {/* ── Workout name ── */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-1 ${labelText}`}>
          Workout Name *
        </label>
        <input
          type="text"
          placeholder="e.g. Push Day"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
        />
      </div>

      {/* ── Sub-components (DifficultyTags, MuscleTags, etc.) ── */}
      {/* These components will need their own theme wiring if they contain hardcoded colors */}
      <DifficultyTags selectedTags={difficultyTags} onToggle={handleToggleDifficulty} />
      <MuscleTags exercises={pendingExercises} />

      {/* ── Exercise list ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-lg font-semibold ${headingText}`}>Exercises in this workout</h2>
          <span className={`text-xs ${mutedText}`}>
            {pendingExercises.length} exercise{pendingExercises.length !== 1 ? "s" : ""} · ~{pendingExercises.reduce((sum, ex) => sum + (estimateCalories(ex) ?? 0), 0)} cal
          </span>
        </div>

        {pendingExercises.length === 0 ? (
          <p className={`text-sm ${secondaryText}`}>No exercises added yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pendingExercises.map((ex) => ex.tempId)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {pendingExercises.map((ex, index) => (
                  <SortableExercise
                    key={ex.tempId}
                    ex={ex}
                    itemId={ex.tempId}
                    index={index}
                    total={pendingExercises.length}
                    onRemove={removePendingExercise}
                    onUpdate={updatePendingExercise}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                    confirmRemoveId={confirmRemoveId}
                    setConfirmRemoveId={setConfirmRemoveId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <ExercisePicker exercises={exerciseList} onAdd={addPendingExercise} />
      <ScheduledDays selectedDays={scheduledDays} onToggle={handleToggleDay} />

      <p className={`text-xs mb-4 ${mutedText}`}>* All fields are required before saving</p>

      {/* ── Save / warnings ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSave}
          disabled={!isValid() || createMutation.isPending}
          className="bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm transition disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? "Saving..." : "Save Workout"}
        </button>

        {warnings.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-500">{w}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmSave}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs transition"
              >
                Save Anyway
              </button>
              <button
                onClick={() => setWarnings([])}
                className={`border px-3 py-1 rounded text-xs transition ${ghostBtn}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}