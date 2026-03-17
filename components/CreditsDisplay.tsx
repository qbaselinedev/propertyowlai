'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CreditsDisplay({ initialCredits }: { initialCredits: number }) {
  const [credits, setCredits] = useState(initialCredits)
  const supabase = createClient()

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
    if (data) setCredits(data.credits ?? 0)
  }, [])

  useEffect(() => {
    // Refresh on focus (catches navigation back after scan)
    window.addEventListener('focus', refresh)
    // Also poll every 5s in case user is on same page
    const interval = setInterval(refresh, 5000)
    return () => {
      window.removeEventListener('focus', refresh)
      clearInterval(interval)
    }
  }, [refresh])

  // Also listen for custom event dispatched after scan/analysis
  useEffect(() => {
    window.addEventListener('credits-updated', refresh)
    return () => window.removeEventListener('credits-updated', refresh)
  }, [refresh])

  const low = credits < 5

  return (
    <Link href="/dashboard/buy-credits"
      className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded transition-colors ${
        low
          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          : 'bg-[#E8001D] text-white hover:bg-red-700'
      }`}>
      {low && <span>⚠️</span>}
      {credits} Credit{credits !== 1 ? 's' : ''}
      {low && <span className="font-normal opacity-75">· Buy more</span>}
    </Link>
  )
}
