import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendPendingApprovalEmail,
  sendAdminNotificationEmail,
} from '@/lib/email'

/**
 * POST /api/admin/notify-signup
 *
 * Called from the signup page immediately after a conveyancer or lawyer
 * successfully creates their Supabase account.
 *
 * Sends two emails in parallel:
 *  1. To the user  — "your account is pending approval"
 *  2. To the admin — "new professional user needs review"
 *
 * Does NOT require the user to be authenticated yet (they may not have
 * confirmed their email) so we use the service role to look them up.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, email, userType, licenceNumber } = body

    if (!userId || !name || !email || !userType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['conveyancer', 'lawyer'].includes(userType)) {
      return NextResponse.json({ error: 'Invalid user type for notification' }, { status: 400 })
    }

    // Send both emails in parallel — don't let one failure block the other
    const [userResult, adminResult] = await Promise.allSettled([
      sendPendingApprovalEmail({
        to:            email,
        name,
        userType:      userType as 'conveyancer' | 'lawyer',
        licenceNumber: licenceNumber || undefined,
      }),
      sendAdminNotificationEmail({
        userName:      name,
        userEmail:     email,
        userType:      userType as 'conveyancer' | 'lawyer',
        licenceNumber: licenceNumber || undefined,
        userId,
      }),
    ])

    // Log any failures but don't block the response
    if (userResult.status === 'rejected') {
      console.error('[notify-signup] User email failed:', userResult.reason)
    }
    if (adminResult.status === 'rejected') {
      console.error('[notify-signup] Admin email failed:', adminResult.reason)
    }

    return NextResponse.json({
      success: true,
      userEmailSent:  userResult.status === 'fulfilled',
      adminEmailSent: adminResult.status === 'fulfilled',
    })

  } catch (err: any) {
    console.error('[notify-signup] Error:', err)
    // Don't return an error to the client — email failure should never
    // block the signup flow
    return NextResponse.json({ success: false, error: err.message })
  }
}
