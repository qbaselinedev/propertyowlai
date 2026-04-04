import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM    = process.env.RESEND_FROM_EMAIL || 'noreply@propertyowlai.com'
const ADMIN   = 'qbaseline.support@gmail.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://propertyowlai.com'

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#E8001D;padding:28px 40px;text-align:center">
            <span style="font-size:28px">🦉</span>
            <p style="margin:8px 0 0;color:#FFFFFF;font-size:20px;font-weight:800;letter-spacing:-0.5px">
              PropertyOwl <span style="opacity:0.85">AI</span>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9F9F9;padding:20px 40px;border-top:1px solid #EEEEEE;text-align:center">
            <p style="margin:0;font-size:11px;color:#999999;line-height:1.6">
              PropertyOwl AI · Victorian Property Intelligence<br />
              This email was sent from <a href="${APP_URL}" style="color:#E8001D;text-decoration:none">propertyowlai.com</a><br />
              PropertyOwl AI is an information tool only. Nothing in this email constitutes legal advice.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Button helper ────────────────────────────────────────────────────────────

function btn(text: string, url: string, color = '#E8001D'): string {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#FFFFFF;font-size:14px;font-weight:700;padding:13px 28px;border-radius:8px;text-decoration:none;margin-top:8px">${text}</a>`
}

// ─── 1. Pending approval — sent to the user (conveyancer/lawyer) on signup ───

export async function sendPendingApprovalEmail(opts: {
  to: string
  name: string
  userType: 'conveyancer' | 'lawyer'
  licenceNumber?: string
}) {
  const typeLabel = opts.userType === 'conveyancer' ? 'Conveyancer' : 'Lawyer'

  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111111">
      Your account is under review
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      Hi ${opts.name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      Thank you for registering as a <strong>${typeLabel}</strong> on PropertyOwl AI.
      Because professional accounts have access to full AI-generated property analysis,
      we manually verify all ${typeLabel} registrations before granting access.
    </p>
    ${opts.licenceNumber ? `
    <div style="background:#FFF8F0;border:1px solid #FED7AA;border-radius:8px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0;font-size:13px;color:#92400E">
        <strong>Licence number submitted:</strong> ${opts.licenceNumber}
      </p>
    </div>` : ''}
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      Our team will review your registration and notify you by email once approved.
      This usually takes <strong>1–2 business days</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6">
      In the meantime you can log in and explore the platform, but professional
      analysis features will be unlocked after approval.
    </p>
    ${btn('Log in to PropertyOwl AI', `${APP_URL}/auth/login`)}
    <p style="margin:28px 0 0;font-size:13px;color:#999999;line-height:1.6">
      If you have any questions, reply to this email or contact us at
      <a href="mailto:support@propertyowlai.com" style="color:#E8001D">support@propertyowlai.com</a>
    </p>
  `)

  return resend.emails.send({
    from:    FROM,
    to:      opts.to,
    subject: `Your PropertyOwl AI ${typeLabel} account is pending approval`,
    html,
  })
}

// ─── 2. Approval — sent to the user when admin approves them ─────────────────

export async function sendApprovalEmail(opts: {
  to: string
  name: string
  userType: 'conveyancer' | 'lawyer'
}) {
  const typeLabel = opts.userType === 'conveyancer' ? 'Conveyancer' : 'Lawyer'

  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111111">
      ✓ Your account has been approved
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      Hi ${opts.name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      Great news — your PropertyOwl AI <strong>${typeLabel}</strong> account has been approved.
      You now have access to full professional property analysis including risk assessment,
      red flags, AI recommendations, suggested actions and draft client emails.
    </p>
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#166534">What you now have access to:</p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#166534;line-height:1.8">
        <li>Full AI risk analysis on S32 and Contract of Sale</li>
        <li>Risk score, red flags and severity ratings</li>
        <li>Professional recommendations per issue</li>
        <li>Suggested actions and questions to explore</li>
        <li>Draft client email generation</li>
      </ul>
    </div>
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0;font-size:12px;color:#92400E;line-height:1.6">
        <strong>Important reminder:</strong> All AI-generated analysis is for your professional
        reference only. It must be validated within your professional judgement before being
        acted on or presented to clients. PropertyOwl AI does not constitute legal advice.
      </p>
    </div>
    ${btn('Access PropertyOwl AI', `${APP_URL}/dashboard`)}
  `)

  return resend.emails.send({
    from:    FROM,
    to:      opts.to,
    subject: `You're approved — Welcome to PropertyOwl AI Professional`,
    html,
  })
}

