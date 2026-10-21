"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, User, Bot, RotateCcw } from "lucide-react";
import { useTheme } from "@/context/theme-context";

type Message = {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
  id: string;
};

function getUserId(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

export default function ChatPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const router = useRouter();

  const pageBg = isDark ? "bg-[#0d1117] text-white" : "bg-white text-slate-900";
  const panelBg = isDark ? "bg-[#111827]" : "bg-white";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const borderColor = isDark ? "border-white/10" : "border-gray-200";
  const inputBg = isDark
    ? "bg-[#0d1117] border-white/10 text-white placeholder-gray-500"
    : "bg-white border-gray-300 text-slate-900";

  const userBubble = "bg-blue-600 text-white";
  const assistantBubble = isDark
    ? "bg-[#162033] text-gray-200"
    : "bg-gray-100 text-gray-800";

  const failedBubble = "bg-red-50 text-red-600 border border-red-200";

  const assistantIconBg = isDark ? "bg-[#162033]" : "bg-gray-100";
  const assistantIconColor = "text-blue-500";

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm your FitHub AI coach. Ask me anything about your workouts, nutrition, or fitness goals!",
      id: crypto.randomUUID(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendPrompt = async (prompt: string) => {
    if (!prompt?.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ prompt, userId: getUserId() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "AI failed to respond");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          id: crypto.randomUUID(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
          failed: true,
          id: crypto.randomUUID(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      id: crypto.randomUUID(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLastPrompt(input);
    setInput("");

    await sendPrompt(input);
  };

  const handleRetry = async () => {
    if (!lastPrompt) return;
    setMessages((prev) => prev.slice(0, -1));
    await sendPrompt(lastPrompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex h-[calc(100vh-4rem)] transition overflow-hidden ${pageBg}`}>

      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="/fitness1.jpeg" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="absolute inset-0 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl mb-4">Your AI Coach</h1>
          <p className="text-xl opacity-90">Get personalized fitness guidance</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className={`flex-1 flex flex-col ${panelBg}`}>

        {/* HEADER */}
        <div className="text-center pt-6 pb-2">
          <h2 className="text-2xl font-bold mb-1">AI Fitness Coach</h2>
          <p className={`text-sm ${mutedText}`}>
            Ask me anything about your fitness journey
          </p>
        </div>

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* ICON */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "user"
                    ? "bg-blue-600"
                    : assistantIconBg
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className={`w-4 h-4 ${assistantIconColor}`} />
                )}
              </div>

              {/* MESSAGE */}
              <div className="flex flex-col gap-1">
                <div
                  className={`max-w-sm px-4 py-2 rounded-lg text-sm leading-relaxed ${
                    msg.role === "user"
                      ? `${userBubble} rounded-tr-none`
                      : msg.failed
                      ? `${failedBubble} rounded-tl-none`
                      : `${assistantBubble} rounded-tl-none`
                  }`}
                >
                  {msg.content}
                </div>

                {msg.failed && (
                  <button
                    onClick={handleRetry}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 self-start"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* LOADING */}
          {loading && (
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${assistantIconBg}`}
              >
                <Bot className={`w-4 h-4 ${assistantIconColor}`} />
              </div>
              <div
                className={`px-4 py-2 rounded-lg rounded-tl-none text-sm ${assistantBubble}`}
              >
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className={`px-8 py-4 border-t ${borderColor}`}>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Ask about workouts, nutrition, goals..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className={`flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${inputBg}`}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <p className={`text-xs mt-2 text-center ${mutedText}`}>
            Press Enter to send · Powered by Google Gemini
          </p>
        </div>
      </div>
    </div>
  );
}
