'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Customer {
  id: string; full_name: string; email: string; phone: string | null
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
  const [tab, setTab]                   = useState<'properties' | 'partners' | 'notes'>('properties')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: cust } = await supabase.from('crm_customers').select('*').eq('id', id).eq('conveyancer_id', user.id).single()
    if (!cust) { router.push('/dashboard/customers'); return }
    setCustomer(cust); setNotes(cust.notes ?? '')

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
        <Link href="/dashboard/customers" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Back to Clients</Link>
        <p className="text-xs text-gray-400 mt-3 uppercase tracking-widest font-semibold">Client Profile</p>
      </div>

      {/* Client card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center text-[#E8001D] font-bold text-xl">
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.full_name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{customer.email}{customer.phone && ` · ${customer.phone}`}</p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mt-2 ${statusClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />{statusLabel}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isActive && (
              <button onClick={() => handleInvite()} disabled={inviting === 'main'}
                className="bg-[#E8001D] hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {inviting === 'main' ? '⏳ Sending…' : isInvited ? '↺ Resend Invite' : '📨 Invite to PropertyOwl'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'properties', label: `Properties (${properties.length})` },
          { key: 'partners',   label: `Partners (${partners.length})` },
          { key: 'notes',      label: 'Notes' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Properties */}
      {tab === 'properties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Client Properties</h2>
            <Link href="/dashboard/add-property" className="bg-[#E8001D] text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
              + Add New Property
            </Link>
          </div>
          {properties.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
              <p className="text-3xl mb-2">🏠</p>
              <p className="text-sm font-bold text-gray-700">No properties linked yet</p>
              <p className="text-xs text-gray-400 mt-1">Link an existing property or add a new one</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.map(prop => {
                const score = prop.risk_score
                const pStatus = !prop.s32_reviewed
                  ? { label: 'Not reviewed', color: 'text-gray-400', bg: 'bg-gray-50', dot: 'bg-gray-300' }
                  : score === 0 ? { label: 'No items', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-400' }
                  : { label: `${score} item${score !== 1 ? 's' : ''}`, color: 'text-gray-700', bg: 'bg-gray-50', dot: 'bg-gray-400' }
                return (
                  <div key={prop.linkId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="h-1 bg-[#E8001D]" />
                    <div className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <span>{TYPE_ICON[prop.property_type] ?? '🏗️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{prop.address}</p>
                          <p className="text-xs text-gray-400">{prop.suburb}{prop.postcode ? ` ${prop.postcode}` : ''}</p>
                        </div>
                        {prop.price && <span className="text-xs font-bold text-gray-400">${(prop.price / 1000).toFixed(0)}k</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${pStatus.bg} ${pStatus.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pStatus.dot}`} />{pStatus.label}
                        </span>
                        {prop.validated_at
                          ? <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">✓ Validated</span>
                          : <button onClick={() => handleValidate(prop.property_id)} className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">Mark Validated</button>
                        }
                        {prop.validated_at && !isActive && !prop.invite_sent_at && (
                          <button onClick={() => handleInvite(prop.property_id)} disabled={inviting === prop.property_id}
                            className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50">
                            {inviting === prop.property_id ? 'Sending…' : '📨 Invite'}
                          </button>
                        )}
                        {prop.invite_sent_at && <span className="text-xs text-gray-400">Invited {new Date(prop.invite_sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Link href={`/dashboard/property/${prop.property_id}`} className="text-xs font-semibold text-[#E8001D] hover:underline">View analysis →</Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {unlinkedProps.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-bold text-gray-700 mb-3">Link an existing property</p>
              <div className="flex gap-3">
                <select value={addPropId} onChange={e => setAddPropId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E8001D]">
                  <option value="">Select a property…</option>
                  {unlinkedProps.map(p => <option key={p.id} value={p.id}>{p.address}, {p.suburb}</option>)}
                </select>
                <button onClick={handleAddProperty} disabled={!addPropId || saving} className="bg-[#E8001D] text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-40 hover:bg-red-700 transition-colors">Link</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Partners */}
      {tab === 'partners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Involved Partners</h2>
            <Link href="/dashboard/partners" className="text-sm text-[#E8001D] font-semibold hover:underline">Manage partners →</Link>
          </div>
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
              <p className="text-xs text-gray-400 mb-3">Links the partner to all properties of this client</p>
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

      {/* Notes */}
      {tab === 'notes' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Client Notes</h2>
            <button onClick={() => setEditNotes(e => !e)} className="text-sm text-[#E8001D] font-semibold hover:underline">{editNotes ? 'Cancel' : '✏️ Edit'}</button>
          </div>
          {editNotes ? (
            <div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder="Notes about this client…" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E8001D] resize-none mb-3" />
              <button onClick={handleSaveNotes} className="bg-[#E8001D] text-white font-semibold text-sm px-5 py-2 rounded-lg hover:bg-red-700 transition-colors">Save Notes</button>
            </div>
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{customer.notes || <span className="text-gray-400 italic">No notes yet.</span>}</p>
          )}
        </div>
      )}
    </div>
  )
}
