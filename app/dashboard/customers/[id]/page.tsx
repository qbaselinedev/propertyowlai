'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string | null
  notes: string | null
  propertyowl_user_id: string | null
  invite_sent_at: string | null
  invite_expires_at: string | null
  joined_at: string | null
  created_at: string
}

interface LinkedProperty {
  id: string
  property_id: string
  address: string
  suburb: string
  validated_at: string | null
  invite_sent_at: string | null
}

interface Partner {
  id: string
  full_name: string
  email: string
  partner_type: string
  joined_at: string | null
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  buyer_agent: "Buyer's Agent",
  broker: 'Broker',
  real_estate_agent: 'Real Estate Agent',
}

export default function CustomerDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const supabase = createClient()
  const id       = params?.id as string

  const [customer, setCustomer]     = useState<Customer | null>(null)
  const [properties, setProperties] = useState<LinkedProperty[]>([])
  const [partners, setPartners]     = useState<Partner[]>([])
  const [allPartners, setAllPartners] = useState<Partner[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [inviting, setInviting]     = useState<string | null>(null)
  const [addPropId, setAddPropId]   = useState('')
  const [addPartnerId, setAddPartnerId] = useState('')
  const [myProperties, setMyProperties] = useState<any[]>([])
  const [editNotes, setEditNotes]   = useState(false)
  const [notes, setNotes]           = useState('')
  const [userId, setUserId]         = useState<string | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Load customer
    const { data: cust } = await supabase
      .from('crm_customers')
      .select('*')
      .eq('id', id)
      .eq('conveyancer_id', user.id)
      .single()
    if (!cust) { router.push('/dashboard/customers'); return }
    setCustomer(cust)
    setNotes(cust.notes ?? '')

    // Load linked properties
    const { data: propLinks } = await supabase
      .from('crm_customer_properties')
      .select('id, property_id, validated_at, invite_sent_at, properties(address, suburb)')
      .eq('customer_id', id)
    setProperties((propLinks ?? []).map((l: any) => ({
      id:            l.id,
      property_id:   l.property_id,
      address:       l.properties?.address ?? '',
      suburb:        l.properties?.suburb ?? '',
      validated_at:  l.validated_at,
      invite_sent_at: l.invite_sent_at,
    })))

    // Load all conveyancer's properties for dropdown
    const { data: myProps } = await supabase
      .from('properties')
      .select('id, address, suburb')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMyProperties(myProps ?? [])

    // Load all conveyancer's partners for dropdown
    const { data: allP } = await supabase
      .from('crm_partners')
      .select('id, full_name, email, partner_type, joined_at')
      .eq('conveyancer_id', user.id)
      .order('full_name')
    setAllPartners(allP ?? [])

    // Load partners associated with this customer's properties
    const propertyIds = (propLinks ?? []).map((l: any) => l.property_id)
    if (propertyIds.length > 0) {
      const { data: pp } = await supabase
        .from('crm_property_partners')
        .select('crm_partners(id, full_name, email, partner_type, joined_at)')
        .in('property_id', propertyIds)
        .eq('conveyancer_id', user.id)
      const unique: Record<string, Partner> = {}
      ;(pp ?? []).forEach((r: any) => {
        const p = r.crm_partners
        if (p && !unique[p.id]) unique[p.id] = p
      })
      setPartners(Object.values(unique))
    }

    setLoading(false)
  }

  async function handleAddProperty() {
    if (!addPropId || !userId) return
    setSaving(true)
    await supabase.from('crm_customer_properties').insert({
      customer_id:    id,
      property_id:    addPropId,
      conveyancer_id: userId,
    })
    setAddPropId('')
    setSaving(false)
    await load()
  }

  async function handleValidateProperty(propertyId: string) {
    setSaving(true)
    await supabase.from('crm_customer_properties')
      .update({ validated_at: new Date().toISOString() })
      .eq('customer_id', id)
      .eq('property_id', propertyId)
    setSaving(false)
    await load()
  }

  async function handleInvite(propertyId?: string) {
    setInviting(propertyId ?? 'main')
    await fetch('/api/crm/invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'customer', contactId: id, propertyId }),
    })
    setInviting(null)
    await load()
  }

  async function handleSaveNotes() {
    await supabase.from('crm_customers').update({ notes, updated_at: new Date().toISOString() }).eq('id', id)
    setEditNotes(false)
    if (customer) setCustomer({ ...customer, notes })
  }

  function statusLabel() {
    if (!customer) return null
    if (customer.joined_at || customer.propertyowl_user_id)
      return <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✓ Active on PropertyOwl</span>
    if (customer.invite_sent_at)
      return <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">📨 Invite sent</span>
    return <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-500/20 text-gray-400">CRM Only</span>
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
    </div>
  )

  if (!customer) return null

  const unlinkedProps = myProperties.filter(p => !properties.find(lp => lp.property_id === p.id))

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">

      {/* Header */}
      <div>
        <Link href="/dashboard/customers" className="text-xs text-gray-400 hover:text-white transition-colors">
          ← Back to Customers
        </Link>
        <div className="flex items-start justify-between mt-3 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#E8001D]/20 flex items-center justify-center text-[#E8001D] font-black text-xl">
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{customer.full_name}</h1>
              <p className="text-gray-400 text-sm">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</p>
              <div className="mt-1">{statusLabel()}</div>
            </div>
          </div>

          {/* Main invite button */}
          {!customer.joined_at && !customer.propertyowl_user_id && (
            <button
              onClick={() => handleInvite()}
              disabled={inviting === 'main'}
              className="bg-[#E8001D] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {inviting === 'main' ? 'Sending…' : '📨 Send Invite to PropertyOwl'}
            </button>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white">Notes</p>
          <button onClick={() => setEditNotes(e => !e)}
            className="text-xs text-gray-400 hover:text-white transition-colors">
            {editNotes ? 'Cancel' : '✏️ Edit'}
          </button>
        </div>
        {editNotes ? (
          <div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-none mb-3" />
            <button onClick={handleSaveNotes}
              className="bg-[#E8001D] text-white font-bold text-xs px-4 py-2 rounded-lg">
              Save Notes
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed">
            {customer.notes || <span className="italic">No notes</span>}
          </p>
        )}
      </div>

      {/* Properties */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <p className="text-sm font-bold text-white">Properties ({properties.length})</p>
        </div>

        {properties.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">
            No properties linked yet. Add one below.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {properties.map(prop => (
              <div key={prop.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-white">{prop.address}</p>
                  <p className="text-xs text-gray-400">{prop.suburb}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {prop.validated_at ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">✓ Validated</span>
                  ) : (
                    <button onClick={() => handleValidateProperty(prop.property_id)}
                      className="text-xs bg-amber-500/20 text-amber-400 font-bold px-3 py-1 rounded-full hover:bg-amber-500/30 transition-colors">
                      Mark Validated
                    </button>
                  )}
                  {prop.validated_at && !prop.invite_sent_at && !customer.joined_at && (
                    <button onClick={() => handleInvite(prop.property_id)}
                      disabled={inviting === prop.property_id}
                      className="text-xs bg-blue-500/20 text-blue-400 font-bold px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                      {inviting === prop.property_id ? 'Sending…' : '📨 Invite to view'}
                    </button>
                  )}
                  {prop.invite_sent_at && (
                    <span className="text-xs text-gray-500">Invited {new Date(prop.invite_sent_at).toLocaleDateString('en-AU')}</span>
                  )}
                  <Link href={`/dashboard/property/${prop.property_id}`}
                    className="text-xs text-[#E8001D] hover:text-red-400 font-semibold transition-colors">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add property */}
        {unlinkedProps.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-800 flex gap-3">
            <select value={addPropId} onChange={e => setAddPropId(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]">
              <option value="">Select a property to link…</option>
              {unlinkedProps.map(p => (
                <option key={p.id} value={p.id}>{p.address}, {p.suburb}</option>
              ))}
            </select>
            <button onClick={handleAddProperty} disabled={!addPropId || saving}
              className="bg-[#E8001D] text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50">
              Link
            </button>
          </div>
        )}
      </div>

      {/* Involved Partners */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-sm font-bold text-white">Involved Partners ({partners.length})</p>
          <p className="text-xs text-gray-500 mt-0.5">Partners associated with this customer's properties</p>
        </div>
        {partners.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-500 text-sm">
            No partners involved yet. Associate partners on the property page.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {partners.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-bold flex-shrink-0">
                  {p.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{p.full_name}</p>
                  <p className="text-xs text-gray-400">{PARTNER_TYPE_LABELS[p.partner_type] ?? p.partner_type} · {p.email}</p>
                </div>
                {p.joined_at ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Not joined</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
