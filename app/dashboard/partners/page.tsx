'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Partner {
  id: string
  full_name: string
  email: string
  phone: string | null
  partner_type: string
  company: string | null
  notes: string | null
  propertyowl_user_id: string | null
  invite_sent_at: string | null
  joined_at: string | null
  created_at: string
}

const PARTNER_TYPES = [
  { value: 'buyer_agent',       label: "Buyer's Agent",   icon: '🔍' },
  { value: 'broker',            label: 'Broker',           icon: '💼' },
  { value: 'real_estate_agent', label: 'Real Estate Agent', icon: '🏢' },
]

export default function PartnersPage() {
  const supabase = createClient()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [form, setForm]         = useState({
    full_name: '', email: '', phone: '', partner_type: 'buyer_agent', company: '', notes: ''
  })
  const [error, setError]       = useState('')
  const [userId, setUserId]     = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('crm_partners')
      .select('*')
      .eq('conveyancer_id', user.id)
      .order('full_name')

    setPartners(data ?? [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.full_name.trim() || !form.email.trim() || !userId) {
      setError('Name and email are required')
      return
    }
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('crm_partners').insert({
      conveyancer_id: userId,
      full_name:      form.full_name.trim(),
      email:          form.email.trim().toLowerCase(),
      phone:          form.phone.trim() || null,
      partner_type:   form.partner_type,
      company:        form.company.trim() || null,
      notes:          form.notes.trim() || null,
    })

    if (err) { setError('Failed: ' + err.message); setSaving(false); return }

    setForm({ full_name: '', email: '', phone: '', partner_type: 'buyer_agent', company: '', notes: '' })
    setShowAdd(false)
    setSaving(false)
    await load()
  }

  async function handleInvite(partner: Partner) {
    setInviting(partner.id)
    await fetch('/api/crm/invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'partner', contactId: partner.id }),
    })
    setInviting(null)
    await load()
  }

  function status(p: Partner) {
    if (p.joined_at || p.propertyowl_user_id) return { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' }
    if (p.invite_sent_at) return { label: 'Invited', color: 'bg-blue-500/20 text-blue-400' }
    return { label: 'CRM Only', color: 'bg-gray-500/20 text-gray-400' }
  }

  const filtered = partners.filter(p => filter === 'all' || p.partner_type === filter)

  return (
    <div className="p-6 lg:p-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">CRM</p>
          <h1 className="text-2xl font-black text-white">Partners</h1>
          <p className="text-gray-400 text-sm mt-1">Professionals involved in your deals</p>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="bg-[#E8001D] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          {showAdd ? '✕ Cancel' : '+ Add Partner'}
        </button>
      </div>

      {/* Add partner form */}
      {showAdd && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-sm font-black text-white mb-4">New Partner</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name *</label>
              <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="John Smith"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="john@agency.com.au"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Partner Type *</label>
              <select value={form.partner_type} onChange={e => setForm(f => ({ ...f, partner_type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]">
                {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Company (optional)</label>
              <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Smith Real Estate"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Phone (optional)</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="04xx xxx xxx"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notes (optional)</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes…"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          <button onClick={handleAdd} disabled={saving}
            className="mt-4 bg-[#E8001D] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Partner'}
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ value: 'all', label: `All (${partners.length})` }, ...PARTNER_TYPES.map(t => ({
          value: t.value,
          label: `${t.icon} ${t.label} (${partners.filter(p => p.partner_type === t.value).length})`
        }))].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              filter === f.value ? 'bg-[#E8001D] text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Partners list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-3xl mb-3">🤝</p>
          <p className="text-white font-bold mb-1">No partners yet</p>
          <p className="text-gray-400 text-sm">Add the professionals involved in your deals</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Partner', 'Type', 'Company', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((partner, i) => {
                const s   = status(partner)
                const typ = PARTNER_TYPES.find(t => t.value === partner.partner_type)
                return (
                  <tr key={partner.id} className={`border-b border-gray-800/50 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-white">{partner.full_name}</p>
                      <p className="text-xs text-gray-400">{partner.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-300">{typ?.icon} {typ?.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-400">{partner.company ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      {!partner.joined_at && !partner.propertyowl_user_id && (
                        <button onClick={() => handleInvite(partner)}
                          disabled={inviting === partner.id}
                          className="text-xs bg-blue-500/20 text-blue-400 font-bold px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                          {inviting === partner.id ? 'Sending…' : partner.invite_sent_at ? '↺ Resend invite' : '📨 Invite'}
                        </button>
                      )}
                      {(partner.joined_at || partner.propertyowl_user_id) && (
                        <span className="text-xs text-emerald-400">On platform</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
