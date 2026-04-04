'use client'

import { useState } from 'react'

interface EmailDraft {
  subject: string
  body: string
}

interface Props {
  emailDraft: EmailDraft | string | null
  propertyAddress: string
}

/**
 * EmailDraftPanel
 *
 * Shown only to conveyancer/lawyer users after they acknowledge the disclaimer.
 * Pre-populates with the email_draft from the LLM JSON output.
 * Editable textarea + copy to clipboard button.
 * Standard disclaimer footer is always appended.
 */
export default function EmailDraftPanel({ emailDraft, propertyAddress }: Props) {
  const DISCLAIMER_FOOTER = `\n\n---\nThis summary has been prepared with the assistance of PropertyOwl AI and is for professional reference only. It does not constitute legal advice. All findings should be independently verified by a licensed conveyancer or solicitor before being acted upon or communicated to clients.`

  // Parse the draft — could be a string or { subject, body } object
  function parseDraft(): { subject: string; body: string } {
    if (!emailDraft) {
      return {
        subject: `Property Review Summary — ${propertyAddress}`,
        body: `Dear [Client Name],\n\nI have completed my preliminary review of the property at ${propertyAddress}.\n\nPlease find below a summary of key findings from my review.\n\n[Add your analysis here]\n\nPlease do not hesitate to contact me if you have any questions.\n\nKind regards,\n[Your Name]`,
      }
    }

    if (typeof emailDraft === 'string') {
      return {
        subject: `Property Review Summary — ${propertyAddress}`,
        body: emailDraft,
      }
    }

    return {
      subject: emailDraft.subject || `Property Review Summary — ${propertyAddress}`,
      body:    emailDraft.body || '',
    }
  }

  const parsed = parseDraft()

  const [subject, setSubject] = useState(parsed.subject)
  const [body, setBody]       = useState(parsed.body)
  const [copied, setCopied]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  function getFullEmail(): string {
    return `Subject: ${subject}\n\n${body}${DISCLAIMER_FOOTER}`
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getFullEmail())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = getFullEmail()
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <span className="text-base">✉️</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-gray-900">Draft Client Email</p>
            <p className="text-xs text-gray-400 mt-0.5">
              AI-generated summary email — edit before sending
            </p>
          </div>
        </div>
        <span className={`text-gray-400 text-sm transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-6 py-5 space-y-4">

          {/* Disclaimer banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Review before sending.</strong> This draft is AI-generated and may contain
              errors or omissions. Edit it to reflect your professional assessment before sending
              to any client. The disclaimer footer below will be included automatically.
            </p>
          </div>

          {/* Subject line */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
              Email Body
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={14}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono leading-relaxed focus:outline-none focus:border-[#E8001D] transition-colors resize-y"
            />
          </div>

          {/* Footer preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              Disclaimer footer (always appended)
            </p>
            <p className="text-xs text-gray-400 leading-relaxed font-mono whitespace-pre-wrap">
              {DISCLAIMER_FOOTER.trim()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#E8001D] hover:bg-[#C4001A] text-white'
              }`}
            >
              {copied ? '✓ Copied to clipboard' : '📋 Copy full email'}
            </button>
            <button
              onClick={() => {
                setSubject(parsed.subject)
                setBody(parsed.body)
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              Reset to original
            </button>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Paste into your email client. Subject line and body are fully editable above.
          </p>
        </div>
      )}
    </div>
  )
}
