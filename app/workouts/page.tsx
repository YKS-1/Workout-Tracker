"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CheckCircle2, RotateCcw, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { filterProfiles, sortProfiles } from "@/lib/workoutUtils";
import { WorkoutCompletion, WorkoutProfileSummary } from "@/app/types/workout";
import { formatLocalDate, formatMonthDay, getDayLabel, parseLocalDate } from "@/lib/workout-schedule";
import { useAuthSnapshot } from "@/lib/auth-store";
import { useTheme } from "@/context/theme-context";

const DIFFICULTY_TAGS = ['casual', 'moderate', 'intense'];
const MUSCLE_TAGS = ['chest', 'legs', 'shoulders', 'back', 'arms', 'core', 'cardio'];
const PROFILES_PER_PAGE = 10;
const SORT_OPTIONS = ['name', 'date created', 'exercise count'];

async function fetchProfiles(userId: string, token: string): Promise<WorkoutProfileSummary[] | null> {
  try {
    const res = await fetch(`/api/workouts?userId=${userId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchCompletions(userId: string, token: string): Promise<WorkoutCompletion[] | null> {
  try {
    const res = await fetch(`/api/workouts/completions?userId=${userId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getWorkoutTagPillClass(tag: string, isDark: boolean) {
  const palette: Record<string, string> = {
    casual: isDark
      ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200",
    moderate: isDark
      ? "bg-amber-500/15 text-amber-200 border border-amber-400/20"
      : "bg-amber-50 text-amber-700 border border-amber-200",
    intense: isDark
      ? "bg-rose-500/15 text-rose-200 border border-rose-400/20"
      : "bg-rose-50 text-rose-700 border border-rose-200",
    chest: isDark
      ? "bg-sky-500/15 text-sky-200 border border-sky-400/20"
      : "bg-sky-50 text-sky-700 border border-sky-200",
    legs: isDark
      ? "bg-orange-500/15 text-orange-200 border border-orange-400/20"
      : "bg-orange-50 text-orange-700 border border-orange-200",
    shoulders: isDark
      ? "bg-indigo-500/15 text-indigo-200 border border-indigo-400/20"
      : "bg-indigo-50 text-indigo-700 border border-indigo-200",
    back: isDark
      ? "bg-cyan-500/15 text-cyan-200 border border-cyan-400/20"
      : "bg-cyan-50 text-cyan-700 border border-cyan-200",
    arms: isDark
      ? "bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/20"
      : "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200",
    core: isDark
      ? "bg-violet-500/15 text-violet-200 border border-violet-400/20"
      : "bg-violet-50 text-violet-700 border border-violet-200",
    cardio: isDark
      ? "bg-red-500/15 text-red-200 border border-red-400/20"
      : "bg-red-50 text-red-700 border border-red-200",
  };

  return palette[tag] ?? (isDark ? "bg-white/8 text-gray-300 border border-white/10" : "bg-gray-100 text-gray-600 border border-gray-200");
}

export default function WorkoutsPage() {
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("date created");

  const router = useRouter();
  const [importCode, setImportCode] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isAuthenticated, userId, token } = useAuthSnapshot();
  const { theme } = useTheme();

  const isDark = theme === "dark";

  const pageBg = isDark ? "text-white" : "text-gray-900";
  const headingText = isDark ? "text-white" : "text-gray-900";
  const mutedText = isDark ? "text-gray-500" : "text-gray-400";
  const secondaryText = isDark ? "text-gray-400" : "text-gray-500";

  // Cards
  const cardBorder = isDark
    ? "border-white/10 hover:border-white/25"
    : "border-gray-300 hover:border-blue-900";
  const cardBg = isDark ? "bg-[#111827]" : "bg-white";

  // Delete confirm overlay
  const deleteOverlayBg = isDark ? "bg-[#111827]" : "bg-white";

  // Inputs & selects
  const inputClass = isDark
    ? "bg-[#162033] border-white/10 text-white placeholder-gray-500 focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-900";

  // Filter tag buttons
  const tagSelected = "bg-blue-900 text-white border-blue-900";

  const tagActive = isDark
    ? "text-gray-300 border-white/15 hover:border-blue-500"
    : "text-gray-600 border-gray-300 hover:border-blue-900";
  const tagDisabled = isDark
    ? "text-gray-700 border-white/5 cursor-not-allowed"
    : "text-gray-300 border-gray-200 cursor-not-allowed";

  // Workout tag pill (difficulty / muscle on card)
  // Scheduled day pill on card
  const scheduledDayPill = isDark
    ? "bg-blue-900/20 text-blue-300"
    : "bg-blue-50 text-blue-900";

  // Import input
  const importInput = isDark
    ? "bg-[#111827] border-white/10 text-white placeholder-gray-600 focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 focus:ring-blue-900";

  // Import button
  const importBtn = isDark
    ? "bg-white/8 hover:bg-white/12 text-gray-200 disabled:opacity-50"
    : "bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50";

  // Ghost / outline button (cancel, undo, pagination)
  const ghostBtn = isDark
    ? "border-white/10 text-gray-400 hover:border-white/25 hover:text-white"
    : "border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900";

  // Pagination active page
  const pageActive = "bg-blue-900 text-white border-blue-900";

  // Empty state ghost card border
  const emptyCardBorder = isDark ? "border-white/5" : "border-dashed border-gray-300";

  // Section label
  const sectionLabel = isDark ? "text-gray-500" : "text-gray-500";


  const { data: profiles, isLoading, isError } = useQuery<WorkoutProfileSummary[] | null>({
    queryKey: ["profiles", userId],
    queryFn: () => fetchProfiles(userId!, token!),
    enabled: !!userId && !!token,
  });

  const { data: completions } = useQuery<WorkoutCompletion[] | null>({
    queryKey: ["workout-completions", userId],
    queryFn: () => fetchCompletions(userId!, token!),
    enabled: !!userId && !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: string): Promise<null> => {
      try {
        await fetch(`/api/workouts/${profileId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        });
      } catch {
        // ignore
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", userId] });
      setConfirmDeleteId(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (): Promise<null> => {
      const res = await fetch("/api/workouts/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, shareCode: importCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import workout");
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles", userId] });
      setImportCode("");
      setImportError(null);
      setImportSuccess("Workout imported successfully!");
      setTimeout(() => setImportSuccess(null), 3000);
    },
    onError: (error: Error) => {
      setImportError(error.message);
      setTimeout(() => setImportError(null), 3000);
    },
  });

  const undoCompletionMutation = useMutation({
    mutationFn: async (profileId: string): Promise<null> => {
      const res = await fetch("/api/workouts/completions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          profileId,
          completedOn: formatLocalDate(new Date()),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to undo workout completion");
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-completions", userId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-completions", userId] });
    },
  });

  const profileList = profiles ?? [];
  const completionList = completions ?? [];
  const todayDate = formatLocalDate(new Date());
  const latestCompletionByProfileId = new Map<string, WorkoutCompletion>();

  for (const completion of completionList) {
    if (!latestCompletionByProfileId.has(completion.profileId)) {
      latestCompletionByProfileId.set(completion.profileId, completion);
    }
  }

  const completedTodayByProfileId = new Set(
    completionList
      .filter((c) => c.completedOn === todayDate)
      .map((c) => c.profileId)
  );

  const existingTags = new Set(profileList.flatMap((p) => p.tags ?? []));

  const toggleDifficulty = (tag: string) => {
    setSelectedDifficulty((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  const toggleMuscle = (tag: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedDifficulty([]);
    setSelectedMuscles([]);
    setPage(1);
  };

  const hasActiveFilters = search || selectedDifficulty.length > 0 || selectedMuscles.length > 0;
  const filtered = filterProfiles(profileList, search, selectedDifficulty, selectedMuscles);
  const sorted = sortProfiles(filtered, sortBy);
  const totalPages = Math.ceil(sorted.length / PROFILES_PER_PAGE);
  const paginated = sorted.slice((page - 1) * PROFILES_PER_PAGE, page * PROFILES_PER_PAGE);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen p-8 max-w-3xl mx-auto ${pageBg}`}>
        <div className={`rounded-3xl border px-8 py-12 text-center ${cardBg} ${isDark ? "border-white/10" : "border-gray-200"}`}>
          <h1 className={`text-2xl font-bold ${headingText}`}>
            Sign in to manage your workouts
          </h1>
          <p className={`mt-2 text-sm ${mutedText}`}>
            Your routines and workout logs will show up here once you&apos;re signed in.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen p-8 ${pageBg}`}>
        <p className={mutedText}>Loading...</p>
      </div>
    );
  }

  if (isError || profiles === null) {
    return (
      <div className={`min-h-screen p-8 ${pageBg}`}>
        <p className="text-red-500">Failed to load workouts.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 max-w-6xl mx-auto ${pageBg}`}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-3xl font-bold ${headingText}`}>My Workouts</h1>
          <p className={`text-xs mt-1 ${mutedText}`}>
            {filtered.length} of {profileList.length} workout{profileList.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter code..."
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                className={`w-32 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 ${importInput}`}
              />
              <button
                onClick={() => importMutation.mutate()}
                disabled={!importCode.trim() || importMutation.isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:cursor-not-allowed ${importBtn}`}
              >
                {importMutation.isPending ? "..." : "Import"}
              </button>
            </div>
            {importError && <p className="text-xs text-red-500">{importError}</p>}
            {importSuccess && <p className="text-xs text-green-500">{importSuccess}</p>}
          </div>
          <Link
            href="/workouts/create"
            className="bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Create Workout
          </Link>
        </div>
      </div>

      {/* ── Search + sort ── */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or tag..."
          value={search}
          onChange={handleSearchChange}
          className={`flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
        />
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className={`border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* ── Difficulty filter ── */}
      <div className="mb-4">
        <p className={`text-xs mb-1 ${sectionLabel}`}>Difficulty</p>
        <div className="flex gap-2 flex-wrap">
          {DIFFICULTY_TAGS.map((tag) => {
            const exists = existingTags.has(tag);
            const selected = selectedDifficulty.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => exists && toggleDifficulty(tag)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  selected ? tagSelected : exists ? tagActive : tagDisabled
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Muscle group filter ── */}
      <div className="mb-2">
        <p className={`text-xs mb-1 ${sectionLabel}`}>Muscle Group</p>
        <div className="flex gap-2 flex-wrap">
          {MUSCLE_TAGS.map((tag) => {
            const exists = existingTags.has(tag);
            const selected = selectedMuscles.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => exists && toggleMuscle(tag)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  selected ? tagSelected : exists ? tagActive : tagDisabled
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mb-4">
          <button onClick={clearFilters} className="text-xs text-blue-500 hover:underline">
            Clear all filters
          </button>
        </div>
      )}

      {/* ── Empty states ── */}
      {profileList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className={`font-medium mb-2 ${secondaryText}`}>No workouts yet</p>
          <p className={`text-sm mb-4 ${mutedText}`}>Create your first workout to get started</p>
          <Link
            href="/workouts/create"
            className="bg-blue-900 hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Create Workout
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className={`font-medium mb-2 ${secondaryText}`}>No workouts match your search</p>
          <button onClick={clearFilters} className="text-sm text-blue-500 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* ── Workout cards grid ── */}
          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {paginated.map((profile) => (
              <div
                key={profile.profileId}
                className={`relative border rounded-lg min-h-[11rem] transition-colors ${cardBg} ${cardBorder}`}
              >
                {confirmDeleteId === profile.profileId ? (
                  <div className={`absolute inset-0 rounded-lg flex flex-col items-center justify-center gap-2 p-2 ${deleteOverlayBg}`}>
                    <p className={`text-xs text-center font-medium ${headingText}`}>
                      Delete this workout?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteMutation.mutate(profile.profileId)}
                        disabled={deleteMutation.isPending}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50 transition"
                      >
                        {deleteMutation.isPending ? "..." : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className={`border px-3 py-1 rounded text-xs transition ${ghostBtn}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const isCompletedToday = completedTodayByProfileId.has(profile.profileId);
                      const latestCompletion = latestCompletionByProfileId.get(profile.profileId);
                      const scheduledDayLabels = (profile.scheduledDays ?? []).map((day) => getDayLabel(day));

                      return (
                        <>
                          <button
                            onClick={(e) => { e.preventDefault(); setConfirmDeleteId(profile.profileId); }}
                            className={`absolute top-2 right-2 transition-colors ${mutedText} hover:text-red-500`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <Link
                            href={`/workouts/${profile.profileId}`}
                            className="flex flex-col justify-between p-4 h-full"
                          >
                            <div>
                              <p className={`font-medium text-sm truncate pr-6 ${headingText}`}>
                                {profile.name}
                              </p>
                              {profile.exerciseCount !== undefined && (
                                <p className={`text-xs mt-0.5 ${mutedText}`}>
                                  {profile.exerciseCount} exercise{profile.exerciseCount !== 1 ? "s" : ""}
                                  {profile.estimatedCalories !== undefined && ` · ~${profile.estimatedCalories} cal`}
                                </p>
                              )}
                              {latestCompletion && (
                                <p className={`mt-1 text-[11px] ${mutedText}`}>
                                  Last logged {formatMonthDay(parseLocalDate(latestCompletion.completedOn))}
                                </p>
                              )}

                              {/* Tag pills */}
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {(() => {
                                  const difficultyTag = profile.tags?.find((t) => DIFFICULTY_TAGS.includes(t));
                                  const muscleTag = profile.tags?.find((t) => MUSCLE_TAGS.includes(t));
                                  const totalTags = (profile.tags ?? []).length;
                                  const visibleCount = (difficultyTag ? 1 : 0) + (muscleTag ? 1 : 0);
                                  const overflow = totalTags - visibleCount;
                                  return (
                                    <>
                                      {difficultyTag && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getWorkoutTagPillClass(difficultyTag, isDark)}`}>
                                          {difficultyTag}
                                        </span>
                                      )}
                                      {muscleTag && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getWorkoutTagPillClass(muscleTag, isDark)}`}>
                                          {muscleTag}
                                        </span>
                                      )}
                                      {overflow > 0 && (
                                        <span className={`text-xs ${mutedText}`}>+{overflow}</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Scheduled day pills */}
                              {scheduledDayLabels.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {scheduledDayLabels.map((day) => (
                                    <span
                                      key={`${profile.profileId}-${day}`}
                                      className={`text-[10px] px-2 py-0.5 rounded-full ${scheduledDayPill}`}
                                    >
                                      {day}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Card footer */}
                            <div className="flex items-end justify-between gap-2 mt-3">
                              <span className="text-xs text-blue-500">View →</span>
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    router.push(`/workouts/${profile.profileId}/log?date=${todayDate}`);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition ${
                                    isCompletedToday
                                      ? "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                                      : "bg-blue-900 text-white hover:bg-blue-950"
                                  }`}
                                  title={isCompletedToday ? "Edit today's workout log" : "Log this workout"}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isCompletedToday ? "Edit log" : "Log workout"}
                                </button>
                                {isCompletedToday && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      undoCompletionMutation.mutate(profile.profileId);
                                    }}
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition ${ghostBtn}`}
                                    title="Remove today's log"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Remove
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.preventDefault(); router.push(`/workouts/share/${profile.profileId}`); }}
                                  className="text-blue-500 hover:text-blue-400 transition"
                                  title="Share workout"
                                >
                                  <Share2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </Link>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            ))}

            {/* Ghost filler cards */}
            {Array.from({ length: PROFILES_PER_PAGE - paginated.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={`border rounded-lg min-h-[11rem] ${emptyCardBorder}`}
              />
            ))}
          </div>
          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1 border rounded-lg text-sm disabled:opacity-50 transition ${ghostBtn}`}
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 border rounded-lg text-sm transition ${
                    page === p ? pageActive : ghostBtn
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1 border rounded-lg text-sm disabled:opacity-50 transition ${ghostBtn}`}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
