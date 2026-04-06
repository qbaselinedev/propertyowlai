'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Profile {
  full_name: string
  credits: number
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
  _shared?: boolean   // true when this property was shared by a conveyancer
}

const typeIcon: Record<string, string> = {
  house: '🏠', apartment: '🏢', townhouse: '🏘️', land: '🌿', other: '🏗️',
}

function itemsLabel(score: number | null, reviewed: boolean): {
  label: string; color: string; bg: string; dot: string
} {
  if (!reviewed || score === null)
    return { label: 'Not yet reviewed', color: 'text-gray-400', bg: 'bg-gray-100', dot: 'bg-gray-300' }
  if (score === 0)
    return { label: 'No items detected', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-400' }
  return { label: `${score} item${score !== 1 ? 's' : ''} detected`, color: 'text-gray-600', bg: 'bg-gray-50', dot: 'bg-gray-400' }
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading]       = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile and own properties in parallel
      const [{ data: prof }, { data: ownProps }] = await Promise.all([
        supabase.from('profiles').select('full_name, credits').eq('id', user.id).single(),
        supabase.from('properties').select('*, is_demo').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      setProfile(prof)

      // Load shared properties (properties a conveyancer/lawyer has shared with this user)
      const { data: sharedAccess } = await supabase
        .from('shared_property_access')
        .select('property_id')
        .eq('user_id', user.id)

      let sharedProps: Property[] = []
      if (sharedAccess && sharedAccess.length > 0) {
        const sharedIds = sharedAccess.map((a: any) => a.property_id)
        const { data: shared } = await supabase
          .from('properties')
          .select('*, is_demo')
          .in('id', sharedIds)
        sharedProps = (shared ?? []).map((p: any) => ({ ...p, _shared: true }))
      }

      // Merge: own first, then shared (deduplicated by id)
      const ownList    = ownProps ?? []
      const ownIds     = new Set(ownList.map((p: any) => p.id))
      const dedupedShared = sharedProps.filter(p => !ownIds.has(p.id))
      const propList   = [...ownList, ...dedupedShared]
      setProperties(propList)

      // Count total items across all properties
      if (propList.length > 0) {
        const ids = propList.map((p: Property) => p.id)
        const { data: reports } = await supabase
          .from('reports')
          .select('raw_analysis')
          .in('property_id', ids)
        if (reports) {
          const total = reports.reduce((sum: number, r: any) => {
            const items = r.raw_analysis?.items_detected ?? r.raw_analysis?.red_flags ?? []
            return sum + (Array.isArray(items) ? items.length : 0)
          }, 0)
          setTotalItems(total)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  const ownProperties    = properties.filter(p => !p._shared)
  const sharedProperties = properties.filter(p => p._shared)
  const reviewed         = properties.filter(p => p.s32_reviewed).length
  const firstName        = profile?.full_name?.split(' ')[0] || 'there'
  const withItems        = properties.filter(p => p.s32_reviewed && p.risk_score && p.risk_score > 0).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-2 items-center text-gray-400">
        <div className="w-5 h-5 border-2 border-[#E8001D] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading your portfolio…</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 pb-10">

      {/* ── Hero ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{greeting()}</p>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5">
            {firstName} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {properties.length === 0
              ? 'Add a property to get started'
              : `Tracking ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        <Link
          href="/dashboard/add-property"
          className="flex items-center gap-2 bg-[#E8001D] hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
        >
          + Add Property
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Properties"
          value={properties.length}
          sub="In your portfolio"
          icon="🏠"
        />
        <StatCard
          label="Credits"
          value={profile?.credits ?? 0}
          sub={
            profile?.credits !== undefined
              ? profile.credits >= 5
                ? `~${Math.floor(profile.credits / 5)} full address${Math.floor(profile.credits / 5) !== 1 ? 'es' : ''} remaining`
                : profile.credits > 0
                  ? `${profile.credits} credit${profile.credits !== 1 ? 's' : ''} — top up to continue`
                  : 'No credits — top up to continue'
              : 'Top up anytime'
          }
          icon="💳"
          action={{ label: 'Buy credits', href: '/dashboard/buy-credits' }}
          highlight={profile?.credits !== undefined && profile.credits < 5}
        />
        <StatCard
          label="Documents reviewed"
          value={reviewed}
          sub={reviewed === 0 ? 'Upload a doc to start' : `${reviewed} document${reviewed !== 1 ? 's' : ''} processed`}
          icon="📄"
        />
        <StatCard
          label="Items detected"
          value={totalItems}
          sub={totalItems === 0 ? 'Upload docs to extract items' : `Across ${reviewed} document${reviewed !== 1 ? 's' : ''}`}
          icon="🔍"
          flagged={totalItems > 0}
        />
      </div>

      {/* ── Info banner ── */}
      {withItems > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-base flex-shrink-0">📋</span>
          <p className="text-sm text-blue-800">
            <strong>{withItems} propert{withItems > 1 ? 'ies' : 'y'}</strong> in your portfolio{' '}
            {withItems > 1 ? 'have' : 'has'} extracted document items available to view.
          </p>
        </div>
      )}

      {/* ── Own properties ── */}
      {ownProperties.length === 0 && sharedProperties.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {ownProperties.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">My Properties</h2>
                <Link href="/dashboard/add-property" className="text-sm text-[#E8001D] font-semibold hover:underline">
                  + Add another
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ownProperties.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
            </div>
          )}

          {/* ── Shared properties (from conveyancer/lawyer invite) ── */}
          {sharedProperties.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-bold text-gray-900">Shared With Me</h2>
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  Shared by your conveyancer
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sharedProperties.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Legal disclaimer ── */}
      <p className="text-xs text-gray-400 text-center pt-2">
        PropertyOwl AI extracts and displays information from uploaded documents only. Not legal advice.
        {' '}<Link href="/terms" className="underline hover:text-gray-600">Terms of Use</Link>
        {' · '}<Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>
      </p>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, action, highlight, flagged }: {
  label: string
  value: number
  sub: string
  icon: string
  action?: { label: string; href: string }
  highlight?: boolean
  flagged?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        {action && (
          <Link href={action.href} className="text-[10px] font-bold text-[#E8001D] hover:underline uppercase tracking-wide">
            {action.label}
          </Link>
        )}
      </div>
      <p className={`text-3xl font-extrabold leading-none ${highlight ? 'text-amber-600' : flagged ? 'text-gray-700' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-1.5 leading-snug">{sub}</p>
    </div>
  )
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: Property }) {
  const il = itemsLabel(property.risk_score, property.s32_reviewed)
  const price = property.price
    ? `$${(property.price / 1000).toFixed(0)}k`
    : null

  return (
    <Link
      href={`/dashboard/property/${property.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group overflow-hidden"
    >
      {/* Top colour strip */}
      <div className="h-1 bg-[#E8001D]" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900 group-hover:text-[#E8001D] transition-colors truncate">
              {property.address}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{property.suburb}{property.postcode ? ` ${property.postcode}` : ''}</p>
          </div>
          <span className="text-lg flex-shrink-0">{typeIcon[property.property_type] ?? '🏗️'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${il.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${il.dot}`} />
            <span className={`text-xs font-semibold ${il.color}`}>{il.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {price && <span className="text-xs font-bold text-gray-400">{price}</span>}
            {property._shared && (
              <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">
                Shared
              </span>
            )}
            {property.is_demo && (
              <span className="text-[10px] bg-purple-100 text-purple-600 font-bold px-1.5 py-0.5 rounded-full">
                Demo
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-16 px-6">
      <span className="text-5xl">🏠</span>
      <h3 className="text-xl font-black text-gray-900 mt-4 mb-2">No properties yet</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
        Add a Victorian property to start reviewing its Section 32 and Contract of Sale.
      </p>
      <Link
        href="/dashboard/add-property"
        className="inline-flex items-center gap-2 bg-[#E8001D] hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
      >
        + Add Your First Property
      </Link>
    </div>
  )
}
