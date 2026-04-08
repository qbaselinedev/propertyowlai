import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@propertyowlai.com'

/**
 * POST /api/crm/send-email
 *
 * Sends an email to a customer (or any recipient for that customer).
 * Stores a copy in crm_emails for the sent folder.
 *
 * Body: {
 *   customerId:      uuid of crm_customers record
 *   to:              email address to send to
 *   subject:         email subject line
 *   body:            email body (plain text)
 *   propertyAddress: optional property address for context
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
  if (!isPro) return NextResponse.json({ error: 'Only verified professionals can send emails' }, { status: 403 })

  const body = await request.json()
  const { customerId, to, subject, body: emailBody, propertyAddress } = body

  if (!customerId || !to || !subject || !emailBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify customer belongs to this conveyancer
  const { data: customer } = await supabase
    .from('crm_customers')
    .select('id, full_name')
    .eq('id', customerId)
    .eq('conveyancer_id', user.id)
    .single()

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const typeLabel = profile?.user_type === 'lawyer' ? 'Lawyer' : 'Conveyancer'
  const senderName = profile?.full_name ?? 'PropertyOwl AI User'

  // Build HTML email
  const disclaimer = `This email was sent via PropertyOwl AI on behalf of ${senderName} (${typeLabel}). PropertyOwl AI is an information tool only — nothing in this email constitutes legal advice.`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#E8001D;padding:20px 40px;text-align:center">
            <span style="font-size:24px">🦉</span>
            <p style="margin:6px 0 0;color:#FFFFFF;font-size:18px;font-weight:800">PropertyOwl AI</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px">
            <p style="margin:0 0 8px;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600">
              From: ${senderName} (${typeLabel})
            </p>
            <h1 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111">${subject}</h1>
            <div style="font-size:14px;color:#333;line-height:1.8;white-space:pre-wrap">${emailBody}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#F9F9F9;padding:20px 40px;border-top:1px solid #EEE;text-align:center">
            <p style="margin:0;font-size:11px;color:#999;line-height:1.6">${disclaimer}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    // Send via Resend
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: subject,
      html: html,
      replyTo: user.email ?? undefined,
    })

    if (emailError) {
      console.error('[send-email] Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email: ' + emailError.message }, { status: 500 })
    }

    // Store in crm_emails using service role (in case RLS doesn't cover this table yet)
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await db.from('crm_emails').insert({
      conveyancer_id: user.id,
      customer_id: customerId,
      to_email: to,
      subject: subject,
      body: emailBody,
      property_address: propertyAddress || null,
      resend_id: emailResult?.id || null,
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, emailId: emailResult?.id })

  } catch (err: any) {
    console.error('[send-email] Error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
