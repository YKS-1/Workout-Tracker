"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dumbbell, BarChart2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthSnapshot } from "@/lib/auth-store";
import { useTheme } from "@/context/theme-context";
import { formatMonthDay, parseLocalDate } from "@/lib/workout-schedule";
import type { AnalyticsResponse, ExerciseAnalytics } from "@/app/types/workout";

// ─── metric types ─────────────────────────────────────────────────────────────

type WeightsMetric = "weight" | "volume";
type CardioMetric = "duration" | "distance";

function getChartValue(
  point: ExerciseAnalytics["history"][number],
  exercise: ExerciseAnalytics,
  weightsMetric: WeightsMetric,
  cardioMetric: CardioMetric,
): number | null {
  if (exercise.type === "weights") {
    return weightsMetric === "weight" ? point.weight : point.volume;
  }
  return cardioMetric === "duration" ? point.duration : point.distance;
}

function getYAxisLabel(exercise: ExerciseAnalytics, metric: WeightsMetric | CardioMetric) {
  if (exercise.type === "weights") {
    return metric === "weight" ? "Weight (kg/lbs)" : "Volume (sets × reps × weight)";
  }
  return metric === "duration" ? "Duration (min)" : "Distance";
}

// ─── chart helpers ────────────────────────────────────────────────────────────

function formatXAxisDate(dateStr: string) {
  return formatMonthDay(parseLocalDate(dateStr));
}