// ─── 3. Rejection — sent to user when admin rejects them ─────────────────────

export async function sendRejectionEmail(opts: {
  to: string
  name: string
  userType: 'conveyancer' | 'lawyer'
  reason?: string
}) {
  const typeLabel = opts.userType === 'conveyancer' ? 'Conveyancer' : 'Lawyer'

  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111111">
      Account verification unsuccessful
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      Hi ${opts.name},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      Unfortunately we were unable to verify your registration as a <strong>${typeLabel}</strong>
      on PropertyOwl AI.
    </p>
    ${opts.reason ? `
    <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:8px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0;font-size:13px;color:#9F1239"><strong>Reason:</strong> ${opts.reason}</p>
    </div>` : ''}
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      Your account remains active as a standard user. If you believe this is an error
      or would like to provide additional documentation, please contact our support team.
    </p>
    ${btn('Contact Support', `mailto:support@propertyowlai.com`, '#374151')}
  `)

  return resend.emails.send({
    from:    FROM,
    to:      opts.to,
    subject: `PropertyOwl AI — Professional account verification update`,
    html,
  })
}

// ─── 4. Admin notification — sent to admin when new pro user signs up ─────────

export async function sendAdminNotificationEmail(opts: {
  userName: string
  userEmail: string
  userType: 'conveyancer' | 'lawyer'
  licenceNumber?: string
  userId: string
}) {
  const typeLabel = opts.userType === 'conveyancer' ? 'Conveyancer' : 'Lawyer'
  const registerUrl = opts.licenceNumber
    ? `https://registers.consumer.vic.gov.au/CvSearch/PerformSearch?NameOrLicenceNumber=LicenceNumber&LicenceNumber=${encodeURIComponent(opts.licenceNumber)}&IncludeNonCurrentLicensees=False`
    : null

  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111111">
      New ${typeLabel} registration — approval required
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6">
      A new user has registered as a <strong>${typeLabel}</strong> and is waiting for
      your approval before getting access to professional features.
    </p>

    <div style="background:#F9F9F9;border:1px solid #E5E5E5;border-radius:8px;padding:20px;margin-bottom:24px">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="font-size:13px;color:#666;padding:4px 0;width:140px">Name</td>
          <td style="font-size:13px;color:#111;font-weight:600;padding:4px 0">${opts.userName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#666;padding:4px 0">Email</td>
          <td style="font-size:13px;color:#111;font-weight:600;padding:4px 0">
            <a href="mailto:${opts.userEmail}" style="color:#E8001D">${opts.userEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#666;padding:4px 0">User type</td>
          <td style="font-size:13px;color:#111;font-weight:600;padding:4px 0">${typeLabel}</td>
        </tr>
        ${opts.licenceNumber ? `
        <tr>
          <td style="font-size:13px;color:#666;padding:4px 0">Licence number</td>
          <td style="font-size:13px;color:#111;font-weight:600;padding:4px 0">${opts.licenceNumber}</td>
        </tr>` : ''}
      </table>
    </div>

    ${registerUrl ? `
    <p style="margin:0 0 16px;font-size:14px;color:#555555;line-height:1.6">
      Check this licence on the VIC Consumer Affairs register before approving:
    </p>
    ${btn('Check Licence on VIC Register', registerUrl, '#374151')}
    <br /><br />` : ''}

    <p style="margin:0 0 16px;font-size:14px;color:#555555;line-height:1.6">
      Go to the admin panel to approve or reject this user:
    </p>
    ${btn('Review in Admin Panel', `${APP_URL}/admin/users`)}

    <p style="margin:24px 0 0;font-size:12px;color:#999999">
      User ID: ${opts.userId}
    </p>
  `)

  return resend.emails.send({
    from:    FROM,
    to:      ADMIN,
    subject: `[PropertyOwl Admin] New ${typeLabel} pending approval — ${opts.userName}`,
    html,
  })
}
