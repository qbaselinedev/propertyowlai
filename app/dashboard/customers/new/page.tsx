'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewCustomerPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    phone_secondary: '',
    phone_work: '',
    address_line1: '',
    address_line2: '',
    address_suburb: '',
    address_state: 'VIC',
    address_postcode: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Name and email are required')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Build address string
    const addressParts = [form.address_line1, form.address_line2, form.address_suburb, form.address_state, form.address_postcode].filter(Boolean)
    const fullAddress = addressParts.join(', ') || null

    const { error: err } = await supabase.from('crm_customers').insert({
      conveyancer_id: user.id,
      full_name:      form.full_name.trim(),
      email:          form.email.trim().toLowerCase(),
      phone:          form.phone.trim() || null,
      phone_secondary: form.phone_secondary.trim() || null,
      phone_work:     form.phone_work.trim() || null,
      address:        fullAddress,
      notes:          form.notes.trim() || null,
    })

    if (err) {
      setError('Failed to save: ' + err.message)
      setSaving(false)
      return
    }

    router.push('/dashboard/customers')
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard/customers" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">Add Customer</h1>
        <p className="text-gray-500 text-sm mt-1">Add a customer to your private CRM. You can invite them to view reports later.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">

        {/* Basic Info */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Full Name *</label>
              <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Email Address *</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                placeholder="jane@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <span>🔒</span> This is the primary email used to link their PropertyOwl account. It cannot be changed after creation.
              </p>
            </div>
          </div>
        </div>

        {/* Phone Numbers */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Phone Numbers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Mobile (Primary)</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                placeholder="04xx xxx xxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Mobile (Secondary)</label>
              <input type="tel" value={form.phone_secondary} onChange={e => update('phone_secondary', e.target.value)}
                placeholder="04xx xxx xxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Work / Landline</label>
              <input type="tel" value={form.phone_work} onChange={e => update('phone_work', e.target.value)}
                placeholder="(03) xxxx xxxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Address Line 1</label>
              <input type="text" value={form.address_line1} onChange={e => update('address_line1', e.target.value)}
                placeholder="123 Main Street"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Address Line 2</label>
              <input type="text" value={form.address_line2} onChange={e => update('address_line2', e.target.value)}
                placeholder="Unit / Suite / Level (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">Suburb</label>
              <input type="text" value={form.address_suburb} onChange={e => update('address_suburb', e.target.value)}
                placeholder="Melbourne"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">State</label>
                <select value={form.address_state} onChange={e => update('address_state', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all bg-white">
                  {['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Postcode</label>
                <input type="text" value={form.address_postcode} onChange={e => update('address_postcode', e.target.value)}
                  placeholder="3000"
                  maxLength={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">Notes (optional)</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
            placeholder="Any notes about this customer…"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all resize-none" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="bg-[#E8001D] hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Customer'}
          </button>
          <Link href="/dashboard/customers"
            className="border border-gray-200 text-gray-500 hover:text-gray-700 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
