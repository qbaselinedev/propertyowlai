"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const USER_TYPES = [
  { value: "buyer",             label: "Normal Buyer",      icon: "🏠", desc: "I'm buying a property for myself" },
  { value: "broker",            label: "Broker",             icon: "💼", desc: "I work in mortgage broking" },
  { value: "buyer_agent",       label: "Buyer's Agent",      icon: "🔍", desc: "I represent buyers professionally" },
  { value: "conveyancer",       label: "Conveyancer",        icon: "📋", desc: "I'm a licensed conveyancer (VIC)" },
  { value: "lawyer",            label: "Legal / Lawyer",     icon: "⚖️", desc: "I'm a solicitor or legal professional" },
  { value: "real_estate_agent", label: "Real Estate Agent",  icon: "🏢", desc: "I'm a real estate professional" },
]

const PROFESSIONAL_TYPES = ["conveyancer", "lawyer"]

export default function SignupPage() {
  const [step, setStep]                     = useState<1 | 2>(1)
  const [name, setName]                     = useState("")
  const [email, setEmail]                   = useState("")
  const [password, setPassword]             = useState("")
  const [userType, setUserType]             = useState("buyer")
  const [licenceNumber, setLicenceNumber]   = useState("")
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState("")
  const [success, setSuccess]               = useState(false)

  const supabase       = createClient()
  const isProfessional = PROFESSIONAL_TYPES.includes(userType)
  const isConveyancer  = userType === "conveyancer"

  function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setStep(2)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (isConveyancer && !licenceNumber.trim()) {
      setError("Please enter your conveyancer licence number.")
      setLoading(false)
      return
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:                  name,
          user_type:                  userType,
          conveyancer_licence_number: isConveyancer ? licenceNumber.trim() : null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // For professional types, fire email notifications (non-blocking)
    const userId = data.user?.id
    if (isProfessional && userId) {
      fetch('/api/admin/notify-signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name,
          email,
          userType,
          licenceNumber: isConveyancer ? licenceNumber.trim() : null,
        }),
      }).catch(err => console.error('Notify-signup call failed:', err))
    }

    setSuccess(true)
    setLoading(false)
  }

  async function handleGoogleSignup() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (success && isProfessional) {
    const typeLabel = userType === "conveyancer" ? "Conveyancer" : "Lawyer"
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Account pending approval</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Your <strong>{typeLabel}</strong> account has been created. Because professional
            accounts have access to full AI-generated analysis, we manually verify all
            registrations before granting access.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-bold text-amber-800 mb-1">What happens next</p>
            <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Check your email for a confirmation link</li>
              <li>Our team reviews your registration (1–2 business days)</li>
              <li>You'll receive an email when your account is approved</li>
            </ol>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            A notification email has been sent to <strong>{email}</strong>
          </p>
          <Link href="/auth/login" className="text-[#E8001D] font-bold text-sm hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Check your email</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate
            your account and start your first property review.
          </p>
          <Link href="/auth/login" className="text-[#E8001D] font-bold text-sm hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  // ── Signup form ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="text-2xl">🦉</span>
          <span className="text-xl font-black text-gray-900">
            PropertyOwl<span className="text-[#E8001D]"> AI</span>
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? "bg-[#E8001D] text-white" : "bg-gray-200 text-gray-400"
              }`}>{s}</div>
              {s < 2 && <div className={`w-8 h-px ${step > s ? "bg-[#E8001D]" : "bg-gray-200"}`} />}
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-2">
            {step === 1 ? "Your details" : "Your role"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">

          {/* ── STEP 1 ────────────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-1">Create account</h1>
              <p className="text-sm text-gray-500 mb-6">Start reviewing properties smarter</p>

              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition-colors mb-5 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-21 0-1.3-.2-2.7-.5-4z"/>
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.6 7.4 6.3 14.7z"/>
                  <path fill="#FBBC05" d="M24 46c5.2 0 9.8-1.7 13.4-4.7l-6.2-5.2C29.3 37.7 26.8 38.5 24 38.5c-5.1 0-9.5-3.3-11-7.9l-7 5.4C9.3 42.6 16.1 46 24 46z"/>
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 3-3.1 5.5-6 7l6.2 5.2C40.1 37.4 44.5 31.2 44.5 24c0-1.3-.2-2.7-.5-4z"/>
                </svg>
                Sign up with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or with email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] transition-colors" />
                </div>
                <button type="submit"
                  className="w-full bg-[#E8001D] hover:bg-[#C4001A] text-white font-bold py-3 rounded-lg text-sm transition-colors">
                  Continue →
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-5">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-[#E8001D] font-bold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* ── STEP 2 ────────────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                ← Back
              </button>
              <h1 className="text-2xl font-black text-gray-900 mb-1">Your role</h1>
              <p className="text-sm text-gray-500 mb-5">This determines what information you'll see in reports</p>

              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-2">
                  {USER_TYPES.map(type => (
                    <label key={type.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        userType === type.value
                          ? "border-[#E8001D] bg-red-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}>
                      <input type="radio" name="userType" value={type.value}
                        checked={userType === type.value}
                        onChange={() => { setUserType(type.value); setLicenceNumber("") }}
                        className="accent-[#E8001D]" />
                      <span className="text-lg">{type.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{type.label}</p>
                        <p className="text-xs text-gray-400">{type.desc}</p>
                      </div>
                      {PROFESSIONAL_TYPES.includes(type.value) && (
                        <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">PRO</span>
                      )}
                    </label>
                  ))}
                </div>

                {/* Conveyancer licence — simple input, no live verify button */}
                {isConveyancer && (
                  <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 mb-1">⚖️ Licence Number Required</p>
                    <p className="text-xs text-amber-700 mb-3">
                      Enter your VIC Consumer Affairs conveyancer licence number.
                      Our team will verify it before approving your account.
                    </p>
                    <input
                      type="text" value={licenceNumber}
                      onChange={e => setLicenceNumber(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]"
                    />
                  </div>
                )}

                {/* Professional info box */}
                {isProfessional && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 font-semibold">🔒 Manual approval required</p>
                    <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                      Professional accounts are manually reviewed before full access is granted.
                      You'll be notified by email once approved — usually within 1–2 business days.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button type="submit"
                  disabled={loading || (isConveyancer && !licenceNumber.trim())}
                  className="w-full bg-[#E8001D] hover:bg-[#C4001A] text-white font-bold py-3 rounded-lg text-sm transition-colors disabled:opacity-50">
                  {loading
                    ? "Creating account…"
                    : isProfessional
                    ? "Create Account & Request Approval →"
                    : "Create Account →"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed px-4">
          By creating an account you agree to our Terms of Service.
          PropertyOwl AI is an informal review tool — not legal advice.
        </p>
      </div>
    </div>
  )
}
