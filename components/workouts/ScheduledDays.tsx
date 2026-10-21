"use client";

import { WEEK_DAY_OPTIONS } from "@/lib/workout-schedule";
import { useTheme } from "@/context/theme-context";

export function ScheduledDays({
  selectedDays,
  onToggle,
}: {
  selectedDays: string[];
  onToggle: (day: string) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mb-6">
      <h2 className={`mb-2 text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-900"}`}>Scheduled Days</h2>
      <div className="flex gap-2 flex-wrap">
        {WEEK_DAY_OPTIONS.map(({ label, value }) => {
          const selected = selectedDays.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selected
                  ? "bg-blue-900 text-white border-blue-900"
                  : isDark
                    ? "text-gray-300 border-white/15 hover:border-blue-500"
                    : "text-gray-600 border-gray-300 hover:border-blue-900"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
