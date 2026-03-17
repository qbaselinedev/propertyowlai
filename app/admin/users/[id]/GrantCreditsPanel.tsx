'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  userEmail: string
  currentCredits: number
}

const QUICK_AMOUNTS = [1, 3, 5, 10]

export default function GrantCreditsPanel({ userId, userEmail, currentCredits }: Props) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleGrant() {
    const credits = parseInt(amount)
    if (!credits || credits < 1) { setError('Enter a valid number of credits.'); return }
    setLoading(true)
    setError('')

    // Update credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: currentCredits + credits })
      .eq('id', userId)

    if (updateError) { setError('Failed to grant credits.'); setLoading(false); return }

    // Log transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      package_type: 'granted',
      credits_purchased: credits,
      amount_aud: 0,
      notes: notes || `Admin granted ${credits} credit${credits > 1 ? 's' : ''}`,
    })

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: userId,
      event_type: 'credits_granted',
      event_detail: { credits, notes },
    })

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      setSuccess(false)
      setAmount('')
      setNotes('')
      router.refresh()
    }, 2000)
  }

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5">
      <h3 className="text-sm font-bold text-white mb-1">Grant Free Credits</h3>
      <p className="text-xs text-gray-500 mb-4">to {userEmail}</p>

      {/* Quick amounts */}
      <div className="flex gap-2 mb-3">
        {QUICK_AMOUNTS.map((n) => (
          <button
            key={n}
            onClick={() => setAmount(String(n))}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              amount === String(n)
                ? 'bg-[#E8001D] text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Or enter custom amount"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent mb-3"
      />

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reason (optional)"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent mb-4"
      />

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <button
        onClick={handleGrant}
        disabled={loading || success}
        className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
          success
            ? 'bg-emerald-500 text-white'
            : 'bg-[#E8001D] hover:bg-red-700 text-white disabled:opacity-60'
        }`}
      >
        {success ? '✓ Credits Granted!' : loading ? 'Granting...' : `🎁 Grant ${amount || '?'} Credits`}
      </button>
    </div>
  )
}
