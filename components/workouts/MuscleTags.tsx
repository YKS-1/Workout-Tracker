"use client";

const MUSCLE_TAGS = ['chest', 'legs', 'shoulders', 'back', 'arms', 'core', 'cardio'];

export function MuscleTags({ exercises }: { exercises: { type: string; muscleGroup: string | null }[] }) {
  const autoTags = () => {
    const tags = new Set<string>();
    for (const ex of exercises) {
      if (ex.type === 'cardio') tags.add('cardio');
      if (ex.type === 'weights' && ex.muscleGroup) tags.add(ex.muscleGroup);
    }
    return Array.from(tags);
  };

  const tags = autoTags();

  if (tags.length === 0) return null;

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2">Muscle Groups</label>
      <div className="flex gap-2 flex-wrap">
        {tags.map((tag) => (
          <span key={tag} className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}