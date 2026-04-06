'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface InviteData {
  name: string
  email: string
  role: string
  conveyancerName: string
  propertyAddress?: string
  expired: boolean
  alreadyUsed: boolean
}

export default function InvitePage() {
  const params    = useSearchParams()
  const router    = useRouter()
  const supabase  = createClient()
  const token     = params.get('token') ?? ''

  const [invite, setInvite]       = useState<InviteData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [password, setPassword]   = useState('')
  const [signing, setSigning]     = useState(false)
  const [success, setSuccess]     = useState(false)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    resolveToken()
  }, [token])

  async function resolveToken() {
    // Look up token in both customer and partner tables via API
    const res  = await fetch(`/api/crm/resolve-invite?token=${token}`)
    const data = await res.json()

    if (!res.ok || data.error) {
      setError(data.error || 'Invalid invite link')
      setLoading(false)
      return
    }

    setInvite(data)
    setLoading(false)
  }

  async function handleSignup() {
    if (!invite || !password) return
    setSigning(true)
    setError('')

    const { error: signupErr } = await supabase.auth.signUp({
      email:    invite.email,
      password,
      options: {
        data: {
          full_name:  invite.name,
          user_type:  invite.role || 'buyer',
          invite_token: token,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupErr) {
      // If email already exists, try to sign in instead
      if (signupErr.message.includes('already registered')) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email:    invite.email,
          password,
        })
        if (loginErr) {
          setError('An account with this email already exists. Try signing in with your existing password.')
          setSigning(false)
          return
        }
        // Signed in — the auto-link trigger will handle access
        router.push('/dashboard')
        return
      }
      setError(signupErr.message)
      setSigning(false)
      return
    }

    setSuccess(true)
    setSigning(false)
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
      </div>
    )
  }

  // ── Invalid token ────────────────────────────────────────────────────────────
  if (!token || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Invalid invite link</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'This invite link is invalid or has expired.'}</p>
          <Link href="/auth/signup" className="text-[#E8001D] font-bold text-sm hover:underline">
            Create a regular account instead
          </Link>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-md w-full text-center shadow-sm">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Check your email</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            We sent a confirmation link to <strong>{invite?.email}</strong>.
            Click it to activate your account and view your property report.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left mb-6">
            <p className="text-xs text-blue-700 leading-relaxed">
              Once confirmed, log in to see the property information shared by {invite?.conveyancerName}.
            </p>
          </div>
          <Link href="/auth/login" className="text-[#E8001D] font-bold text-sm hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  // ── Invite form ──────────────────────────────────────────────────────────────
  const roleLabel = {
    buyer:             'Buyer',
    broker:            'Broker',
    buyer_agent:       "Buyer's Agent",
    real_estate_agent: 'Real Estate Agent',
    conveyancer:       'Conveyancer',
    lawyer:            'Lawyer',
  }[invite?.role ?? 'buyer'] ?? 'User'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="text-2xl">🦉</span>
          <span className="text-xl font-black text-gray-900">
            PropertyOwl<span className="text-[#E8001D]"> AI</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">

          {/* Invite context */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-bold text-amber-800 mb-1">
              📋 Invitation from {invite?.conveyancerName}
            </p>
            {invite?.propertyAddress && (
              <p className="text-xs text-amber-700 mt-0.5">
                Property: <strong>{invite.propertyAddress}</strong>
              </p>
            )}
            <p className="text-xs text-amber-600 mt-1">
              You've been invited to view a property document review.
            </p>
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">
            Your details have been pre-filled from the invitation.
          </p>

          <div className="space-y-4">
            {/* Name — read only from invite */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
              <input type="text" value={invite?.name ?? ''} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed" />
            </div>

            {/* Email — read only from invite */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input type="email" value={invite?.email ?? ''} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed" />
            </div>

            {/* Role — read only from invite */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Type</label>
              <input type="text" value={roleLabel} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed" />
            </div>

            {/* Password — user chooses */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Choose a Password
              </label>
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={signing || password.length < 8}
              className="w-full bg-[#E8001D] hover:bg-[#C4001A] text-white font-bold py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {signing ? 'Creating account…' : 'Accept Invite & Create Account →'}
            </button>
          </div>

          <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 leading-relaxed">
            ⚠️ <strong>Information display only.</strong> PropertyOwl AI extracts document information — not legal advice.
            Always engage a licensed conveyancer before making property decisions.
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#E8001D] font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
