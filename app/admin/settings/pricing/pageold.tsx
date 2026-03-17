'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_PACKAGES = [
  { id: 'starter',    name: 'Starter',    credits: 2,   price_aud: 49,  description: 'Single property review — S32 + Contract', popular: false },
  { id: 'essential',  name: 'Essential',  credits: 6,   price_aud: 119, description: '3 property reviews — best for active searchers', popular: true },
  { id: 'plus',       name: 'Plus',       credits: 10,  price_aud: 179, description: '5 property reviews — serious buyers', popular: false },
  { id: 'pro',        name: 'Pro',        credits: 30,  price_aud: 499, description: 'Annual pass — unlimited searching', popular: false },
]

export default function PricingSettingsPage() {
  const supabase = createClient()
  const [packages, setPackages] = useState(DEFAULT_PACKAGES)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('app_settings').select('*').eq('key', 'pricing').single()
      .then(({ data }) => { if (data?.value?.packages) setPackages(data.value.packages) })
  }, [])

  function update(id: string, field: string, value: any) {
    setPackages(ps => ps.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  async function save() {
    setSaving(true)
    await supabase.from('app_settings').upsert({ key: 'pricing', value: { packages } })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-bold text-[#E8001D] uppercase tracking-wider mb-1">Settings</p>
        <h1 className="text-2xl font-black text-white">Pricing</h1>
        <p className="text-gray-500 text-sm mt-1">Credit packages shown to users on the Buy Credits page</p>
      </div>

      <div className="space-y-4">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">{pkg.name}</h2>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={pkg.popular}
                  onChange={(e) => update(pkg.id, 'popular', e.target.checked)}
                  className="accent-[#E8001D]" />
                Mark as popular
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Price (AUD)</label>
                <input type="number" value={pkg.price_aud}
                  onChange={(e) => update(pkg.id, 'price_aud', Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Credits included</label>
                <input type="number" value={pkg.credits}
                  onChange={(e) => update(pkg.id, 'credits', Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description</label>
              <input type="text" value={pkg.description}
                onChange={(e) => update(pkg.id, 'description', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              ${(pkg.price_aud / pkg.credits).toFixed(2)} per credit · ${(pkg.price_aud / (pkg.credits / 2)).toFixed(2)} per analysis
            </p>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving}
        className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-[#E8001D] hover:bg-red-700 text-white disabled:opacity-60'}`}>
        {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Pricing'}
      </button>
    </div>
  )
}
