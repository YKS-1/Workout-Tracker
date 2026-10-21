"use client";
import { useState } from "react";
import { Dumbbell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifyAuthStoreChanged } from "@/lib/auth-store";
import { useTheme } from "@/context/theme-context";

export default function Page() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pageBg = isDark ? "bg-[#0d1117] text-white" : "bg-white text-slate-900";
  const cardBg = isDark ? "bg-[#111827]" : "bg-white";
  const inputBg = isDark
    ? "bg-[#0d1117] border-white/10 text-white placeholder-gray-500"
    : "bg-white border-gray-300 text-slate-900";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.userId);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("firstName", data.user.firstName);
      localStorage.setItem("lastName", data.user.lastName);
      notifyAuthStoreChanged();

      router.push(`/profile/${data.user.username}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex min-h-[calc(100vh-4rem)] transition ${pageBg}`}>

      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/fitness1.jpeg"
          alt="Fitness"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl mb-4">Transform Your Body</h1>
          <p className="text-xl opacity-90">Start your fitness journey today</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className={`flex-1 flex items-center justify-center p-8 min-h-[calc(100vh-4rem)] ${cardBg}`}>
        <div className="w-full max-w-md">

          {/* LOGO */}
          <div className="flex items-center justify-center mb-8">
            <Dumbbell className="w-8 h-8 text-blue-500 mr-2" />
            <span className="text-2xl font-semibold">FitHub</span>
          </div>

          {/* TITLE */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
            <p className={mutedText}>Please enter your details to sign in</p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
              />
            </div>

            {/* ERROR */}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* SIGNUP LINK */}
          <p className={`mt-6 text-center text-sm ${mutedText}`}>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-blue-500 hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
