"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function SignIn() {
  // const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient - cross-browser compatible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(20, 184, 166, 0.15) 0%, transparent 50%)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl mb-6">
            <Image
              src="/favicon.svg"
              alt="SkillFlow Logo"
              width={100}
              height={100}
            />
          </div>

          <h1 className="text-3xl font-bold text-zinc-100 mb-2">
            {flow === "signIn" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-zinc-400">
            {flow === "signIn"
              ? "Sign in to continue building your learning roadmaps"
              : "Start your personalized learning journey today"}
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-8 border border-zinc-800"
          style={{
            backgroundColor: "rgba(24, 24, 27, 0.95)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", flow);
            }}
          >
            {/* Email field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-300 block"
              >
                Email address
              </label>
              <input
                id="email"
                className="w-full text-zinc-100 rounded-xl px-4 py-4 border border-zinc-700 outline-none transition-colors text-base"
                style={{
                  backgroundColor: "rgba(39, 39, 42, 0.8)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0ea5e9";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(14, 165, 233, 0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#3f3f46";
                  e.target.style.boxShadow = "none";
                }}
                type="email"
                name="email"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-300 block"
              >
                Password
              </label>
              <input
                id="password"
                className="w-full text-zinc-100 rounded-xl px-4 py-4 border border-zinc-700 outline-none transition-colors text-base"
                style={{
                  backgroundColor: "rgba(39, 39, 42, 0.8)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0ea5e9";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(14, 165, 233, 0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#3f3f46";
                  e.target.style.boxShadow = "none";
                }}
                type="password"
                name="password"
                placeholder="••••••••"
                minLength={8}
                required
              />
              {flow === "signUp" && (
                <p className="text-xs text-zinc-500 mt-2">
                  Must be at least 8 characters
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div
                className="rounded-xl p-4 border"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
              >
                <p className="text-red-400 text-sm flex items-start gap-2">
                  <svg
                    className="w-5 h-5 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              className="w-full text-white font-semibold rounded-xl py-4 mt-2 transition-transform duration-200 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(90deg, #0284c7 0%, #0d9488 100%)",
                boxShadow: "0 10px 25px -5px rgba(14, 165, 233, 0.4)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 15px 30px -5px rgba(14, 165, 233, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 10px 25px -5px rgba(14, 165, 233, 0.4)";
              }}
              onMouseDown={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "scale(0.98)";
                }
              }}
              onMouseUp={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "scale(1.02)";
                }
              }}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {flow === "signIn" ? "Signing in..." : "Creating account..."}
                </span>
              ) : flow === "signIn" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className="px-4 text-zinc-500"
                style={{ backgroundColor: "rgba(24, 24, 27, 0.95)" }}
              >
                {flow === "signIn"
                  ? "New to SkillFlow?"
                  : "Already have an account?"}
              </span>
            </div>
          </div>

          {/* Toggle flow */}
          <button
            type="button"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
            className="w-full py-4 px-4 rounded-xl border border-zinc-700 text-zinc-300 transition-colors duration-200 font-medium text-base"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#52525b";
              e.currentTarget.style.backgroundColor = "rgba(39, 39, 42, 0.5)";
              e.currentTarget.style.color = "#f4f4f5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#3f3f46";
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#d4d4d8";
            }}
          >
            {flow === "signIn" ? "Create an account" : "Sign in instead"}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-sm mt-8">
          AI-powered learning roadmaps for any topic
        </p>
      </div>
    </div>
  );
}
