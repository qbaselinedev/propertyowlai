'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PendingApprovalPage() {
  const [email, setEmail]     = useState('')
  const [userType, setUserType] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      supabase
        .from('profiles')
        .select('user_type, conveyancer_verified')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          // If somehow already verified, redirect to dashboard
          if (data?.conveyancer_verified) {
            window.location.href = '/dashboard'
            return
          }
          setUserType(data?.user_type ?? '')
        })
    })
  }, [])

  const typeLabel = userType === 'conveyancer' ? 'Conveyancer' : userType === 'lawyer' ? 'Lawyer' : 'Professional'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">⏳</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-black text-gray-900 mb-2">
          Your account is under review
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Thanks for confirming your email
          {email && <> at <strong>{email}</strong></>}.
          Your <strong>{typeLabel}</strong> account is currently being reviewed by our team.
        </p>

        {/* Status steps */}
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
            <p className="text-sm text-gray-700 font-medium">Account review in progress <span className="text-amber-600">(current)</span></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-400 text-xs font-bold">3</span>
            </div>
            <p className="text-sm text-gray-400">Full professional access granted</p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-blue-700 mb-1">What happens next</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Our team will review your {typeLabel} credentials and notify you by email once approved.
            This usually takes <strong>1–2 business days</strong>.
            You will receive a notification email at <strong>{email || 'your email address'}</strong>.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-[#E8001D] hover:bg-[#C4001A] text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Continue to Dashboard (limited access)
          </Link>
          <Link
            href="/auth/login"
            className="block text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out and come back later
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-5 leading-relaxed">
          Questions? Contact us at{' '}
          <a href="mailto:support@propertyowlai.com" className="text-[#E8001D] hover:underline">
            support@propertyowlai.com
          </a>
        </p>
      </div>
    </div>
  )
}