function SectionHeading({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <p className={`text-xs font-bold tracking-widest uppercase mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
      {label}
    </p>
  );
}

function ChartCard({
  children,
  className,
  isDark,
}: {
  children: React.ReactNode;
  className?: string;
  isDark: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-5 py-5 border ${
        isDark ? "bg-[#111827] border-white/8" : "bg-white border-gray-200"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function tooltipStyle(isDark: boolean) {
  return {
    contentStyle: isDark
      ? {
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          color: "#f1f5f9",
          fontSize: "12px",
        }
      : {
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          color: "#111827",
          fontSize: "12px",
        },
    labelStyle: isDark ? { color: "#94a3b8" } : { color: "#6b7280" },
  };
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard({ height = 280, isDark }: { height?: number; isDark: boolean }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border ${
        isDark ? "bg-white/5 border-white/8" : "bg-gray-100 border-gray-200"
      }`}
      style={{ height }}
    />
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className={`w-14 h-14 rounded-full border flex items-center justify-center mb-4 ${
          isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
        }`}
      >
        <BarChart2 size={24} className={isDark ? "text-gray-500" : "text-gray-400"} />
      </div>
      <p className={`font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
        No workout data yet
      </p>
      <p className={`text-sm mb-5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        Log your first session to start seeing your progress here.
      </p>
      <Link
        href="/workouts"
        className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition"
      >
        Go to Workouts
      </Link>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const { userId, token, isAuthenticated } = useAuthSnapshot();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [selectedExerciseName, setSelectedExerciseName] = useState<string>("");
  const [weightsMetric, setWeightsMetric] = useState<WeightsMetric>("weight");
  const [cardioMetric, setCardioMetric] = useState<CardioMetric>("duration");

  const { data: analytics, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["analytics", userId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!userId && !!token,
    staleTime: 5 * 60 * 1000,
  });

  // Auth redirect — must be a useEffect so it runs after all hooks
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const isEmpty =
    analytics &&
    analytics.exercises.length === 0 &&
    analytics.weeklySummaries.every((w) => w.sessionCount === 0);

  // Pickable exercises: exclude rest, sort A→Z
  const pickableExercises = useMemo(() => {
    if (!analytics) return [];
    return analytics.exercises
      .filter((e) => e.type !== "rest")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [analytics]);

  const resolvedName =
    selectedExerciseName || (pickableExercises.length > 0 ? pickableExercises[0].name : "");

  const selectedExercise = pickableExercises.find((e) => e.name === resolvedName) ?? null;

  const progressionData = useMemo(() => {
    if (!selectedExercise) return [];
    return selectedExercise.history.map((point) => ({
      date: point.date,
      value: getChartValue(point, selectedExercise, weightsMetric, cardioMetric),
    }));
  }, [selectedExercise, weightsMetric, cardioMetric]);

  const frequencyData = (analytics?.weeklySummaries.slice(-8) ?? []).map((w) => ({
    label: formatMonthDay(parseLocalDate(w.weekStart)),
    sessions: w.sessionCount,
  }));

  const calorieData = (analytics?.weeklySummaries.slice(-8) ?? []).map((w) => ({
    label: formatMonthDay(parseLocalDate(w.weekStart)),
    calories: Math.round(w.totalCalories),
  }));

  const muscleData = useMemo(() => {
    if (!analytics) return [];
    return analytics.muscleGroupBreakdown
      .filter((m) => m.muscleGroup !== "unknown" || analytics.muscleGroupBreakdown.length === 1)
      .map((m) => ({
        group: m.muscleGroup.charAt(0).toUpperCase() + m.muscleGroup.slice(1),
        sessions: m.sessionCount,
      }));
  }, [analytics]);

  // Guard: all hooks have been called above, safe to bail out now
  if (!isAuthenticated) return null;

  // ─── derived chart style tokens ───────────────────────────────────────────
  const gridStroke = isDark ? "#374151" : "#e5e7eb";
  const tickFill = isDark ? "#6b7280" : "#9ca3af";
  const yAxisLabelColor = isDark ? "text-gray-500" : "text-gray-400";
  const emptyChartColor = isDark ? "text-gray-600" : "text-gray-400";
  const muscleYAxisTick = isDark ? "#d1d5db" : "#374151";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#0d1117] text-white" : "bg-slate-50 text-gray-900"}`}>
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-blue-500/15" : "bg-blue-50"}`}>
            <BarChart2 size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Analytics</h1>
            <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Your training progress at a glance
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SkeletonCard height={340} isDark={isDark} />
            <SkeletonCard height={340} isDark={isDark} />
            <SkeletonCard height={280} isDark={isDark} />
            <SkeletonCard height={280} isDark={isDark} />
          </div>
        )}

        {/* Empty */}
        {!isLoading && isEmpty && <EmptyState isDark={isDark} />}

        {!isLoading && !isEmpty && analytics && (
          <div className="flex flex-col gap-5">

            {/* ── Chart 1: Exercise Progression ── */}
            <div>
              <SectionHeading label="Exercise Progression" isDark={isDark} />
              <ChartCard isDark={isDark}>
                {/* Controls row */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <select
                    value={resolvedName}
                    onChange={(e) => setSelectedExerciseName(e.target.value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm focus:outline-none transition ${
                      isDark
                        ? "border-white/10 bg-white/5 text-white focus:border-blue-500"
                        : "border-gray-200 bg-white text-gray-900 focus:border-blue-500"
                    }`}
                  >
                    {pickableExercises.map((ex) => (
                      <option
                        key={ex.exerciseId ?? ex.name}
                        value={ex.name}
                        className={isDark ? "bg-[#111827]" : "bg-white"}
                      >
                        {ex.name}
                      </option>
                    ))}
                  </select>

                  {selectedExercise?.type === "weights" && (
                    <div className={`flex rounded-xl overflow-hidden border ${isDark ? "border-white/10" : "border-gray-200"}`}>
                      {(["weight", "volume"] as WeightsMetric[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setWeightsMetric(m)}
                          className={`px-4 py-2 text-xs font-semibold transition ${
                            weightsMetric === m
                              ? "bg-blue-600 text-white"
                              : isDark
                              ? "bg-[#0d1117] text-gray-400 hover:text-white"
                              : "bg-white text-gray-500 hover:text-gray-900"
                          }`}
                        >
                          {m === "weight" ? "Weight" : "Volume"}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedExercise?.type === "cardio" && (
                    <div className={`flex rounded-xl overflow-hidden border ${isDark ? "border-white/10" : "border-gray-200"}`}>
                      {(["duration", "distance"] as CardioMetric[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setCardioMetric(m)}
                          className={`px-4 py-2 text-xs font-semibold transition ${
                            cardioMetric === m
                              ? "bg-blue-600 text-white"
                              : isDark
                              ? "bg-[#0d1117] text-gray-400 hover:text-white"
                              : "bg-white text-gray-500 hover:text-gray-900"
                          }`}
                        >
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedExercise && (
                    <span className={`ml-auto text-xs ${yAxisLabelColor}`}>
                      {getYAxisLabel(
                        selectedExercise,
                        selectedExercise.type === "weights" ? weightsMetric : cardioMetric,
                      )}
                    </span>
                  )}
                </div>

                {progressionData.length === 0 || !selectedExercise ? (
                  <div className={`flex items-center justify-center h-52 text-sm ${emptyChartColor}`}>
                    No logged data for this exercise yet.
                  </div>
                ) : progressionData.length === 1 ? (
                  <div className="flex flex-col items-center justify-center h-52 gap-1">
                    <Dumbbell size={20} className={emptyChartColor} />
                    <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      Only one session logged. Log another to see a trend.
                    </p>
                    <p className={`text-lg font-bold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {progressionData[0].date} — {progressionData[0].value ?? "—"}
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={progressionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatXAxisDate}
                        tick={{ fill: tickFill, fontSize: 11 }}
                        axisLine={{ stroke: gridStroke }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: tickFill, fontSize: 11 }}
                        axisLine={{ stroke: gridStroke }}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip
                        {...tooltipStyle(isDark)}
                        labelFormatter={formatXAxisDate}
                        formatter={(value) => [value ?? "—", "Value"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#60a5fa", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* ── Charts 2 & 3: Frequency + Calories (side by side on large screens) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <div>
                <SectionHeading label="Weekly Sessions" isDark={isDark} />
                <ChartCard isDark={isDark}>
                  {frequencyData.every((d) => d.sessions === 0) ? (
                    <div className={`flex items-center justify-center h-52 text-sm ${emptyChartColor}`}>
                      No sessions in the last 8 weeks.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={frequencyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: tickFill, fontSize: 11 }}
                          axisLine={{ stroke: gridStroke }}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: tickFill, fontSize: 11 }}
                          axisLine={{ stroke: gridStroke }}
                          tickLine={false}
                          width={30}
                        />
                        <Tooltip {...tooltipStyle(isDark)} formatter={(v) => [v, "Sessions"]} />
                        <Bar dataKey="sessions" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

              {/* ── Chart 3: Calories Burned ── */}
              <div>
                <SectionHeading label="Estimated Calories Burned" isDark={isDark} />
                <ChartCard isDark={isDark}>
                  {calorieData.every((d) => d.calories === 0) ? (
                    <div className={`flex items-center justify-center h-52 text-sm ${emptyChartColor}`}>
                      No calorie data in the last 8 weeks.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={calorieData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: tickFill, fontSize: 11 }}
                          axisLine={{ stroke: gridStroke }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: tickFill, fontSize: 11 }}
                          axisLine={{ stroke: gridStroke }}
                          tickLine={false}
                          width={45}
                        />
                        <Tooltip {...tooltipStyle(isDark)} formatter={(v) => [v, "kcal"]} />
                        <Area
                          type="monotone"
                          dataKey="calories"
                          stroke="#34d399"
                          strokeWidth={2}
                          fill="#34d399"
                          fillOpacity={0.12}
                          dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>

            </div>

            {/* ── Chart 4: Muscle Group Distribution ── */}
            {muscleData.length > 0 && (
              <div>
                <SectionHeading label="Muscle Group Distribution" isDark={isDark} />
                <ChartCard isDark={isDark}>
                  <ResponsiveContainer width="100%" height={Math.max(180, muscleData.length * 42)}>
                    <BarChart
                      layout="vertical"
                      data={muscleData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: tickFill, fontSize: 11 }}
                        axisLine={{ stroke: gridStroke }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="group"
                        tick={{ fill: muscleYAxisTick, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip {...tooltipStyle(isDark)} formatter={(v) => [v, "Sessions"]} />
                      <Bar dataKey="sessions" fill="#f472b6" radius={[0, 4, 4, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
