'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Profile {
  full_name: string
  credits: number
  user_type: string
  conveyancer_verified: boolean
}

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string | null
  propertyowl_user_id: string | null
  invite_sent_at: string | null
  joined_at: string | null
  created_at: string
  property_count: number
  validated_count: number
}

interface Property {
  id: string
  address: string
  suburb: string
  postcode: string | null
  price: number | null
  property_type: string
  risk_score: number | null
  s32_reviewed: boolean
  is_demo?: boolean
  created_at: string
  _shared?: boolean
}

const typeIcon: Record<string, string> = {
  house: '🏠', apartment: '🏢', townhouse: '🏘️', land: '🌿', other: '🏗️',
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// ─── Professional Dashboard ───────────────────────────────────────────────────

function ProfessionalDashboard({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: custs } = await supabase
      .from('crm_customers')
      .select(`*, crm_customer_properties(id, validated_at)`)
      .eq('conveyancer_id', user.id)
      .order('created_at', { ascending: false })
    setCustomers((custs ?? []).map((c: any) => ({
      ...c,
      property_count:  c.crm_customer_properties?.length ?? 0,
      validated_count: c.crm_customer_properties?.filter((p: any) => p.validated_at)?.length ?? 0,
    })))
    setLoading(false)
  }

  const [draftReports, setDraftReports]         = useState(0)
  const [finalisedReports, setFinalisedReports] = useState(0)

  useEffect(() => {
    // Count draft vs finalised reports for this conveyancer's properties
    async function loadReportStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: reports } = await supabase
        .from('reports')
        .select('raw_analysis')
        .eq('user_id', user.id)
        .in('document_type', ['s32', 'contract'])
      if (reports) {
        setFinalisedReports(reports.filter((r: any) => r.raw_analysis?._professional_finalised).length)
        setDraftReports(reports.filter((r: any) => r.raw_analysis && !r.raw_analysis._professional_finalised).length)
      }
    }
    loadReportStats()
  }, [])

  const total   = customers.length
  const active  = customers.filter(c => c.joined_at || c.propertyowl_user_id).length
  const invited = customers.filter(c => c.invite_sent_at && !c.joined_at).length
  const pending = customers.filter(c => !c.invite_sent_at && !c.joined_at).length
  const firstName = profile.full_name?.split(' ')[0] || 'there'
  const typeLabel = profile.user_type === 'lawyer' ? 'Lawyer' : 'Conveyancer'

  const filtered = customers.filter(c =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  function customerStatus(c: Customer) {
    if (c.joined_at || c.propertyowl_user_id)
      return { label: 'Active', dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' }
    if (c.invite_sent_at)
      return { label: 'Invited', dotColor: 'bg-blue-500', textColor: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' }
    return { label: 'CRM Only', dotColor: 'bg-gray-300', textColor: 'text-gray-500', badgeBg: 'bg-gray-50 border-gray-200' }
  }

  return (
    <div className="space-y-8 pb-10">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{greeting()}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">
            {typeLabel} Dashboard &middot; {total} client{total !== 1 ? 's' : ''} in your CRM
          </p>
        </div>
        <Link href="/dashboard/customers/new"
          className="flex items-center gap-2 bg-[#E8001D] hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
          <span>+</span> Add New Client
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="text-2xl">👥</span>
          <p className="text-3xl font-bold leading-none mt-3 text-gray-900">{total}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1.5">Total Clients</p>
          <p className="text-xs text-gray-400 mt-0.5">{active} active · {pending} CRM only</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="text-2xl">📝</span>
          <p className="text-3xl font-bold leading-none mt-3 text-amber-600">{draftReports}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1.5">Draft Reports</p>
          <p className="text-xs text-gray-400 mt-0.5">Not yet finalised</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="text-2xl">✅</span>
          <p className="text-3xl font-bold leading-none mt-3 text-emerald-600">{finalisedReports}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1.5">Finalised Reports</p>
          <p className="text-xs text-gray-400 mt-0.5">Professionally reviewed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <span className="text-2xl">📨</span>
          <p className="text-3xl font-bold leading-none mt-3 text-blue-600">{invited}</p>
          <p className="text-sm font-semibold text-gray-700 mt-1.5">Clients Invited</p>
          <p className="text-xs text-gray-400 mt-0.5">On PropertyOwl platform</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search clients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] transition-all bg-white"
        />
      </div>

      {/* Client cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">
            {search ? `Search results (${filtered.length})` : 'My Clients'}
          </h2>
          <Link href="/dashboard/customers" className="text-sm text-[#E8001D] font-semibold hover:underline">
            Manage all →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-base font-bold text-gray-700 mb-1">
              {search ? 'No clients match your search' : 'No clients yet'}
            </p>
            <p className="text-sm text-gray-400 mb-5">
              Add your first client to start managing their property reviews
            </p>
            {!search && (
              <Link href="/dashboard/customers/new"
                className="inline-flex items-center gap-2 bg-[#E8001D] text-white font-semibold text-sm px-5 py-2.5 rounded-lg">
                + Add First Client
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(customer => {
              const s = customerStatus(customer)
              return (
                <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}
                  className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group overflow-hidden">
                  <div className="h-1 bg-[#E8001D]" />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#E8001D] font-bold text-sm flex-shrink-0">
                          {customer.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate group-hover:text-[#E8001D] transition-colors">
                            {customer.full_name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${s.badgeBg} ${s.textColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dotColor}`} />
                        {s.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{customer.property_count}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Properties</p>
                      </div>
                      <div className="w-px h-6 bg-gray-100" />
                      <div>
                        <p className="text-lg font-bold text-emerald-600">{customer.validated_count}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Validated</p>
                      </div>
                      <div className="flex-1" />
                      <p className="text-xs text-gray-400">
                        {new Date(customer.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Regular Dashboard ────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: Property }) {
  const score = property.risk_score
  const status = !property.s32_reviewed
    ? { label: 'Not reviewed', color: 'text-gray-400', bg: 'bg-gray-50', dot: 'bg-gray-300' }
    : score === 0
      ? { label: 'No items detected', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-400' }
      : { label: `${score} item${score !== 1 ? 's' : ''} detected`, color: 'text-gray-700', bg: 'bg-gray-50', dot: 'bg-gray-400' }

  return (
    <Link href={`/dashboard/property/${property.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group overflow-hidden">
      <div className="h-1 bg-[#E8001D]" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 group-hover:text-[#E8001D] transition-colors truncate">{property.address}</p>
            <p className="text-xs text-gray-400 mt-0.5">{property.suburb}{property.postcode ? ` ${property.postcode}` : ''}</p>
          </div>
          <span className="text-xl flex-shrink-0">{typeIcon[property.property_type] ?? '🏗️'}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${status.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {property.price && <span className="text-xs font-bold text-gray-400">${(property.price / 1000).toFixed(0)}k</span>}
            {property._shared && <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">Shared</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

function RegularDashboard({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: ownProps }, { data: sharedAccess }] = await Promise.all([
        supabase.from('properties').select('*, is_demo').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('shared_property_access').select('property_id').eq('user_id', user.id),
      ])
      let sharedProps: Property[] = []
      if (sharedAccess && sharedAccess.length > 0) {
        const ids = sharedAccess.map((a: any) => a.property_id)
        const { data: shared } = await supabase.from('properties').select('*, is_demo').in('id', ids)
        sharedProps = (shared ?? []).map((p: any) => ({ ...p, _shared: true }))
      }
      const ownList = ownProps ?? []
      const ownIds = new Set(ownList.map((p: any) => p.id))
      const propList = [...ownList, ...sharedProps.filter(p => !ownIds.has(p.id))]
      setProperties(propList)
      if (propList.length > 0) {
        const { data: reports } = await supabase.from('reports').select('raw_analysis').in('property_id', propList.map(p => p.id))
        if (reports) {
          setTotalItems(reports.reduce((sum: number, r: any) => {
            const items = r.raw_analysis?.items_detected ?? r.raw_analysis?.red_flags ?? []
            return sum + (Array.isArray(items) ? items.length : 0)
          }, 0))
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const reviewed  = properties.filter(p => p.s32_reviewed).length
  const firstName = profile.full_name?.split(' ')[0] || 'there'
  const own       = properties.filter(p => !p._shared)
  const shared    = properties.filter(p => p._shared)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{greeting()}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">
            {properties.length === 0 ? 'Add a property to get started' : `Tracking ${properties.length} propert${properties.length !== 1 ? 'ies' : 'y'}`}
          </p>
        </div>
        <Link href="/dashboard/add-property"
          className="flex items-center gap-2 bg-[#E8001D] hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
          + Add Property
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Properties',  value: properties.length, sub: 'In your portfolio',   icon: '🏠', highlight: false },
          { label: 'Credits',     value: profile.credits,   sub: profile.credits < 5 ? 'Top up to continue' : 'Available', icon: '💳', highlight: profile.credits < 5, href: '/dashboard/buy-credits' },
          { label: 'Reviewed',    value: reviewed,          sub: `${reviewed} doc${reviewed !== 1 ? 's' : ''} processed`, icon: '📄', highlight: false },
          { label: 'Items Found', value: totalItems,        sub: 'Across all documents', icon: '🔍', highlight: false },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              {(card as any).href && (
                <Link href={(card as any).href} className="text-[10px] font-bold text-[#E8001D] uppercase tracking-wide hover:underline">Buy more</Link>
              )}
            </div>
            <p className={`text-3xl font-bold leading-none ${card.highlight ? 'text-amber-600' : 'text-gray-900'}`}>{card.value}</p>
            <p className="text-sm font-semibold text-gray-700 mt-1.5">{card.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-base font-bold text-gray-700 mb-1">No properties yet</p>
          <p className="text-sm text-gray-400 mb-5">Add a Victorian property to start reviewing documents</p>
          <Link href="/dashboard/add-property" className="inline-flex items-center gap-2 bg-[#E8001D] text-white font-semibold text-sm px-5 py-2.5 rounded-lg">
            + Add First Property
          </Link>
        </div>
      ) : (
        <>
          {own.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">My Properties</h2>
                <Link href="/dashboard/add-property" className="text-sm text-[#E8001D] font-semibold hover:underline">+ Add another</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {own.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
            </div>
          )}
          {shared.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-bold text-gray-900">Shared With Me</h2>
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">From your conveyancer</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {shared.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        PropertyOwl AI extracts and displays information from uploaded documents only. Not legal advice.{' '}
        <Link href="/terms" className="underline hover:text-gray-600">Terms of Use</Link>
        {' · '}<Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
      </p>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, credits, user_type, conveyancer_verified').eq('id', user.id).single()
        .then(({ data }) => { setProfile(data); setLoading(false) })
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
    </div>
  )
  if (!profile) return null

  const isProfessional = ['conveyancer', 'lawyer'].includes(profile.user_type) && profile.conveyancer_verified
  return isProfessional ? <ProfessionalDashboard profile={profile} /> : <RegularDashboard profile={profile} />
}
