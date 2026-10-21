"use client";
import { useState } from "react";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifyAuthStoreChanged } from "@/lib/auth-store";
import { useTheme } from "@/context/theme-context";

export default function Page() {
  const { theme } = useTheme();

  const isDark = theme === "dark";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
    height: "",
    weight: "",
  });

  const [heightUnit, setHeightUnit] = useState<"cm" | "feet">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "pounds">("kg");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // 🎨 THEME CLASSES
  const pageBg = isDark ? "bg-[#0d1117] text-white" : "bg-white text-slate-900";
  const cardBg = isDark ? "bg-[#111827]" : "bg-white";
  const inputBg = isDark ? "bg-[#0d1117] border-white/10 text-white" : "bg-white border-gray-300 text-slate-900";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const borderColor = isDark ? "border-white/10" : "border-gray-300";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match!");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            dateOfBirth: formData.dob,
            height: parseFloat(formData.height),
            heightUnit: heightUnit === "feet" ? "ft" : "cm",
            weight: parseFloat(formData.weight),
            weightUnit: weightUnit === "pounds" ? "lbs" : "kg",
          }),
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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`flex min-h-[calc(100vh-4rem)] transition overflow-hidden ${pageBg}`}>

      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/fitness1.jpeg"
          alt="Fitness"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="absolute inset-0 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl mb-4">Transform Your Body</h1>
          <p className="text-xl opacity-90">Start your fitness journey today</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className={`flex-1 flex items-center justify-center p-8 overflow-y-auto min-h-[calc(100vh-4rem)] ${cardBg}`}>
        <div className="w-full max-w-md py-8">

          {/* LOGO */}
          <div className="flex items-center justify-center mb-8">
            <Dumbbell className="w-8 h-8 text-blue-500 mr-2" />
            <span className="text-2xl font-semibold">FitHub</span>
          </div>

          {/* TITLE */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Create Account</h2>
            <p className={mutedText}>Join us and start your fitness journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* INPUT TEMPLATE */}
            {[
              ["First Name", "firstName", "Abel"],
              ["Last Name", "lastName", "Smith"],
            ].map(([label, key, placeholder]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={formData[key as keyof typeof formData]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  required
                  className={`w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                />
              </div>
            ))}

            {/* USERNAME */}
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                placeholder="@abelsmith"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                required
                className={`w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 ${inputBg}`}
              />
            </div>

            {/* DATE */}
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => handleChange("dob", e.target.value)}
                required
                className={`w-full border rounded-lg px-4 py-2 text-sm ${inputBg}`}
              />
            </div>

            {/* EMAIL */}
            <div>
              <input
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className={`w-full border rounded-lg px-4 py-2 text-sm ${inputBg}`}
              />
            </div>

            {/* PASSWORDS */}
            <div>
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                className={`w-full border rounded-lg px-4 py-2 text-sm ${inputBg}`}
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
                className={`w-full border rounded-lg px-4 py-2 text-sm ${inputBg}`}
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className={`mt-6 text-center text-sm ${mutedText}`}>
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
