import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.propertyowlai.com'
const FROM    = process.env.RESEND_FROM_EMAIL   || 'noreply@propertyowlai.com'

/**
 * POST /api/crm/invite
 *
 * Sends an invite email to a customer or partner.
 * Generates a unique token stored in the CRM record.
 * The token is used on the /invite page to pre-fill signup.
 *
 * Body: {
 *   type:       'customer' | 'partner'
 *   contactId:  uuid of crm_customers or crm_partners record
 *   propertyId: uuid of the property they're being invited to view (optional)
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Verify caller is a verified professional
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, user_type, conveyancer_verified')
    .eq('id', user.id)
    .single()

  const isPro = ['conveyancer', 'lawyer'].includes(profile?.user_type ?? '') && profile?.conveyancer_verified
  if (!isPro) return NextResponse.json({ error: 'Only verified professionals can send invites' }, { status: 403 })

  const body = await request.json()
  const { type, contactId, propertyId } = body

  if (!type || !contactId) {
    return NextResponse.json({ error: 'Missing type or contactId' }, { status: 400 })
  }

  // Use service role to update CRM tables (bypasses RLS for token write)
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const table = type === 'customer' ? 'crm_customers' : 'crm_partners'

  // Load the contact
  const { data: contact, error: contactErr } = await db
    .from(table)
    .select('*')
    .eq('id', contactId)
    .eq('conveyancer_id', user.id)
    .single()

  if (contactErr || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  // If already joined PropertyOwl, just grant access — no need to invite again
  if (contact.propertyowl_user_id && propertyId) {
    await db.from('shared_property_access').insert({
      property_id: propertyId,
      user_id:     contact.propertyowl_user_id,
      granted_by:  user.id,
      access_type: 'facts_only',
    }).onConflict('property_id,user_id').ignore()

    return NextResponse.json({ success: true, alreadyJoined: true })
  }

  // Generate a secure invite token (expires in 7 days)
  const token       = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const expiresAt   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Store token on contact
  await db.from(table).update({
    invite_token:      token,
    invite_expires_at: expiresAt,
    invite_sent_at:    new Date().toISOString(),
    updated_at:        new Date().toISOString(),
  }).eq('id', contactId)

  // If propertyId given, mark invite sent on the link table too
  if (propertyId && type === 'customer') {
    await db.from('crm_customer_properties')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('customer_id', contactId)
      .eq('property_id', propertyId)
  }
  if (propertyId && type === 'partner') {
    await db.from('crm_property_partners')
      .update({ invite_sent_at: new Date().toISOString() })
      .eq('partner_id', contactId)
      .eq('property_id', propertyId)
  }

  // Build invite URL
  const inviteUrl = `${APP_URL}/invite?token=${token}`

  // Load property for email context
  let propertyAddress = ''
  if (propertyId) {
    const { data: prop } = await db.from('properties').select('address, suburb').eq('id', propertyId).single()
    if (prop) propertyAddress = `${prop.address}, ${prop.suburb}`
  }

  const conveyancerName = profile?.full_name || 'Your conveyancer'
  const typeLabel       = profile?.user_type === 'lawyer' ? 'Lawyer' : 'Conveyancer'
  const contactType     = type === 'customer' ? 'client' : 'colleague'
  const roleLabel       = type === 'partner'
    ? ({ buyer_agent: 'Buyer\'s Agent', broker: 'Broker', real_estate_agent: 'Real Estate Agent' }[contact.partner_type as string] ?? 'Professional')
    : 'Buyer'

  // Send invite email via Resend
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const subject = propertyAddress
    ? `${conveyancerName} has shared a property review with you — ${propertyAddress}`
    : `${conveyancerName} has invited you to PropertyOwl AI`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#E8001D;padding:28px 40px;text-align:center">
            <span style="font-size:28px">🦉</span>
            <p style="margin:8px 0 0;color:#FFFFFF;font-size:20px;font-weight:800">PropertyOwl AI</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#111">
              You've been invited to view a property review
            </h1>
            <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6">
              Hi ${contact.full_name},
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6">
              <strong>${conveyancerName}</strong> (${typeLabel}) has invited you to view a property analysis on PropertyOwl AI.
              ${propertyAddress ? `<br/><br/>Property: <strong>${propertyAddress}</strong>` : ''}
            </p>
            <div style="background:#FFF8F0;border:1px solid #FED7AA;border-radius:8px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:#92400E;line-height:1.6">
                <strong>What you'll see:</strong> Document facts extracted from the Section 32 and Contract of Sale — 
                including title details, outgoings, planning zone, special conditions and more. 
                All information is presented as-is from the documents.
              </p>
            </div>
            <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:8px;padding:14px 18px;margin-bottom:24px">
              <p style="margin:0;font-size:12px;color:#9F1239;line-height:1.6">
                ⚠️ <strong>Important:</strong> The information shown is extracted from property documents for informational purposes only. 
                It is not legal advice. Always engage a licensed conveyancer before making property decisions.
              </p>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#666;">This invite expires in 7 days.</p>
            <a href="${inviteUrl}" style="display:inline-block;background:#E8001D;color:#FFFFFF;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;margin-bottom:24px">
              Accept Invite &amp; Create Account →
            </a>
            <p style="margin:16px 0 0;font-size:12px;color:#999;line-height:1.6">
              Or copy this link: <a href="${inviteUrl}" style="color:#E8001D">${inviteUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F9F9F9;padding:20px 40px;border-top:1px solid #EEE;text-align:center">
            <p style="margin:0;font-size:11px;color:#999;line-height:1.6">
              PropertyOwl AI · Victorian Property Intelligence<br/>
              This invite was sent by ${conveyancerName}. If you did not expect this email, you can ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await resend.emails.send({
      from:    FROM,
      to:      contact.email,
      subject,
      html,
    })
  } catch (err: any) {
    console.error('[crm/invite] Email failed:', err.message)
    // Don't fail the request — token was saved, they can be re-invited
    return NextResponse.json({ success: true, emailError: err.message })
  }

  return NextResponse.json({ success: true })
}
