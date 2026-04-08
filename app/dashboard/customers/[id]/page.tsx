'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Customer {
  id: string; full_name: string; email: string; phone: string | null
  phone_secondary: string | null; phone_work: string | null; address: string | null
  notes: string | null; propertyowl_user_id: string | null
  invite_sent_at: string | null; joined_at: string | null; created_at: string
}

interface LinkedProperty {
  linkId: string; property_id: string; address: string; suburb: string
  postcode: string | null; price: number | null; property_type: string
  s32_reviewed: boolean; risk_score: number | null
  validated_at: string | null; invite_sent_at: string | null
}

interface Partner {
  id: string; full_name: string; email: string
  partner_type: string; company: string | null; joined_at: string | null
}

interface SentEmail {
  id: string; to_email: string; subject: string; body: string; sent_at: string; property_address?: string
}

const PARTNER_LABELS: Record<string, string> = {
  buyer_agent: "Buyer's Agent", broker: 'Broker', real_estate_agent: 'Real Estate Agent',
}

const TYPE_ICON: Record<string, string> = {
  house: '🏠', apartment: '🏢', townhouse: '🏘️', land: '🌿', other: '🏗️',
}

export default function CustomerDetailPage() {
  const params = useParams(); const router = useRouter()
  const supabase = createClient(); const id = params?.id as string

  const [customer, setCustomer]         = useState<Customer | null>(null)
  const [properties, setProperties]     = useState<LinkedProperty[]>([])
  const [partners, setPartners]         = useState<Partner[]>([])
  const [allPartners, setAllPartners]   = useState<Partner[]>([])
  const [myProps, setMyProps]           = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [inviting, setInviting]         = useState<string | null>(null)
  const [addPropId, setAddPropId]       = useState('')
  const [addPartnerId, setAddPartnerId] = useState('')
  const [editNotes, setEditNotes]       = useState(false)
  const [notes, setNotes]               = useState('')
  const [userId, setUserId]             = useState<string | null>(null)
  const [tab, setTab]                   = useState<'properties' | 'partners' | 'notes' | 'communication'>('properties')

  // Edit customer state
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [editForm, setEditForm] = useState({
    phone: '', phone_secondary: '', phone_work: '', address: ''
  })

  // Communication state
  const [commTab, setCommTab]           = useState<'email' | 'messages'>('email')
  const [emailTab, setEmailTab]         = useState<'inbox' | 'sent' | 'compose'>('sent')
  const [sentEmails, setSentEmails]     = useState<SentEmail[]>([])
  const [composeEmail, setComposeEmail] = useState({ to: '', subject: '', body: '' })
  const [sending, setSending]           = useState(false)
  const [sendSuccess, setSendSuccess]   = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: cust } = await supabase.from('crm_customers').select('*').eq('id', id).eq('conveyancer_id', user.id).single()
    if (!cust) { router.push('/dashboard/customers'); return }
    setCustomer(cust); setNotes(cust.notes ?? '')
    setEditForm({
      phone: cust.phone ?? '',
      phone_secondary: cust.phone_secondary ?? '',
      phone_work: cust.phone_work ?? '',
      address: cust.address ?? '',
    })
    setComposeEmail(prev => ({ ...prev, to: cust.email }))

    const { data: propLinks } = await supabase
      .from('crm_customer_properties')
      .select('id, property_id, validated_at, invite_sent_at, properties(address, suburb, postcode, price, property_type, s32_reviewed, risk_score)')
      .eq('customer_id', id)

    setProperties((propLinks ?? []).map((l: any) => ({
      linkId: l.id, property_id: l.property_id,
      address: l.properties?.address ?? '', suburb: l.properties?.suburb ?? '',
      postcode: l.properties?.postcode ?? null, price: l.properties?.price ?? null,
      property_type: l.properties?.property_type ?? 'other',
      s32_reviewed: l.properties?.s32_reviewed ?? false,
      risk_score: l.properties?.risk_score ?? null,
      validated_at: l.validated_at, invite_sent_at: l.invite_sent_at,
    })))

    const { data: allMyProps } = await supabase.from('properties').select('id, address, suburb').eq('user_id', user.id).order('created_at', { ascending: false })
    setMyProps(allMyProps ?? [])

    const { data: allP } = await supabase.from('crm_partners').select('id, full_name, email, partner_type, company, joined_at').eq('conveyancer_id', user.id).order('full_name')
    setAllPartners(allP ?? [])

    const propertyIds = (propLinks ?? []).map((l: any) => l.property_id)
    if (propertyIds.length > 0) {
      const { data: pp } = await supabase.from('crm_property_partners').select('crm_partners(id, full_name, email, partner_type, company, joined_at)').in('property_id', propertyIds).eq('conveyancer_id', user.id)
      const unique: Record<string, Partner> = {}
      ;(pp ?? []).forEach((r: any) => { const p = r.crm_partners; if (p && !unique[p.id]) unique[p.id] = p })
      setPartners(Object.values(unique))
    }

    // Load sent emails
    const { data: emails } = await supabase
      .from('crm_emails')
      .select('*')
      .eq('customer_id', id)
      .eq('conveyancer_id', user.id)
      .order('sent_at', { ascending: false })
    setSentEmails(emails ?? [])

    setLoading(false)
  }

  async function handleAddProperty() {
    if (!addPropId || !userId) return
    setSaving(true)
    await supabase.from('crm_customer_properties').insert({ customer_id: id, property_id: addPropId, conveyancer_id: userId })
    setAddPropId(''); setSaving(false); await load()
  }

  async function handleAddPartner() {
    if (!addPartnerId || !userId || properties.length === 0) return
    setSaving(true)
    for (const prop of properties) {
      await supabase.from('crm_property_partners').upsert({ property_id: prop.property_id, partner_id: addPartnerId, conveyancer_id: userId }, { onConflict: 'property_id,partner_id', ignoreDuplicates: true })
    }
    setAddPartnerId(''); setSaving(false); await load()
  }

  async function handleValidate(propertyId: string) {
    setSaving(true)
    await supabase.from('crm_customer_properties').update({ validated_at: new Date().toISOString() }).eq('customer_id', id).eq('property_id', propertyId)
    setSaving(false); await load()
  }

  async function handleInvite(propertyId?: string) {
    setInviting(propertyId ?? 'main')
    await fetch('/api/crm/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'customer', contactId: id, propertyId }) })
    setInviting(null); await load()
  }

  async function handleSaveNotes() {
    await supabase.from('crm_customers').update({ notes, updated_at: new Date().toISOString() }).eq('id', id)
    setEditNotes(false); if (customer) setCustomer({ ...customer, notes })
  }

  async function handleSaveCustomerDetails() {
    setSaving(true)
    const { error } = await supabase.from('crm_customers').update({
      phone: editForm.phone.trim() || null,
      phone_secondary: editForm.phone_secondary.trim() || null,
      phone_work: editForm.phone_work.trim() || null,
      address: editForm.address.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    if (!error && customer) {
      setCustomer({
        ...customer,
        phone: editForm.phone.trim() || null,
        phone_secondary: editForm.phone_secondary.trim() || null,
        phone_work: editForm.phone_work.trim() || null,
        address: editForm.address.trim() || null,
      })
    }
    setEditingCustomer(false)
    setSaving(false)
  }

  async function handleSendEmail() {
    if (!composeEmail.to || !composeEmail.subject || !composeEmail.body) return
    setSending(true)
    setSendSuccess(false)

    const res = await fetch('/api/crm/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: id,
        to: composeEmail.to,
        subject: composeEmail.subject,
        body: composeEmail.body,
      }),
    })

    setSending(false)
    if (res.ok) {
      setSendSuccess(true)
      setComposeEmail({ to: customer?.email ?? '', subject: '', body: '' })
      setEmailTab('sent')
      setTimeout(() => setSendSuccess(false), 3000)
      await load() // Reload sent emails
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" /></div>
  if (!customer) return null

  const isActive = !!(customer.joined_at || customer.propertyowl_user_id)
  const isInvited = !!customer.invite_sent_at
  const statusLabel = isActive ? 'Active' : isInvited ? 'Invited' : 'CRM Only'
  const statusClass = isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isInvited ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'
  const dotClass = isActive ? 'bg-emerald-500' : isInvited ? 'bg-blue-500' : 'bg-gray-300'
  const unlinkedProps = myProps.filter(p => !properties.find(lp => lp.property_id === p.id))
  const unlinkedPartners = allPartners.filter(p => !partners.find(lp => lp.id === p.id))

  return (
    <div className="max-w-4xl space-y-6 pb-10">

      {/* Breadcrumb + title */}
      <div>
        <Link href="/dashboard/customers" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Back to Customers</Link>
        <p className="text-xs text-gray-400 mt-3 uppercase tracking-widest font-semibold">Customer Profile</p>
      </div>

      {/* Customer card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center text-[#E8001D] font-bold text-xl">
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.full_name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {customer.email}
                {customer.phone && ` · ${customer.phone}`}
                {customer.phone_secondary && ` · ${customer.phone_secondary}`}
                {customer.phone_work && ` · ${customer.phone_work}`}
              </p>
              {customer.address && (
                <p className="text-xs text-gray-400 mt-0.5">📍 {customer.address}</p>
              )}
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mt-2 ${statusClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />{statusLabel}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditingCustomer(true)}
              className="border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-400 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
              ✏️ Edit Details
            </button>
            {!isActive && (
              <button onClick={() => handleInvite()} disabled={inviting === 'main'}
                className="bg-[#E8001D] hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {inviting === 'main' ? '⏳ Sending…' : isInvited ? '↺ Resend Invite' : '📨 Invite to PropertyOwl'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Edit Customer Details</h2>
            <button onClick={() => setEditingCustomer(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500"><span className="font-semibold">Email:</span> {customer.email}</p>
            <p className="text-[10px] text-gray-400 mt-1">🔒 Email is the primary identifier and cannot be changed</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mobile (Primary)</label>
              <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="04xx xxx xxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mobile (Secondary)</label>
              <input type="tel" value={editForm.phone_secondary} onChange={e => setEditForm(f => ({ ...f, phone_secondary: e.target.value }))}
                placeholder="04xx xxx xxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Work / Landline</label>
              <input type="tel" value={editForm.phone_work} onChange={e => setEditForm(f => ({ ...f, phone_work: e.target.value }))}
                placeholder="(03) xxxx xxxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Address</label>
              <input type="text" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, Melbourne VIC 3000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D]" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveCustomerDetails} disabled={saving}
              className="bg-[#E8001D] hover:bg-red-700 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={() => setEditingCustomer(false)}
              className="border border-gray-200 text-gray-500 font-semibold text-sm px-5 py-2 rounded-lg hover:text-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'properties', label: `Properties (${properties.length})` },
          { key: 'partners',   label: `Partners (${partners.length})` },
          { key: 'notes',      label: 'Notes' },
          { key: 'communication', label: '💬 Communication' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Properties Tab */}
      {tab === 'properties' && (
        <div className="space-y-4">
          {properties.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
              <p className="text-3xl mb-2">🏠</p>
              <p className="text-sm font-bold text-gray-700">No properties linked yet</p>
              <p className="text-xs text-gray-400 mt-1">Link a property below</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {properties.map(p => (
                <div key={p.linkId} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{TYPE_ICON[p.property_type] ?? '🏗️'}</span>
                      <div>
                        <Link href={`/dashboard/property/${p.property_id}`} className="text-sm font-bold text-gray-900 hover:text-[#E8001D] transition-colors">
                          {p.address}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">{p.suburb}{p.postcode && `, ${p.postcode}`}</p>
                        {p.risk_score != null && (
                          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${p.risk_score >= 7 ? 'bg-red-50 text-red-600' : p.risk_score >= 4 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            Risk: {p.risk_score}/10
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {!p.validated_at && (
                        <button onClick={() => handleValidate(p.property_id)} disabled={saving}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-40">
                          ✓ Finalise
                        </button>
                      )}
                      {p.validated_at && <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Finalised</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unlinkedProps.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-bold text-gray-700 mb-1">Link a property</p>
              <p className="text-xs text-gray-400 mb-3">Associate one of your properties with this customer</p>
              <div className="flex gap-3">
                <select value={addPropId} onChange={e => setAddPropId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E8001D]">
                  <option value="">Select a property…</option>
                  {unlinkedProps.map(p => <option key={p.id} value={p.id}>{p.address} — {p.suburb}</option>)}
                </select>
                <button onClick={handleAddProperty} disabled={!addPropId || saving} className="bg-[#E8001D] text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-40 hover:bg-red-700 transition-colors">Link</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Partners Tab */}
      {tab === 'partners' && (
        <div className="space-y-4">
          {partners.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
              <p className="text-3xl mb-2">🤝</p>
              <p className="text-sm font-bold text-gray-700">No partners linked yet</p>
              <p className="text-xs text-gray-400 mt-1">Associate a partner below</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">{['Partner', 'Type', 'Company', 'Status'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody>{partners.map((p, i) => (
                  <tr key={p.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-5 py-3"><p className="text-sm font-semibold text-gray-900">{p.full_name}</p><p className="text-xs text-gray-400">{p.email}</p></td>
                    <td className="px-5 py-3"><span className="text-xs text-gray-600">{PARTNER_LABELS[p.partner_type] ?? p.partner_type}</span></td>
                    <td className="px-5 py-3"><span className="text-xs text-gray-400">{p.company ?? '—'}</span></td>
                    <td className="px-5 py-3">{p.joined_at ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">✓ Active</span> : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not joined</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {unlinkedPartners.length > 0 && properties.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-bold text-gray-700 mb-1">Associate a partner</p>
              <p className="text-xs text-gray-400 mb-3">Links the partner to all properties of this customer</p>
              <div className="flex gap-3">
                <select value={addPartnerId} onChange={e => setAddPartnerId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E8001D]">
                  <option value="">Select a partner…</option>
                  {unlinkedPartners.map(p => <option key={p.id} value={p.id}>{p.full_name} — {PARTNER_LABELS[p.partner_type] ?? p.partner_type}{p.company ? ` (${p.company})` : ''}</option>)}
                </select>
                <button onClick={handleAddPartner} disabled={!addPartnerId || saving} className="bg-[#E8001D] text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-40 hover:bg-red-700 transition-colors">Link</button>
              </div>
            </div>
          )}
          {properties.length === 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">⚠️ Add at least one property before linking partners.</div>}
        </div>
      )}

      {/* Notes Tab */}
      {tab === 'notes' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Customer Notes</h2>
            <button onClick={() => setEditNotes(e => !e)} className="text-sm text-[#E8001D] font-semibold hover:underline">{editNotes ? 'Cancel' : '✏️ Edit'}</button>
          </div>
          {editNotes ? (
            <div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder="Notes about this customer…" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8001D] resize-none mb-3" />
              <button onClick={handleSaveNotes} className="bg-[#E8001D] text-white font-semibold text-sm px-5 py-2 rounded-lg hover:bg-red-700 transition-colors">Save Notes</button>
            </div>
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{customer.notes || <span className="text-gray-400 italic">No notes yet.</span>}</p>
          )}
        </div>
      )}

      {/* Communication Tab */}
      {tab === 'communication' && (
        <div className="space-y-4">
          {/* Communication type toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button onClick={() => setCommTab('email')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${commTab === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              ✉️ Email
            </button>
            <button onClick={() => setCommTab('messages')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${commTab === 'messages' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              💬 Messages
            </button>
          </div>

          {/* Email Section */}
          {commTab === 'email' && (
            <div className="space-y-4">
              {/* Email sub-tabs */}
              <div className="flex gap-1 border-b border-gray-200">
                {[
                  { key: 'inbox',   label: '📥 Inbox' },
                  { key: 'sent',    label: `📤 Sent (${sentEmails.length})` },
                  { key: 'compose', label: '✏️ Compose' },
                ].map(t => (
                  <button key={t.key} onClick={() => setEmailTab(t.key as any)}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${emailTab === t.key ? 'border-[#E8001D] text-[#E8001D]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Inbox — placeholder */}
              {emailTab === 'inbox' && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                  <p className="text-3xl mb-2">📥</p>
                  <p className="text-sm font-bold text-gray-700">Inbox Coming Soon</p>
                  <p className="text-xs text-gray-400 mt-1">Incoming email integration will be available in a future update</p>
                </div>
              )}

              {/* Sent Emails */}
              {emailTab === 'sent' && (
                <div className="space-y-3">
                  {sendSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700 font-semibold">
                      ✓ Email sent successfully!
                    </div>
                  )}
                  {sentEmails.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                      <p className="text-3xl mb-2">📤</p>
                      <p className="text-sm font-bold text-gray-700">No emails sent yet</p>
                      <p className="text-xs text-gray-400 mt-1">Emails sent from the property analysis page or composed here will appear</p>
                      <button onClick={() => setEmailTab('compose')}
                        className="mt-4 inline-flex items-center gap-2 bg-[#E8001D] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors">
                        ✏️ Compose Email
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      {sentEmails.map((email, i) => (
                        <div key={email.id} className={`px-5 py-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-gray-900 truncate">{email.subject}</p>
                              <p className="text-xs text-gray-400 mt-0.5">To: {email.to_email}</p>
                              {email.property_address && (
                                <p className="text-xs text-gray-400">Property: {email.property_address}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{email.body.substring(0, 200)}…</p>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                              {new Date(email.sent_at).toLocaleDateString()} {new Date(email.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Compose Email */}
              {emailTab === 'compose' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900">Compose Email</h3>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">To</label>
                    <input type="email" value={composeEmail.to} onChange={e => setComposeEmail(prev => ({ ...prev, to: e.target.value }))}
                      placeholder="email@example.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Subject</label>
                    <input type="text" value={composeEmail.subject} onChange={e => setComposeEmail(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Email subject…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Message</label>
                    <textarea value={composeEmail.body} onChange={e => setComposeEmail(prev => ({ ...prev, body: e.target.value }))}
                      rows={10} placeholder="Write your email…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-y" />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      <strong>Note:</strong> This email will be sent from your PropertyOwl AI account. A disclaimer footer will be appended automatically.
                    </p>
                  </div>

                  <button onClick={handleSendEmail} disabled={sending || !composeEmail.to || !composeEmail.subject || !composeEmail.body}
                    className="bg-[#E8001D] hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
                    {sending ? '⏳ Sending…' : '📨 Send Email'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Messages Section — Integration placeholders */}
          {commTab === 'messages' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-2">Messaging Integrations</h3>
              <p className="text-sm text-gray-500 mb-6">Connect your messaging platforms to communicate with customers directly.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { name: 'WhatsApp', icon: '💬', color: 'bg-green-50 border-green-200', textColor: 'text-green-700', desc: 'Send messages via WhatsApp Business API' },
                  { name: 'WeChat', icon: '🟢', color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700', desc: 'Connect with WeChat Official Account' },
                  { name: 'Telegram', icon: '✈️', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700', desc: 'Send messages via Telegram Bot API' },
                ].map(platform => (
                  <div key={platform.name} className={`rounded-xl border p-5 text-center ${platform.color}`}>
                    <span className="text-3xl block mb-3">{platform.icon}</span>
                    <p className={`text-sm font-bold ${platform.textColor}`}>{platform.name}</p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">{platform.desc}</p>
                    <button disabled className="w-full bg-white border border-gray-200 text-gray-400 font-semibold text-xs px-4 py-2 rounded-lg cursor-not-allowed">
                      Coming Soon
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500">
                  Messaging integrations are planned for a future release. You'll be able to send and receive messages from multiple platforms in one place.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
