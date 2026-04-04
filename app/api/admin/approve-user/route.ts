import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendApprovalEmail,
  sendRejectionEmail,
} from '@/lib/email'

/**
 * POST /api/admin/approve-user
 *
 * Admin-only endpoint. Approves or rejects a pending conveyancer/lawyer.
 *
 * Body:
 *   userId   — the profile id to act on
 *   action   — 'approve' | 'reject'
 *   reason   — optional rejection reason shown in the email
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify the caller is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, action, reason } = body

    if (!userId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Missing userId or invalid action' }, { status: 400 })
    }

    // Load the target user's profile
    const { data: targetProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, user_type, conveyancer_pending_approval, conveyancer_verified')
      .eq('id', userId)
      .single()

    if (profileErr || !targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!targetProfile.conveyancer_pending_approval) {
      return NextResponse.json({ error: 'User is not pending approval' }, { status: 400 })
    }

    const userType = targetProfile.user_type as 'conveyancer' | 'lawyer'
    const name     = targetProfile.full_name || targetProfile.email || 'User'
    const email    = targetProfile.email

    if (action === 'approve') {
      // ── APPROVE ────────────────────────────────────────────────────────────

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          conveyancer_verified:         true,
          conveyancer_pending_approval: false,
          updated_at:                   new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateErr) {
        console.error('[approve-user] DB update failed:', updateErr)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }

      // Send approval email
      if (email) {
        const emailResult = await sendApprovalEmail({
          to:       email,
          name,
          userType,
        }).catch(err => {
          console.error('[approve-user] Approval email failed:', err)
          return null
        })
        console.log('[approve-user] Approval email sent:', emailResult?.data?.id)
      }

      return NextResponse.json({
        success: true,
        action:  'approved',
        userId,
      })

    } else {
      // ── REJECT ─────────────────────────────────────────────────────────────

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          // Downgrade to buyer — they lose professional type
          user_type:                    'buyer',
          conveyancer_verified:         false,
          conveyancer_pending_approval: false,
          updated_at:                   new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateErr) {
        console.error('[approve-user] DB update failed:', updateErr)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }

      // Send rejection email
      if (email) {
        const emailResult = await sendRejectionEmail({
          to:       email,
          name,
          userType,
          reason:   reason || undefined,
        }).catch(err => {
          console.error('[approve-user] Rejection email failed:', err)
          return null
        })
        console.log('[approve-user] Rejection email sent:', emailResult?.data?.id)
      }

      return NextResponse.json({
        success: true,
        action:  'rejected',
        userId,
      })
    }

  } catch (err: any) {
    console.error('[approve-user] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
