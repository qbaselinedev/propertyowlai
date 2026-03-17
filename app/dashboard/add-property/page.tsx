'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AddressAutocomplete from '@/components/AddressAutocomplete'

const PROPERTY_TYPES = [
  { value: 'house', label: 'House', icon: '🏠' },
  { value: 'apartment', label: 'Apartment', icon: '🏢' },
  { value: 'townhouse', label: 'Townhouse', icon: '🏘️' },
  { value: 'land', label: 'Land', icon: '🌿' },
  { value: 'other', label: 'Other', icon: '🏗️' },
]

interface FormData {
  address: string
  suburb: string
  postcode: string
  property_type: string
  price: string
  auction_date: string
  agent_name: string
  agent_phone: string
  notes: string
}

export default function AddPropertyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    address: '',
    suburb: '',
    postcode: '',
    property_type: 'house',
    price: '',
    auction_date: '',
    agent_name: '',
    agent_phone: '',
    notes: '',
  })

  const update = (field: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit() {
    if (!form.address || !form.suburb) {
      setError('Address and suburb are required.')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data, error: err } = await supabase.from('properties').insert({
      user_id: user.id,
      address: form.address,
      suburb: form.suburb,
      postcode: form.postcode || null,
      property_type: form.property_type,
      price: form.price ? parseInt(form.price.replace(/\D/g, '')) : null,
      auction_date: form.auction_date || null,
      agent_name: form.agent_name || null,
      agent_phone: form.agent_phone || null,
      notes: form.notes || null,
      s32_reviewed: false,
    }).select().single()

    if (err) {
      setError('Failed to save property. Please try again.')
      setSaving(false)
      return
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      event_type: 'property_added',
      event_detail: { address: form.address, suburb: form.suburb },
    })

    router.push(`/dashboard/property/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
          ← Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Add a Property</h1>
          <p className="text-gray-500 text-sm mt-1">Save a property you're considering — we'll help you review it before you bid.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s === step ? 'bg-[#E8001D] text-white shadow-md' :
                s < step ? 'bg-emerald-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? '✓' : s}
              </div>
              <span className={`text-sm font-medium ${s === step ? 'text-gray-900' : 'text-gray-400'}`}>
                {s === 1 ? 'Location' : s === 2 ? 'Details' : 'Notes'}
              </span>
              {s < 3 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Step 1 — Location with autocomplete */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Property Location</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Street Address *
                </label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(val) => update('address', val)}
                  onSelect={({ address, suburb, postcode }) => {
                    setForm(f => ({ ...f, address, suburb, postcode }))
                  }}
                  placeholder="Start typing an address..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  💡 Suburb and postcode will auto-fill when you select an address
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Suburb *</label>
                  <input
                    type="text"
                    value={form.suburb}
                    onChange={(e) => update('suburb', e.target.value)}
                    placeholder="e.g. Clyde North"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Postcode</label>
                  <input
                    type="text"
                    value={form.postcode}
                    onChange={(e) => update('postcode', e.target.value)}
                    placeholder="e.g. 3978"
                    maxLength={4}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent transition-all bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Property Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {PROPERTY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => update('property_type', type.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                        form.property_type === type.value
                          ? 'border-[#E8001D] bg-red-50 text-[#E8001D]'
                          : 'border-gray-100 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-xs font-semibold">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Property Details</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expected Price / Budget</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">$</span>
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => update('price', e.target.value)}
                    placeholder="650,000"
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Auction / Inspection Date</label>
                <input
                  type="date"
                  value={form.auction_date}
                  onChange={(e) => update('auction_date', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Agent Name</label>
                  <input
                    type="text"
                    value={form.agent_name}
                    onChange={(e) => update('agent_name', e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Agent Phone</label>
                  <input
                    type="text"
                    value={form.agent_phone}
                    onChange={(e) => update('agent_phone', e.target.value)}
                    placeholder="04XX XXX XXX"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Notes */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Any Notes?</h2>
              <p className="text-sm text-gray-500 mb-6">Optional — add anything you want to remember about this property.</p>

              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={5}
                placeholder="e.g. Loved the backyard, concerned about easement on title. Vendor motivated to sell."
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D] focus:border-transparent transition-all resize-none"
              />

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Summary</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Address</span>
                  <span className="font-semibold text-gray-900">{form.address}, {form.suburb}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="font-semibold text-gray-900 capitalize">{form.property_type}</span>
                </div>
                {form.price && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-semibold text-gray-900">${parseInt(form.price.replace(/\D/g, '') || '0').toLocaleString('en-AU')}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                ← Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !form.address) { setError('Please enter the street address.'); return }
                  if (step === 1 && !form.suburb) { setError('Please enter the suburb.'); return }
                  setError('')
                  setStep(s => s + 1)
                }}
                className="bg-[#E8001D] hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="bg-[#E8001D] hover:bg-red-700 disabled:opacity-60 text-white px-8 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                ) : '🦉 Save Property'}
              </button>
            )}
          </div>
        </div>

        {error && step < 3 && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}
      </div>
    </div>
  )
}
