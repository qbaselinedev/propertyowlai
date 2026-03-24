'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 60 * 60 * 1000 // 60 minutes
const WARNING_MS = 55 * 60 * 1000 // warn at 55 minutes

const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keydown',
  'scroll', 'touchstart', 'click', 'wheel',
]

export default function InactivityLogout() {
  const router = useRouter()
  const supabase = createClient()
  const logoutTimer  = useRef<NodeJS.Timeout | null>(null)
  const warningTimer = useRef<NodeJS.Timeout | null>(null)
  const warningShown = useRef(false)

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/auth/login?reason=inactivity')
    router.refresh()
  }, [supabase, router])

  const resetTimers = useCallback(() => {
    // Clear existing
    if (logoutTimer.current)  clearTimeout(logoutTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)
    warningShown.current = false

    // Warning at 55 min
    warningTimer.current = setTimeout(() => {
      if (!warningShown.current) {
        warningShown.current = true
        // Simple non-blocking console note — no alert/confirm which would block UI
        console.info('[PropertyOwl] Session expiring in 5 minutes due to inactivity')
      }
    }, WARNING_MS)

    // Sign out at 60 min
    logoutTimer.current = setTimeout(() => {
      signOut()
    }, TIMEOUT_MS)
  }, [signOut])

  useEffect(() => {
    // Start timers on mount
    resetTimers()

    // Reset on any activity
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetTimers, { passive: true })
    )

    return () => {
      if (logoutTimer.current)  clearTimeout(logoutTimer.current)
      if (warningTimer.current) clearTimeout(warningTimer.current)
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetTimers)
      )
    }
  }, [resetTimers])

  // No UI — purely functional
  return null
}
