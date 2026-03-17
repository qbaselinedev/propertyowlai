'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const PACKAGES = [
  {
    id: 'single',
    name: '1 Property',
    price: 25,
    properties: 1,
    credits: 5,
    badge: null,
    color: '#6B7280',
    features: ['1 Online Scan', '1 Document Review', '1 Re-run buffer'],
  },
  {
    id: 'three_pack',
    name: '3 Properties',
    price: 70,
    properties: 3,
    credits: 15,
    badge: 'Most popular',
    color: '#E8001D',
    features: ['3 Online Scans', '3 Document Reviews', '3 Re-run buffers', 'Save $5 vs single'],
  },
  {
    id: 'five_pack',
    name: '5 Properties',
    price: 100,
    properties: 5,
    credits: 25,
    badge: 'Best value',
    color: '#059669',
    features: ['5 Online Scans', '5 Document Reviews', '5 Re-run buffers', 'Save $25 vs single'],
  },
]

export default function BuyCreditsPage() {
  const supabase = createClient()
  const [credits, setCredits] = useState<number>(0)
  const [email, setEmail] = useState('')
  const [notified, setNotified] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || '')
        supabase.from('profiles').select('credits').eq('id', user.id).single()
          .then(({ data }) => { if (data) setCredits(data.credits ?? 0) })
      }
    })
  }, [])

  const propertiesRemaining = Math.floor(credits / 5)
  const partialCredits = credits % 5

  async function handleNotify(packageId: string) {
    setLoading(true)
    // Log interest in activity_log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        event_type: 'payment_interest',
        event_detail: { package: packageId, email: user.email },
      })
    }
    setNotified(packageId)
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 mb-6 inline-block">← Back to dashboard</Link>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Buy Credits</h1>
        <p className="text-gray-500 text-base max-w-lg mx-auto leading-relaxed">
          Each property gets <strong className="text-gray-900">5 credits</strong> — enough for a full online scan, document review, and one re-run.
        </p>
      </div>

      {/* Current balance */}
      {credits > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current balance</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-gray-900">{credits}</p>
              <p className="text-sm text-gray-500">credits</p>
              <span className="text-gray-300 mx-1">·</span>
              <p className="text-sm font-semibold text-gray-700">
                {propertiesRemaining} full property{propertiesRemaining !== 1 ? 'es' : ''}
                {partialCredits > 0 ? ` + ${partialCredits} spare credit${partialCredits !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
          </div>
          <Link href="/dashboard"
            className="text-sm font-bold text-white px-4 py-2 rounded-xl"
            style={{ background: '#E8001D' }}>
            Use credits →
          </Link>
        </div>
      )}

      {/* How credits work */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-black text-gray-900 mb-4">How credits work</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🔍', action: 'Online Scan', cost: '1 credit', desc: 'AI searches public data — planning zone, overlays, flood risk, school zones, sold history' },
            { icon: '📄', action: 'Document Review', cost: '2 credits', desc: 'Full AI analysis of your S32 Vendor Statement + Contract of Sale' },
            { icon: '↺', action: 'Re-run / Re-scan', cost: '1–2 credits', desc: 'Re-run either analysis if you upload new documents or want fresher data' },
          ].map(({ icon, action, cost, desc }) => (
            <div key={action} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{cost}</span>
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">{action}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-black flex-shrink-0">5</div>
          <p className="text-sm text-gray-600">
            <strong className="text-gray-900">5 credits per property</strong> covers a full online scan + document review + one re-run. That's everything you need to confidently assess a property before bidding.
          </p>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {PACKAGES.map((pkg) => (
          <div key={pkg.id} className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col ${pkg.badge === 'Most popular' ? 'shadow-lg' : ''}`}
               style={{ borderColor: pkg.badge ? pkg.color : '#E5E7EB' }}>
            {pkg.badge ? (
              <div className="px-4 py-2 text-center text-xs font-black text-white" style={{ background: pkg.color }}>
                {pkg.badge}
              </div>
            ) : <div className="py-2" />}

            <div className="px-6 py-5 flex-1">
              <h3 className="text-lg font-black text-gray-900 mb-1">{pkg.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-gray-900">${pkg.price}</span>
                <span className="text-sm text-gray-400">AUD</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">${(pkg.price / pkg.properties).toFixed(0)} per property</p>

              {/* Credit breakdown visual */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Credits included</span>
                  <span className="text-sm font-black text-gray-900">{pkg.credits}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(pkg.properties, 5) }).map((_, i) => (
                    <div key={i} className="flex-1 space-y-1">
                      <div className="h-1.5 rounded-full" style={{ background: pkg.color, opacity: 0.3 }} title="Online Scan (1cr)" />
                      <div className="h-1.5 rounded-full" style={{ background: pkg.color, opacity: 0.6 }} title="Document Review (2cr)" />
                      <div className="h-1.5 rounded-full" style={{ background: pkg.color, opacity: 0.6 }} title="Document Review (2cr)" />
                      <div className="h-1.5 rounded-full" style={{ background: pkg.color, opacity: 0.15 }} title="Re-run buffer (1cr)" />
                      <div className="h-1.5 rounded-full" style={{ background: pkg.color, opacity: 0.15 }} title="Re-run buffer (1cr)" />
                    </div>
                  ))}
                  {pkg.properties > 5 && <span className="text-xs text-gray-400 self-center">+more</span>}
                </div>
                <div className="flex gap-3 mt-2">
                  {[
                    { color: 0.3, label: 'Scan' },
                    { color: 0.6, label: 'Review' },
                    { color: 0.15, label: 'Re-run' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: pkg.color, opacity: color }} />
                      <span className="text-xs text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <ul className="space-y-1.5 mb-5">
                {pkg.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-6 pb-6">
              {notified === pkg.id ? (
                <div className="w-full py-3 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 text-center">
                  ✓ We'll notify you when available!
                </div>
              ) : (
                <button
                  onClick={() => handleNotify(pkg.id)}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: pkg.badge ? pkg.color : '#111827' }}>
                  {loading ? 'Saving…' : 'Notify me when available'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
        <p className="text-sm font-bold text-amber-900 mb-1">💳 Payments coming soon</p>
        <p className="text-xs text-amber-700 leading-relaxed max-w-md mx-auto">
          We're integrating Stripe payments. Click "Notify me" on any package above and we'll email you the moment it's live.
          In the meantime, contact us at <strong>support@propertyowlai.com</strong> to purchase credits manually.
        </p>
      </div>

      {/* FAQ */}
      <div className="mt-8 space-y-3">
        <h2 className="text-sm font-black text-gray-900 mb-4">Common questions</h2>
        {[
          { q: 'Do credits expire?', a: 'No. Credits never expire — use them at your own pace across as many properties as you like.' },
          { q: 'Can I use credits across different properties?', a: 'Yes. Your credit balance applies to all properties on your account. Add a property, run a scan or upload documents, and credits are deducted automatically.' },
          { q: 'What if I want to scan more than 5 properties?', a: 'Just buy multiple packs. Your credits stack — buying two 3-packs gives you 30 credits for 6 full property assessments.' },
          { q: 'Is the PDF download free?', a: 'Yes. Downloading the Conveyancer Pack PDF or Scan Report PDF never costs credits — PDFs are generated from analysis you\'ve already run.' },
        ].map(({ q, a }) => (
          <div key={q} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-bold text-gray-900 mb-1">{q}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
