"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { Share2 } from "lucide-react";

// Decode userId from JWT token stored in localStorage
// When proxy.ts auth is enabled, userId will come from x-user-id header instead
function getUserId(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function fetchProfile(id: string) {
  const userId = getUserId();
  const res = await fetch(`/api/workouts/${id}?userId=${userId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export default function ShareWorkoutPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const MAX_TITLE = 100;
  const MAX_MESSAGE = 500;

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["profile", id],
    queryFn: () => fetchProfile(id),
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const description = message.trim()
        ? `${message.trim()}\n\nShare code: ${profile.shareCode}`
        : `Share code: ${profile.shareCode}`;

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: getUserId(),
          title: title.trim(),
          description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to share workout");
      }

      return res.json();
    },
    onSuccess: () => {
      router.push("/feed");
    },
  });

  const hasChanges = () => title.trim() !== "" || message.trim() !== "";

  const handleBack = () => {
    if (hasChanges()) { setConfirmDiscard(true); } else { router.push("/workouts"); }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (isError || !profile) return <div className="p-8 text-red-500">Failed to load workout.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Share Workout</h1>
        {confirmDiscard ? (
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-gray-600">Discard unsaved changes?</p>
            <button onClick={() => router.push("/workouts")} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">Discard</button>
            <button onClick={() => setConfirmDiscard(false)} className="border border-gray-300 px-3 py-1 rounded text-xs hover:border-gray-500">Cancel</button>
          </div>
        ) : (
          <button onClick={handleBack} className="text-sm text-blue-900 hover:underline">Back to Workouts</button>
        )}
      </div>

      {/* Workout summary */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
        <p className="text-xs text-gray-500 mb-1">Sharing workout</p>
        <p className="font-semibold">{profile.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{profile.exercises?.length ?? 0} exercise{profile.exercises?.length !== 1 ? "s" : ""}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Share code:</span>
          <code className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 font-mono tracking-widest">{profile.shareCode}</code>
        </div>
      </div>

      {/* Post title */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">
            Post Title <span className="text-red-500">*</span>
          </label>
          <span className={"text-xs " + (title.length > MAX_TITLE ? "text-red-500 font-medium" : title.length > MAX_TITLE * 0.85 ? "text-yellow-500" : "text-gray-400")}>
            {title.length}/{MAX_TITLE}
          </span>
        </div>
        <input
          type="text"
          placeholder="e.g. My favourite push day"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={"w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 " + (title.length > MAX_TITLE ? "border-red-400 focus:ring-red-400" : "focus:ring-blue-900")}
        />
      </div>

      {/* Optional message */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">
            Message <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <span className={"text-xs " + (message.length > MAX_MESSAGE ? "text-red-500 font-medium" : message.length > MAX_MESSAGE * 0.85 ? "text-yellow-500" : "text-gray-400")}>
            {message.length}/{MAX_MESSAGE}
          </span>
        </div>
        <textarea
          placeholder="Add a note about this workout..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className={"w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 resize-none " + (message.length > MAX_MESSAGE ? "border-red-400 focus:ring-red-400" : "focus:ring-blue-900")}
        />
      </div>

      {/* Post preview */}
      <div className="border border-dashed border-gray-300 rounded-lg p-4 mb-6">
        <p className="text-xs text-gray-400 mb-2">Post preview</p>
        <p className="font-medium text-sm">{title.trim() || <span className="text-gray-300">Post title...</span>}</p>
        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
          {message.trim() ? `${message.trim()}\n\nShare code: ${profile.shareCode}` : `Share code: ${profile.shareCode}`}
        </p>
      </div>

      {shareMutation.isError && (
        <p className="text-red-500 text-sm mb-4">
          {shareMutation.error instanceof Error ? shareMutation.error.message : "Something went wrong."}
        </p>
      )}

      <p className="text-xs text-gray-400 mb-4">* Required before sharing</p>

      <button
        onClick={() => shareMutation.mutate()}
        disabled={!title.trim() || title.length > MAX_TITLE || message.length > MAX_MESSAGE || shareMutation.isPending}
        className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm"
      >
        <Share2 className="w-4 h-4" />
        {shareMutation.isPending ? "Sharing..." : "Share Workout"}
      </button>
    </div>
  );
}