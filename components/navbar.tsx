"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart2,
  Bot,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { notifyAuthStoreChanged, useAuthSnapshot } from "@/lib/auth-store";
import UserAvatar from "@/components/user-avatar";
import { useTheme } from "@/context/theme-context";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);

const DASHBOARD_LINK = { href: "/dashboard", label: "Dashboard", icon: Home };

const APP_LINKS = [
  DASHBOARD_LINK,
  { href: "/feed", label: "Feed", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/workouts", label: "Workouts", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/ai", label: "AI Coach", icon: Bot },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, username, firstName, lastName } = useAuthSnapshot();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const isPublicRoute = PUBLIC_PATHS.has(pathname);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    notifyAuthStoreChanged();
    setMenuOpen(false);
    router.push("/login");
    router.refresh();
  };

  const desktopAuthLinks = isAuthenticated
    ? [
        username
          ? {
              href: `/profile/${username}`,
              label: username,
              isProfile: true,
              isPrimary: false,
            }
          : {
              href: "/dashboard",
              label: "Dashboard",
              isProfile: false,
              isPrimary: false,
            },
      ]
    : [
        { href: "/login", label: "Sign In", isProfile: false, isPrimary: false },
        { href: "/signup", label: "Sign Up", isProfile: false, isPrimary: true },
      ];

  const mobileLinks = isPublicRoute
    ? isAuthenticated
      ? [
          { href: DASHBOARD_LINK.href, label: DASHBOARD_LINK.label },
          ...(username ? [{ href: `/profile/${username}`, label: "Profile" }] : []),
        ]
      : [
          { href: "/login", label: "Sign In" },
          { href: "/signup", label: "Sign Up" },
        ]
    : [
        ...APP_LINKS.map(({ href, label }) => ({ href, label })),
        ...(username ? [{ href: `/profile/${username}`, label: "Profile" }] : []),
      ];

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-md ${
        isDark
          ? "border-white/10 bg-[#111827]/95 text-white"
          : "border-slate-200 bg-white/90 text-slate-900"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4 md:grid md:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center">
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className={`flex items-center gap-2 font-bold text-base ${
              isDark ? "text-white" : "text-blue-900"
            }`}
          >
            <Dumbbell size={20} />
            <span>FitHub</span>
          </Link>
        </div>

        {!isPublicRoute && (
          <div className="hidden md:flex items-center justify-center gap-1">
            {APP_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = isActivePath(pathname, href);
              const isDashboardIconOnly = href === DASHBOARD_LINK.href;

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  title={label}
                  className={`flex items-center rounded-lg text-sm transition ${
                    isDashboardIconOnly ? "justify-center px-2.5 py-2" : "gap-1.5 px-3 py-2"
                  } ${
                    isActive
                      ? isDark
                        ? "bg-white/10 text-white"
                        : "bg-slate-100 text-blue-900"
                      : isDark
                        ? "text-gray-400 hover:bg-white/6 hover:text-white"
                        : "text-slate-500 hover:bg-slate-50 hover:text-blue-900"
                  }`}
                >
                  <Icon size={14} />
                  {!isDashboardIconOnly && label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="hidden md:flex items-center gap-2">
          {desktopAuthLinks.map((item) => {
            if (item.isProfile) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    isDark
                      ? "text-gray-300 hover:bg-white/8 hover:text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-blue-900"
                  }`}
                >
                  <UserAvatar
                    username={username}
                    firstName={firstName}
                    lastName={lastName}
                    className="h-7 w-7 text-[10px]"
                  />
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "px-4 py-2 rounded-lg text-sm font-medium transition " +
                  (item.isPrimary
                    ? "bg-blue-900 text-white hover:bg-blue-950"
                    : isDark
                    ? "text-gray-300 hover:bg-white/8 hover:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-blue-900")
                }
              >
                {item.label}
              </Link>
            );
          })}

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSignOut}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                isDark
                  ? "text-gray-500 hover:bg-white/5 hover:text-red-400"
                  : "text-slate-500 hover:bg-slate-50 hover:text-red-500"
              }`}
            >
              <LogOut size={14} />
              Sign out
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`md:hidden p-2 rounded-lg transition ${
            isDark
              ? "text-gray-400 hover:bg-white/8 hover:text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-blue-900"
          }`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {menuOpen && (
        <div
          className={`md:hidden border-t px-6 py-3 flex flex-col gap-1 ${
            isDark ? "border-white/10" : "border-slate-200"
          }`}
        >
          {mobileLinks.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm transition ${
                  isDark
                    ? isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/6 hover:text-white"
                    : isActive
                    ? "bg-slate-100 text-blue-900"
                    : "text-slate-700 hover:bg-slate-50 hover:text-blue-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSignOut}
              className={`px-3 py-2.5 rounded-lg text-left text-sm transition ${
                isDark ? "text-red-400 hover:bg-white/5" : "text-red-500 hover:bg-slate-50"
              }`}
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
