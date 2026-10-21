"use client";

import { cn } from "@/lib/utils";

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-purple-500 to-violet-600",
  "from-cyan-500 to-sky-600",
  "from-red-500 to-rose-600",
  "from-green-500 to-emerald-600",
  "from-fuchsia-500 to-purple-600",
  "from-yellow-500 to-orange-600",
];

function getAvatarSeed(
  username?: string | null,
  firstName?: string | null,
  lastName?: string | null
) {
  const nameSeed = [firstName, lastName].filter(Boolean).join(" ").trim();
  return username || nameSeed || "FitHub";
}

function getAvatarInitials(
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null
) {
  const firstInitial = firstName?.trim().charAt(0) ?? "";
  const lastInitial = lastName?.trim().charAt(0) ?? "";
  const nameInitials = `${firstInitial}${lastInitial}`.trim().toUpperCase();

  if (nameInitials) {
    return nameInitials;
  }

  if (username?.trim()) {
    return username.trim().slice(0, 2).toUpperCase();
  }

  return "FH";
}

function getAvatarGradient(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index++) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

type UserAvatarProps = {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
  initialsClassName?: string;
};

export default function UserAvatar({
  username,
  firstName,
  lastName,
  className,
  initialsClassName,
}: UserAvatarProps) {
  const seed = getAvatarSeed(username, firstName, lastName);
  const initials = getAvatarInitials(firstName, lastName, username);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-lg shadow-black/20 select-none",
        getAvatarGradient(seed),
        className
      )}
      aria-hidden="true"
    >
      <span className={cn("leading-none", initialsClassName)}>{initials}</span>
    </div>
  );
}
