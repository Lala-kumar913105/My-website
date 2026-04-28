"use client";

import { useMemo, useState } from "react";
import { API_BASE_URL } from "../../lib/auth";

function getFallbackAnswer(question: string) {
  const text = question.toLowerCase();

  if (text.includes("screen") || text.includes("page") || text.includes("summary") || text.includes("samjhao")) {
    return "Main abhi direct screen-read context ke bina chal raha hoon. Agar backend screen context integration enable ho, to main current page ka exact summary aur actionable guidance de sakta hoon.";
  }

  return "Backend assistant service abhi connect nahi hui, lekin UI ready hai. Aapka question capture ho raha hai, aur endpoint wiring ke baad yahi se real AI response milega.";
}

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAsk = useMemo(() => question.trim().length > 0 && !isLoading, [question, isLoading]);

  const askAssistant = async (incomingQuestion?: string) => {
    const finalQuestion = (incomingQuestion ?? question).trim();
    if (!finalQuestion) return;

    setError(null);
    setIsLoading(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`${API_BASE_URL}/api/v1/assistant/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: finalQuestion,
          include_screen_context: true,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const resolvedAnswer = data?.answer || data?.response || data?.message;
        setAnswer(typeof resolvedAnswer === "string" && resolvedAnswer.trim() ? resolvedAnswer : getFallbackAnswer(finalQuestion));
      } else {
        const errorData = await response.json().catch(() => ({}));
        const backendMessage =
          (typeof errorData?.detail === "string" && errorData.detail) ||
          (typeof errorData?.message === "string" && errorData.message) ||
          `Request failed with status ${response.status}`;
        setAnswer("");
        setError(`Assistant failed: ${backendMessage}`);
      }

      setQuestion(finalQuestion);
    } catch {
      setAnswer("");
      setError("Assistant service currently unavailable. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="app-container space-y-4">
        <section className="ds-hero-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Smart Help</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">AI Assistant</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Ask questions, understand the current page, and get smart help
          </p>
        </section>

        <section className="ds-card space-y-5">
          <label htmlFor="assistant-question" className="text-sm font-semibold text-slate-800">
            Ask your question
          </label>
          <textarea
            id="assistant-question"
            rows={4}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Type your question here..."
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => askAssistant()}
              disabled={!canAsk}
              className="ds-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Thinking..." : "Ask"}
            </button>
          </div>
        </section>

        <section className="ds-card">
          <h2 className="ds-title">Answer</h2>
          {error && <p className="mt-2 text-xs text-amber-700">{error}</p>}
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-700">
              {isLoading ? "Thinking..." : answer || "Your assistant response will appear here."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
