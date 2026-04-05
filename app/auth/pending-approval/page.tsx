'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PendingApprovalPage() {
  const [email, setEmail]       = useState('')
  const [userType, setUserType] = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/auth/login'; return }
      setEmail(user.email ?? '')
      supabase
        .from('profiles')
        .select('user_type, conveyancer_verified')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          // Already approved — send them to dashboard
          if (data?.conveyancer_verified) {
            window.location.href = '/dashboard'
            return
          }
          setUserType(data?.user_type ?? '')
          setLoading(false)
        })
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const typeLabel = userType === 'conveyancer' ? 'Conveyancer' : 'Lawyer'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">

        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">⏳</span>
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Account pending approval
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Your <strong>{typeLabel}</strong> account is being reviewed by our team.
          You cannot access the platform until your credentials are verified.
        </p>

        {/* Progress steps */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6 text-left space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <p className="text-sm text-gray-700">Email confirmed</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <p className="text-sm text-gray-700 font-medium">
              Credentials under review <span className="text-amber-600">(current step)</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-400 text-xs font-bold">3</span>
            </div>
            <p className="text-sm text-gray-400">Full access granted — email notification sent</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-blue-700 mb-1">What happens next</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Our team will review your {typeLabel} credentials and email you at{' '}
            <strong>{email}</strong> once approved. This usually takes 1–2 business days.
          </p>
        </div>

        {/* Sign out only — no dashboard access */}
        <button
          onClick={handleSignOut}
          className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          Sign out
        </button>

        <p className="text-xs text-gray-400 mt-5 leading-relaxed">
          Questions?{' '}
          <a href="mailto:support@propertyowlai.com" className="text-[#E8001D] hover:underline">
            support@propertyowlai.com
          </a>
        </p>
      </div>
    </div>
  )
}
