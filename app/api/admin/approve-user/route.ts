import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  sendApprovalEmail,
  sendRejectionEmail,
} from '@/lib/email'

/**
 * POST /api/admin/approve-user
 *
 * Approves or rejects a pending conveyancer/lawyer.
 * Uses service role for DB operations to bypass RLS.
 * Uses cookie-based client only to verify the caller is an admin.
 *
 * Body: { userId, action: 'approve' | 'reject', reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Verify caller is an authenticated admin (cookie-based) ────────────
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[approve-user] Auth error:', authError?.message)
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

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await request.json()
    const { userId, action, reason } = body

    if (!userId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Missing userId or invalid action' }, { status: 400 })
    }

    // ── 3. Use service role for all DB writes — bypasses RLS entirely ─────────
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Load target user profile
    const { data: targetProfile, error: profileErr } = await db
      .from('profiles')
      .select('id, email, full_name, user_type, conveyancer_verified, conveyancer_pending_approval')
      .eq('id', userId)
      .single()

    if (profileErr || !targetProfile) {
      console.error('[approve-user] Profile not found:', profileErr?.message)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userType = (targetProfile.user_type || 'conveyancer') as 'conveyancer' | 'lawyer'
    const name     = targetProfile.full_name || targetProfile.email || 'User'
    const email    = targetProfile.email

    // ── 4. APPROVE ────────────────────────────────────────────────────────────
    if (action === 'approve') {
      const { error: updateErr } = await db
        .from('profiles')
        .update({
          conveyancer_verified:         true,
          conveyancer_pending_approval: false,
          updated_at:                   new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateErr) {
        console.error('[approve-user] DB update failed:', updateErr.message)
        return NextResponse.json({ error: 'Failed to update user: ' + updateErr.message }, { status: 500 })
      }

      // Send approval email
      if (email) {
        await sendApprovalEmail({ to: email, name, userType })
          .then(r => console.log('[approve-user] Approval email sent:', r?.data?.id))
          .catch(err => console.error('[approve-user] Approval email failed:', err?.message))
      }

      return NextResponse.json({ success: true, action: 'approved', userId })
    }

    // ── 5. REJECT ─────────────────────────────────────────────────────────────
    const { error: updateErr } = await db
      .from('profiles')
      .update({
        user_type:                    'buyer',
        conveyancer_verified:         false,
        conveyancer_pending_approval: false,
        updated_at:                   new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateErr) {
      console.error('[approve-user] DB update failed:', updateErr.message)
      return NextResponse.json({ error: 'Failed to update user: ' + updateErr.message }, { status: 500 })
    }

    // Send rejection email
    if (email) {
      await sendRejectionEmail({ to: email, name, userType, reason: reason || undefined })
        .then(r => console.log('[approve-user] Rejection email sent:', r?.data?.id))
        .catch(err => console.error('[approve-user] Rejection email failed:', err?.message))
    }

    return NextResponse.json({ success: true, action: 'rejected', userId })

  } catch (err: any) {
    console.error('[approve-user] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
