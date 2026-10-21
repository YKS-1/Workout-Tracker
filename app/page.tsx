"use client";
import Link from "next/link";
import { Dumbbell, Calendar, BarChart3, Users, BookOpen, Tag } from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { twMerge } from "tailwind-merge";

export default function Page() {
  const features = [
    {
      icon: <Dumbbell className="w-6 h-6" />,
      title: "Workout Library",
      desc: "Browse pre-made routines or build your own. Tagged by intensity: light, medium, and heavy.",
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Gym Calendar",
      desc: "Track every gym day with a built-in calendar. Never lose your streak.",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Visual Analytics",
      desc: "Set a goal. Watch your progress. Get clear stats on what you've hit and what's next.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Social Feed",
      desc: "Follow friends, like and comment on routines, and discover new workouts from your community.",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Custom Routines",
      desc: "Create and share your own workout plans. Build a profile others can follow.",
    },
    {
      icon: <Tag className="w-6 h-6" />,
      title: "Tag-Based Discovery",
      desc: "Filter workouts by tags — find exactly what fits your energy level today.",
    },
  ];

	const {theme} = useTheme();

  return (
    <div className={twMerge("min-h-screen font-sans", theme === "dark" ? "bg-[#0d1117] text-white" : "bg-white text-slate-900")}>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/fitness1.jpeg"
            alt="Fitness"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-950/75" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-40 flex flex-col items-center text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Your Fitness Journey,<br />
            <span className="text-blue-300">All In One Place</span>
          </h1>
          <p className="text-lg text-white/75 max-w-2xl mb-10">
            Log workouts, track your gym streak, hit your goals, and connect with a community that keeps you accountable.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/signup"
              className="bg-white text-blue-900 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="border border-white/40 text-white font-medium px-8 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm backdrop-blur-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className={twMerge('py-28 px-6 transition', theme === 'dark' ? 'bg-[#0d1117]' : 'bg-white')}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={twMerge('text-4xl font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-gray-900')}>Everything You Need</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              FitHub brings together workout tracking, analytics, and social features in one clean app.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={twMerge('p-7 rounded-2xl border shadow-sm hover:shadow-md transition-shadow', theme === 'dark' ? 'bg-[#111827] border-white/10 shadow-black/20' : 'bg-white border-gray-100 ')}
              >
                <div className="w-11 h-11 bg-blue-900 rounded-xl flex items-center justify-center text-white mb-5">
                  {f.icon}
                </div>
                <h3 className={twMerge("text-lg font-semibold mb-2", theme === 'dark' ? 'text-white' : 'text-gray-900')}>{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PREVIEW */}
      <section className={twMerge("py-28 px-6 transition", theme === 'dark' ? 'bg-[#0d1117]' : 'bg-white')}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className={twMerge("font-semibold text-sm uppercase tracking-widest", theme === 'dark' ? 'text-blue-200' : 'text-blue-900')}>Community</span>
            <h2 className={twMerge("text-4xl font-bold mt-3 mb-5", theme === 'dark' ? 'text-white' : 'text-gray-900')}>
              Train Together,<br />Grow Together
            </h2>
            <p className={twMerge("leading-relaxed mb-6", theme === 'dark' ? 'text-white' : 'text-gray-500')}>
              Follow friends, share your routines, react to posts, and stay motivated through a social feed built around fitness.
            </p>
            <ul className={twMerge("space-y-3 text-sm", theme === 'dark' ? 'text-white' : 'text-gray-600')}>
              {[
                "Public profiles with streaks and stats",
                "Like, comment & share workout posts",
                "Friend system via username or email",
                "Discover routines from your network",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className={twMerge("rounded-2xl p-6 border shadow-sm space-y-4", theme === "dark" ? "bg-[#111827] border-white/10" : "bg-gray-50 border-gray-100")}>
            {[
              { initials: "AK", color: "bg-blue-900", name: "akshitha", workout: "Upper Body Push · Heavy", likes: 24 },
              { initials: "SU", color: "bg-emerald-700", name: "sunil", workout: "Full Body HIIT · Medium", likes: 41 },
              { initials: "JA", color: "bg-purple-700", name: "jan", workout: "Cardio Blast · Light", likes: 33 },
              { initials: "JO", color: "bg-rose-700", name: "joseph", workout: "Pull Day · Heavy", likes: 27 },
              { initials: "YO", color: "bg-orange-600", name: "youssef", workout: "Leg Day · Light", likes: 18 },
            ].map((post) => (
              <div key={post.name} className={twMerge("rounded-xl p-4 flex items-center justify-between shadow-sm", theme === "dark" ? "bg-[#162033]" : "bg-white")}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${post.color} text-white text-xs font-bold flex items-center justify-center`}>
                    {post.initials}
                  </div>
                  <div>
                    <p className={twMerge("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-900")}>{post.name}</p>
                    <p className={twMerge("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>{post.workout}</p>
                  </div>
                </div>
                <div className={twMerge("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-400")}>❤️ {post.likes}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 bg-blue-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-5">Ready to Start?</h2>
          <p className="text-blue-200 text-lg mb-10">
            Sign up free and start tracking your first workout today.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-blue-900 font-semibold px-10 py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-blue-950 text-center text-blue-300 text-sm">
        © 2026 FitHub · Built for CMPT 370 team 02
      </footer>

    </div>
  );
}
