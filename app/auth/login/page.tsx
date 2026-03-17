"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* LEFT — BRAND PANEL */}
      <div className="hidden md:flex bg-gray-900 flex-col justify-center px-14 py-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#E8001D]" />
        <div className="flex items-center gap-2 mb-8">
          <span className="text-3xl">🦉</span>
          <span className="text-2xl font-black text-white">PropertyOwl<span className="text-[#E8001D]"> AI</span></span>
        </div>
        <h2 className="text-3xl font-black text-white mb-3 leading-tight">
          Know before<br />you bid.
        </h2>
        <p className="text-gray-400 mb-10 text-sm leading-relaxed">
          AI-powered Section 32 reviews for Victorian property buyers. Spot red flags before your conveyancer does.
        </p>
        {[
          { icon: "⚖️", text: "18+ Victorian legal compliance checks" },
          { icon: "🎯", text: "PropOwl Risk Score 0–100" },
          { icon: "💬", text: "Negotiation brief & conveyancer handoff" },
          { icon: "🔍", text: "Online property intelligence scan" },
        ].map((f) => (
          <div key={f.text} className="flex items-center gap-3 mb-4">
            <span className="text-lg">{f.icon}</span>
            <span className="text-sm text-gray-300">{f.text}</span>
          </div>
        ))}
        <div className="mt-10 p-4 bg-white/5 rounded-lg border border-white/10 text-xs text-gray-500 leading-relaxed">
          ⚠️ Informal review tool only. Not a substitute for licensed conveyancing advice.
        </div>
      </div>

      {/* RIGHT — FORM */}
      <div className="flex items-center justify-center px-8 py-16 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <span className="text-2xl">🦉</span>
            <span className="text-xl font-black text-gray-900">PropertyOwl<span className="text-[#E8001D]"> AI</span></span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-8">Access your property intelligence dashboard</p>

          {/* GOOGLE */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition-colors mb-5 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-21 0-1.3-.2-2.7-.5-4z"/>
              <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.6 7.4 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 46c5.2 0 9.8-1.7 13.4-4.7l-6.2-5.2C29.3 37.7 26.8 38.5 24 38.5c-5.1 0-9.5-3.3-11-7.9l-7 5.4C9.3 42.6 16.1 46 24 46z"/>
              <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 3-3.1 5.5-6 7l6.2 5.2C40.1 37.4 44.5 31.2 44.5 24c0-1.3-.2-2.7-.5-4z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* EMAIL FORM */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8001D] hover:bg-[#C4001A] text-white font-bold py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            No account?{" "}
            <Link href="/auth/signup" className="text-[#E8001D] font-bold hover:underline">
              Create free account
            </Link>
          </p>

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            ⚠️ <strong>Not legal advice.</strong> PropertyOwl AI is an informal review tool. Always verify with a licensed Victorian conveyancer before signing.
          </div>
        </div>
      </div>
    </div>
  );
}
