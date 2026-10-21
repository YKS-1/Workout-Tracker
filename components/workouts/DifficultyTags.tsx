"use client";

import { useTheme } from "@/context/theme-context";

const DIFFICULTY_TAGS = ['casual', 'moderate', 'intense'];

export function DifficultyTags({
  selectedTags,
  onToggle,
}: {
  selectedTags: string[];
  onToggle: (tag: string) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mb-6">
      <label className={`mb-2 block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-900"}`}>Difficulty</label>
      <div className="flex gap-2">
        {DIFFICULTY_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`px-3 py-1 rounded-full text-xs border ${
              selectedTags.includes(tag)
                ? "bg-blue-900 text-white border-blue-900"
                : isDark
                  ? "text-gray-300 border-white/15 hover:border-blue-500"
                  : "text-gray-600 border-gray-300 hover:border-blue-900"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
