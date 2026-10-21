"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableExercise } from "@/components/workouts/SortableExercise";
import { DifficultyTags } from "@/components/workouts/DifficultyTags";
import { MuscleTags } from "@/components/workouts/MuscleTags";
import { ExercisePicker } from "@/components/workouts/ExercisePicker";
import { ScheduledDays } from "@/components/workouts/ScheduledDays";
import { toggleDifficultyTag, isWorkoutValid, buildPendingExercise, getDragEndIndices, estimateCalories } from "@/lib/workoutUtils";
import { Share2 } from "lucide-react";
import { SourceExercise, PendingExercise, ProfileExercise, WorkoutProfile } from "@/app/types/workout";
import { useTheme } from "@/context/theme-context";

const DIFFICULTY_TAGS = ['casual', 'moderate', 'intense'];

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

async function fetchProfile(id: string): Promise<WorkoutProfile | null> {
  try {
    const userId = getUserId();
    const res = await fetch(`/api/workouts/${id}?userId=${userId}`, {
      headers: { "Authorization": `Bearer ${getToken()}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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

export default function EditWorkoutPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const [localName, setLocalName] = useState("");
  const [localExercises, setLocalExercises] = useState<(ProfileExercise | PendingExercise)[]>([]);
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [localDays, setLocalDays] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const isDark = theme === "dark";

  const pageBg = isDark ? "bg-[#0d1117] text-white" : "text-gray-900";
  const headingText = isDark ? "text-white" : "text-gray-900";
  const mutedText = isDark ? "text-gray-500" : "text-gray-400";
  const secondaryText = isDark ? "text-gray-400" : "text-gray-500";
  const labelText = isDark ? "text-gray-300" : "text-gray-700";

  const inputClass = isDark
    ? "bg-[#111827] border-white/10 text-white placeholder-gray-600 focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-900";

  const ghostBtn = isDark
    ? "border-white/10 text-gray-400 hover:border-white/25 hover:text-white"
    : "border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900";

  const discardLabel = isDark ? "text-gray-400" : "text-gray-600";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery<WorkoutProfile | null>({
    queryKey: ["profile", id],
    queryFn: () => fetchProfile(id),
  });

  const { data: exercises, isLoading: exercisesLoading } = useQuery<SourceExercise[] | null>({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
  });

  useEffect(() => {
    if (profile && !initialized) {
      setLocalName(profile.name);
      setLocalExercises(profile.exercises);
      setLocalTags(profile.tags);
      setLocalDays(profile.scheduledDays ?? []);
      setInitialized(true);
    }
  }, [profile, initialized]);

  const hasChanges = () => {
    if (!profile) return false;
    if (localName !== profile.name) return true;
    if (JSON.stringify(localTags.slice().sort()) !== JSON.stringify(profile.tags.slice().sort())) return true;
    if (localExercises.length !== profile.exercises.length) return true;
    if (JSON.stringify(localDays.slice().sort()) !== JSON.stringify((profile.scheduledDays ?? []).slice().sort())) return true;
    return JSON.stringify(localExercises) !== JSON.stringify(profile.exercises);
  };

  const saveMutation = useMutation({
    mutationFn: async (): Promise<null> => {
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`,
      };
      const userId = getUserId();

      if (localName !== profile?.name) {
        try {
          await fetch(`/api/workouts/${id}`, {
            method: "PUT", headers,
            body: JSON.stringify({ userId, action: "rename", name: localName }),
          });
        } catch { /* continue */ }
      }

      const difficultyTagsToRemove = (profile?.tags ?? [])
        .filter((t) => DIFFICULTY_TAGS.includes(t) && !localTags.includes(t));
      const difficultyTagsToAdd = localTags
        .filter((t) => DIFFICULTY_TAGS.includes(t) && !(profile?.tags ?? []).includes(t));

      for (const tag of difficultyTagsToRemove) {
        try {
          await fetch(`/api/workouts/${id}`, {
            method: "PUT", headers,
            body: JSON.stringify({ userId, action: "removeTag", tag }),
          });
        } catch { /* continue */ }
      }
      for (const tag of difficultyTagsToAdd) {
        try {
          await fetch(`/api/workouts/${id}`, {
            method: "PUT", headers,
            body: JSON.stringify({ userId, action: "addTag", tag }),
          });
        } catch { /* continue */ }
      }

      const daysToRemove = (profile?.scheduledDays ?? []).filter((d) => !localDays.includes(d));
      const daysToAdd = localDays.filter((d) => !(profile?.scheduledDays ?? []).includes(d));

      for (const day of daysToRemove) {
        try {
          await fetch(`/api/workouts/${id}`, {
            method: "PUT", headers,
            body: JSON.stringify({ userId, action: "removeDay", day }),
          });
        } catch { /* continue */ }
      }
      for (const day of daysToAdd) {
        try {
          await fetch(`/api/workouts/${id}`, {
            method: "PUT", headers,
            body: JSON.stringify({ userId, action: "addDay", day }),
          });
        } catch { /* continue */ }
      }

      const originalIds = new Set((profile?.exercises ?? []).map((e) => e.id));
      const localIds = new Set(
        localExercises.filter((e): e is ProfileExercise => 'id' in e).map((e) => e.id)
      );

      // Remove exercises that were deleted
      for (const exId of originalIds) {
        if (!localIds.has(exId)) {
          try {
            await fetch(`/api/workouts/${id}`, {
              method: "PUT", headers,
              body: JSON.stringify({ userId, action: "remove", profileExerciseId: exId }),
            });
          } catch { /* continue */ }
        }
      }

      // Add new exercises (pending, no id yet)
      for (const ex of localExercises) {
        if (!('id' in ex)) {
          try {
            await fetch(`/api/workouts/${id}`, {
              method: "PUT", headers,
              body: JSON.stringify({ userId, action: "add", exerciseId: ex.exerciseId, weight: ex.weight, sets: ex.sets, reps: ex.reps, duration: ex.duration, distance: ex.distance }),
            });
          } catch { /* continue */ }
        }
      }

      // Update changed existing exercises
      for (const ex of localExercises) {
        if ('id' in ex) {
          const original = profile?.exercises.find((e) => e.id === ex.id);
          if (original && JSON.stringify(ex) !== JSON.stringify(original)) {
            try {
              await fetch(`/api/workouts/${id}`, {
                method: "PUT", headers,
                body: JSON.stringify({ userId, action: "update", profileExerciseId: ex.id, weight: ex.weight, sets: ex.sets, reps: ex.reps, duration: ex.duration, distance: ex.distance }),
              });
            } catch { /* continue */ }
          }
        }
      }

      // Persist the order of all existing exercises if it changed
      const existingInLocal = localExercises
        .filter((e): e is ProfileExercise => 'id' in e)
        .map((e) => e.id);

      const existingInProfile = (profile?.exercises ?? []).map((e) => e.id);

      const orderChanged =
        existingInLocal.length === existingInProfile.length &&
        existingInLocal.some((exId, i) => exId !== existingInProfile[i]);

      if (orderChanged) {
        try {
          await fetch(`/api/workouts/${id}`, {
            method: "PUT", headers,
            body: JSON.stringify({ userId, action: "reorder", orderedIds: existingInLocal }),
          });
        } catch { /* continue */ }
      }

      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", id] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setInitialized(false);
      router.push("/workouts");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (): Promise<null> => {
      try {
        await fetch(`/api/workouts/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
          body: JSON.stringify({ userId: getUserId() }),
        });
      } catch { /* ignore */ }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      router.push("/workouts");
    },
  });

  const addExercise = (exercise: SourceExercise) => {
    setLocalExercises((prev) => [...prev, buildPendingExercise(exercise)]);
  };

  const updateExercise = (itemId: string, field: string, value: number) => {
    setLocalExercises((prev) =>
      prev.map((ex) => {
        const exId = 'id' in ex ? ex.id : ex.tempId;
        return exId === itemId ? { ...ex, [field]: value } : ex;
      })
    );
  };

  const removeExercise = (itemId: string) => {
    setLocalExercises((prev) => prev.filter((ex) => ('id' in ex ? ex.id : ex.tempId) !== itemId));
    setConfirmRemoveId(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setLocalExercises((prev) => arrayMove(prev, index, index - 1));
  };

  const moveDown = (index: number) => {
    if (index === localExercises.length - 1) return;
    setLocalExercises((prev) => arrayMove(prev, index, index + 1));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    const items = localExercises.map((ex) => ({ id: 'id' in ex ? ex.id : ex.tempId }));
    const result = getDragEndIndices(items, active.id, over?.id);
    if (result) setLocalExercises((prev) => arrayMove(prev, result.oldIndex, result.newIndex));
  };

  const handleToggleDifficulty = (tag: string) => {
    setLocalTags((prev) => toggleDifficultyTag(prev, tag));
  };

  const handleToggleDay = (day: string) => {
    setLocalDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const isValid = () => isWorkoutValid(localName, localExercises);

  const handleSave = () => {
    const newWarnings: string[] = [];
    if (localExercises.length === 0) newWarnings.push("You are saving a workout with no exercises.");
    if (localTags.filter((t) => DIFFICULTY_TAGS.includes(t)).length === 0) newWarnings.push("You haven't set a difficulty tag.");
    if (newWarnings.length > 0) { setWarnings(newWarnings); return; }
    saveMutation.mutate();
  };

  const handleConfirmSave = () => { setWarnings([]); saveMutation.mutate(); };

  const handleBack = () => {
    if (hasChanges()) { setConfirmDiscard(true); } else { router.push("/workouts"); }
  };

  const exerciseList = exercises ?? [];

  if (profileLoading || exercisesLoading) {
    return (
      <div className={`min-h-screen p-8 ${pageBg}`}>
        <p className={mutedText}>Loading...</p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className={`min-h-screen p-8 ${pageBg}`}>
        <p className="text-red-500">Failed to load workout.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 max-w-4xl mx-auto ${pageBg}`}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-3xl font-bold ${headingText}`}>Edit Workout</h1>

        <div className="flex gap-3 items-center">
          {/* Discard confirm */}
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
            <button onClick={handleBack} className="text-sm text-blue-500 hover:underline">
              Back to Workouts
            </button>
          )}

          {/* Delete confirm */}
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-red-500">Delete this workout?</p>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50 transition"
              >
                {deleteMutation.isPending ? "..." : "Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className={`border px-3 py-1 rounded text-xs transition ${ghostBtn}`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => router.push(`/workouts/${id}/log`)}
                className="text-sm text-blue-500 hover:underline"
              >
                Log Workout
              </button>
              <button
                onClick={() => router.push(`/workouts/share/${id}`)}
                className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-500 hover:underline"
              >
                Delete Workout
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Workout name ── */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-1 ${labelText}`}>
          Workout Name *
        </label>
        <input
          type="text"
          placeholder="e.g. Push Day"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          className={`w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
        />
      </div>

      <DifficultyTags selectedTags={localTags} onToggle={handleToggleDifficulty} />
      <MuscleTags exercises={localExercises} />

      {/* ── Exercise list ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-lg font-semibold ${headingText}`}>Exercises</h2>
          <span className={`text-xs ${mutedText}`}>
            {localExercises.length} exercise{localExercises.length !== 1 ? "s" : ""} · ~{localExercises.reduce((sum, ex) => sum + (estimateCalories(ex) ?? 0), 0)} cal
          </span>
        </div>

        {localExercises.length === 0 ? (
          <p className={`text-sm mb-4 ${secondaryText}`}>No exercises added yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={localExercises.map((ex) => ('id' in ex ? ex.id : ex.tempId))}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localExercises.map((ex, index) => {
                  const itemId = 'id' in ex ? ex.id : ex.tempId;
                  return (
                    <SortableExercise
                      key={itemId}
                      ex={ex}
                      itemId={itemId}
                      index={index}
                      total={localExercises.length}
                      onRemove={removeExercise}
                      onUpdate={updateExercise}
                      onMoveUp={moveUp}
                      onMoveDown={moveDown}
                      confirmRemoveId={confirmRemoveId}
                      setConfirmRemoveId={setConfirmRemoveId}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <ExercisePicker exercises={exerciseList} onAdd={addExercise} />
      <ScheduledDays selectedDays={localDays} onToggle={handleToggleDay} />

      <p className={`text-xs mb-4 ${mutedText}`}>* All fields are required before saving</p>

      {/* ── Save / warnings ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSave}
          disabled={!isValid() || !hasChanges() || saveMutation.isPending}
          className="bg-blue-900 hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm transition"
        >
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
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