'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Partner {
  id: string; full_name: string; email: string; phone: string | null
  partner_type: string; company: string | null; notes: string | null
  propertyowl_user_id: string | null; invite_sent_at: string | null
  joined_at: string | null; created_at: string
}

const PARTNER_TYPES = [
  { value: 'buyer_agent',       label: "Buyer's Agent",    icon: '🔍' },
  { value: 'broker',            label: 'Broker',            icon: '💼' },
  { value: 'real_estate_agent', label: 'Real Estate Agent', icon: '🏢' },
]

const BLANK_FORM = { full_name: '', email: '', phone: '', partner_type: 'buyer_agent', company: '', notes: '' }

export default function PartnersPage() {
  const supabase = createClient()
  const [partners, setPartners]   = useState<Partner[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [inviting, setInviting]   = useState<string | null>(null)
  const [form, setForm]           = useState({ ...BLANK_FORM })
  const [error, setError]         = useState('')
  const [userId, setUserId]       = useState<string | null>(null)
  const [search, setSearch]       = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase.from('crm_partners').select('*').eq('conveyancer_id', user.id).order('full_name')
    setPartners(data ?? [])
    setLoading(false)
  }

  function startAdd() {
    setForm({ ...BLANK_FORM }); setEditId(null); setError(''); setShowForm(true)
  }

  function startEdit(p: Partner) {
    setForm({ full_name: p.full_name, email: p.email, phone: p.phone ?? '', partner_type: p.partner_type, company: p.company ?? '', notes: p.notes ?? '' })
    setEditId(p.id); setError(''); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim() || !userId) { setError('Name and email are required'); return }
    setSaving(true); setError('')

    if (editId) {
      const { error: err } = await supabase.from('crm_partners').update({
        full_name: form.full_name.trim(), email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null, partner_type: form.partner_type,
        company: form.company.trim() || null, notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editId)
      if (err) { setError('Failed: ' + err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('crm_partners').insert({
        conveyancer_id: userId, full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(), phone: form.phone.trim() || null,
        partner_type: form.partner_type, company: form.company.trim() || null,
        notes: form.notes.trim() || null,
      })
      if (err) { setError('Failed: ' + err.message); setSaving(false); return }
    }

    setForm({ ...BLANK_FORM }); setShowForm(false); setEditId(null); setSaving(false)
    await load()
  }

  async function handleInvite(partner: Partner) {
    setInviting(partner.id)
    await fetch('/api/crm/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'partner', contactId: partner.id }) })
    setInviting(null); await load()
  }

  function status(p: Partner) {
    if (p.joined_at || p.propertyowl_user_id) return { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
    if (p.invite_sent_at) return { label: 'Invited', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' }
    return { label: 'CRM Only', dot: 'bg-gray-300', text: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' }
  }

  const filtered = partners.filter(p =>
    (filter === 'all' || p.partner_type === filter) &&
    (!search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-5xl space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">CRM</p>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-1">Professionals involved in your deals — {partners.length} total</p>
        </div>
        <button onClick={startAdd}
          className="flex items-center gap-2 bg-[#E8001D] hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
          + Add Partner
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900">{editId ? 'Edit Partner' : 'Add New Partner'}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm({ ...BLANK_FORM }) }}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name *', key: 'full_name', type: 'text', placeholder: 'Jane Smith' },
              { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'jane@agency.com.au' },
              { label: 'Phone', key: 'phone', type: 'tel', placeholder: '04xx xxx xxx' },
              { label: 'Company', key: 'company', type: 'text', placeholder: 'Smith Real Estate' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Partner Type *</label>
              <select value={form.partner_type} onChange={e => setForm(fm => ({ ...fm, partner_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all bg-white">
                {PARTNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm(fm => ({ ...fm, notes: e.target.value }))}
                placeholder="Any notes…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all" />
            </div>
          </div>
          {error && <p className="px-6 pb-3 text-sm text-red-500">{error}</p>}
          <div className="px-6 pb-5 flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="bg-[#E8001D] hover:bg-red-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : editId ? 'Update Partner' : 'Add Partner'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm({ ...BLANK_FORM }) }}
              className="border border-gray-200 text-gray-500 hover:text-gray-800 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[{ value: 'all', label: `All (${partners.length})` }, ...PARTNER_TYPES.map(t => ({ value: t.value, label: `${t.icon} ${t.label} (${partners.filter(p => p.partner_type === t.value).length})` }))].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input type="text" placeholder="Search partners…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#E8001D] transition-all w-52" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Partners',    value: partners.length,                                            icon: '🤝' },
          { label: 'Active',            value: partners.filter(p => p.joined_at || p.propertyowl_user_id).length, icon: '✅' },
          { label: 'Pending Invite',    value: partners.filter(p => !p.invite_sent_at && !p.joined_at).length,    icon: '📋' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <span className="text-xl">{card.icon}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Partner list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-3xl mb-3">🤝</p>
          <p className="text-base font-bold text-gray-700 mb-1">{search || filter !== 'all' ? 'No partners match your filter' : 'No partners yet'}</p>
          <p className="text-sm text-gray-400 mb-5">Add the professionals involved in your deals</p>
          {!search && filter === 'all' && (
            <button onClick={startAdd} className="inline-flex items-center gap-2 bg-[#E8001D] text-white font-semibold text-sm px-5 py-2.5 rounded-lg">
              + Add First Partner
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Partner', 'Type & Company', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((partner, i) => {
                const s = status(partner)
                const typ = PARTNER_TYPES.find(t => t.value === partner.partner_type)
                return (
                  <tr key={partner.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#E8001D] font-bold text-xs flex-shrink-0">
                          {partner.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{partner.full_name}</p>
                          <p className="text-xs text-gray-400">{partner.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-700">{typ?.icon} {typ?.label}</p>
                      {partner.company && <p className="text-xs text-gray-400">{partner.company}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(partner)}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                          ✏️ Edit
                        </button>
                        {!partner.joined_at && !partner.propertyowl_user_id && (
                          <button onClick={() => handleInvite(partner)} disabled={inviting === partner.id}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50">
                            {inviting === partner.id ? '⏳' : partner.invite_sent_at ? '↺ Resend' : '📨 Invite'}
                          </button>
                        )}
                        {(partner.joined_at || partner.propertyowl_user_id) && (
                          <span className="text-xs text-emerald-600 font-semibold">✓ On platform</span>
                        )}
                      </div>
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
