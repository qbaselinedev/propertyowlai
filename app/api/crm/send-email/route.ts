import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@propertyowlai.com'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('full_name, user_type, conveyancer_verified').eq('id', user.id).single()
  const isPro = ['conveyancer', 'lawyer'].includes(profile?.user_type ?? '') && profile?.conveyancer_verified
  if (!isPro) return NextResponse.json({ error: 'Only verified professionals can send emails' }, { status: 403 })

  const body = await request.json()
  const { customerId, to, subject, body: emailBody, propertyAddress } = body
  if (!to || !subject || !emailBody) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Fetch email branding
  const { data: branding } = await supabase.from('email_branding').select('*').eq('user_id', user.id).single()

  const b = {
    firm_name: branding?.firm_name || profile?.full_name || 'PropertyOwl AI',
    logo_url: branding?.logo_url || '',
    brand_color: branding?.brand_color || '#E8001D',
    sig_name: branding?.signature_name || profile?.full_name || '',
    sig_title: branding?.signature_title || (profile?.user_type === 'lawyer' ? 'Lawyer' : 'Conveyancer'),
    sig_phone: branding?.signature_phone || '',
    sig_email: branding?.signature_email || user.email || '',
    sig_website: branding?.signature_website || '',
    footer: branding?.footer_disclaimer || 'This email was sent via PropertyOwl AI. Information display only — not legal advice.',
  }

  // Build branded HTML
  const logoHtml = b.logo_url ? `<img src="${b.logo_url}" alt="Logo" style="max-height:44px;max-width:180px;display:block;margin:0 auto 8px;object-fit:contain"/>` : ''
  const sigLines = [
    b.sig_name ? `<p style="margin:0;font-weight:700;color:#111;font-size:14px">${b.sig_name}</p>` : '',
    b.sig_title ? `<p style="margin:2px 0;color:#666;font-size:12px">${b.sig_title}</p>` : '',
    b.sig_phone ? `<p style="margin:2px 0;color:#666;font-size:12px">${b.sig_phone}</p>` : '',
    b.sig_email ? `<p style="margin:2px 0;color:#666;font-size:12px">${b.sig_email}</p>` : '',
    b.sig_website ? `<p style="margin:2px 0;font-size:12px"><a href="${b.sig_website}" style="color:${b.brand_color}">${b.sig_website}</a></p>` : '',
  ].filter(Boolean).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 20px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
<tr><td style="background:${b.brand_color};padding:20px 32px;text-align:center">
  ${logoHtml}
  <p style="margin:0;color:white;font-size:18px;font-weight:800">${b.firm_name}</p>
</td></tr>
<tr><td style="padding:28px 32px">
  <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111">${subject}</h1>
  <div style="font-size:14px;color:#333;line-height:1.8;white-space:pre-wrap">${emailBody}</div>
  <div style="border-top:1px solid #eee;margin-top:24px;padding-top:16px">${sigLines}</div>
</td></tr>
<tr><td style="background:#F9FAFB;padding:16px 32px;border-top:1px solid #EEE;text-align:center">
  <p style="margin:0;font-size:11px;color:#999;line-height:1.6">${b.footer}</p>
</td></tr>
</table></td></tr></table></body></html>`

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: FROM, to: [to], subject, html, replyTo: user.email ?? undefined,
    })
    if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 })

    // Store in crm_emails
    const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    if (customerId && customerId !== 'unknown') {
      await db.from('crm_emails').insert({
        conveyancer_id: user.id, customer_id: customerId, to_email: to,
        subject, body: emailBody, property_address: propertyAddress || null,
        resend_id: emailResult?.id || null, sent_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true, emailId: emailResult?.id })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
