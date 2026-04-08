'use client'

import { useState } from 'react'

interface Props {
  subject: string
  body: string
  propertyAddress: string
  /** If provided, sends to this specific customer. Otherwise shows a "to" input. */
  defaultTo?: string
}

/**
 * SendEmailButton
 *
 * Sends the draft email via the /api/crm/send-email endpoint.
 * Shows a recipient input if defaultTo is not provided.
 * Designed to be placed next to the "Copy full email" button in the email tab.
 */
export default function SendEmailButton({ subject, body, propertyAddress, defaultTo }: Props) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [showRecipient, setShowRecipient] = useState(false)
  const [toEmail, setToEmail] = useState(defaultTo ?? '')
  const [customerId, setCustomerId] = useState<string | null>(null)

  async function findOrPromptCustomer(email: string): Promise<string | null> {
    // Try to find customer by email from CRM
    const res = await fetch(`/api/crm/find-customer?email=${encodeURIComponent(email)}`)
    if (res.ok) {
      const data = await res.json()
      return data.customerId ?? null
    }
    return null
  }

  async function handleSend() {
    if (!toEmail) {
      setShowRecipient(true)
      return
    }

    setSending(true)
    setError('')
    setSent(false)

    // Try to find the customer in CRM
    const custId = await findOrPromptCustomer(toEmail)

    const res = await fetch('/api/crm/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: custId || 'unknown',
        to: toEmail,
        subject,
        body,
        propertyAddress,
      }),
    })

    setSending(false)

    if (res.ok) {
      setSent(true)
      setTimeout(() => setSent(false), 5000)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to send email')
    }
  }

  return (
    <div className="inline-flex flex-col gap-2">
      {showRecipient && !defaultTo && (
        <div className="flex gap-2 items-center">
          <input
            type="email"
            value={toEmail}
            onChange={e => setToEmail(e.target.value)}
            placeholder="Recipient email…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D] w-64"
          />
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
          sent
            ? 'bg-emerald-500 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } disabled:opacity-50`}
      >
        {sent ? '✓ Email Sent!' : sending ? '⏳ Sending…' : '📨 Send Email'}
      </button>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
