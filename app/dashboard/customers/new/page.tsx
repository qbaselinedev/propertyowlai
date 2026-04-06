'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewCustomerPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', notes: '' })
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

    const { error: err } = await supabase.from('crm_customers').insert({
      conveyancer_id: user.id,
      full_name:      form.full_name.trim(),
      email:          form.email.trim().toLowerCase(),
      phone:          form.phone.trim() || null,
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
    <div className="p-6 lg:p-8 max-w-xl">
      <div className="mb-6">
        <Link href="/dashboard/customers" className="text-xs text-gray-400 hover:text-white transition-colors">
          ← Back to Customers
        </Link>
        <h1 className="text-2xl font-black text-white mt-3">Add Customer</h1>
        <p className="text-gray-400 text-sm mt-1">Add a client to your private CRM. You can invite them to view reports later.</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name *</label>
          <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
            placeholder="Jane Smith"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address *</label>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
            placeholder="jane@example.com"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" />
          <p className="text-xs text-gray-500 mt-1">This email is used to link their PropertyOwl account when they join.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Phone (optional)</label>
          <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
            placeholder="04xx xxx xxx"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Notes (optional)</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
            placeholder="Any notes about this client…"
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-none" />
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="bg-[#E8001D] hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Customer'}
          </button>
          <Link href="/dashboard/customers"
            className="border border-gray-700 text-gray-400 hover:text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
