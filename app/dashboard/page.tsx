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
}

const typeIcon: Record<string, string> = {
  house: '🏠', apartment: '🏢', townhouse: '🏘️', land: '🌿', other: '🏗️',
}

// Attention level — replaces "risk score"
function attentionLevel(score: number | null): { label: string; color: string; bg: string; dot: string } {
  if (!score) return { label: 'Not reviewed', color: 'text-gray-400', bg: 'bg-gray-100', dot: 'bg-gray-300' }
  if (score >= 8) return { label: 'Needs attention', color: 'text-red-700',   bg: 'bg-red-50',   dot: 'bg-red-400' }
  if (score >= 5) return { label: 'Review carefully', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400' }
  return { label: 'Looking good', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-400' }
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [totalIssues, setTotalIssues] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: props }] = await Promise.all([
        supabase.from('profiles').select('full_name, credits').eq('id', user.id).single(),
        supabase.from('properties').select('*, is_demo').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      setProfile(prof)
      const propList = props || []
      setProperties(propList)

      // Count actual issues from reports — sum red_flags arrays
      if (propList.length > 0) {
        const ids = propList.map((p: Property) => p.id)
        const { data: reports } = await supabase
          .from('reports')
          .select('red_flags')
          .in('property_id', ids)
        if (reports) {
          const total = reports.reduce((sum: number, r: any) => {
            const flags = Array.isArray(r.red_flags) ? r.red_flags : []
            return sum + flags.length
          }, 0)
          setTotalIssues(total)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  const reviewed = properties.filter(p => p.s32_reviewed).length
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const needsAttention = properties.filter(p => p.risk_score && p.risk_score >= 8).length

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

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
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
        <Link href="/dashboard/add-property"
          className="flex items-center gap-2 bg-[#E8001D] hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
          + Add Property
        </Link>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
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
          sub={profile?.credits !== undefined
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
          label="Reviews run"
          value={reviewed}
          sub={reviewed === 0 ? 'Upload a doc to start' : `${reviewed} document${reviewed !== 1 ? 's' : ''} analysed`}
          icon="📄"
        />
        <StatCard
          label="Items to review"
          value={totalIssues}
          sub={totalIssues === 0 ? 'Across all properties' : `Across ${reviewed} review${reviewed !== 1 ? 's' : ''}`}
          icon="🔍"
          flagged={totalIssues > 0}
        />
      </div>

      {/* ── Attention banner — only if any property needs it ──────────────── */}
      {needsAttention > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-base flex-shrink-0">⚠️</span>
          <p className="text-sm text-amber-800">
            <strong>{needsAttention} propert{needsAttention > 1 ? 'ies' : 'y'}</strong> in your portfolio {needsAttention > 1 ? 'have' : 'has'} items that need your attention before signing.
          </p>
        </div>
      )}

      {/* ── Properties ────────────────────────────────────────────────────── */}
      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">My Properties</h2>
            <Link href="/dashboard/add-property" className="text-sm text-[#E8001D] font-semibold hover:underline">
              + Add another
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {properties.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, action, highlight, flagged }: {
  label: string; value: number; sub: string; icon: string
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
      <p className={`text-3xl font-extrabold leading-none ${highlight ? 'text-amber-600' : flagged ? 'text-[#E8001D]' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({ property: p }: { property: Property }) {
  const attn = attentionLevel(p.risk_score)
  const price = p.price ? `$${p.price.toLocaleString('en-AU')}` : 'Price not set'

  // Status: what stage is this property at?
  const statusLabel = !p.s32_reviewed ? 'Not yet reviewed' : 'Reviewed'
  const statusColor = !p.s32_reviewed ? 'text-gray-400 bg-gray-100' : 'text-emerald-700 bg-emerald-50'

  return (
    <Link href={`/dashboard/property/${p.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-150 overflow-hidden group cursor-pointer h-full flex flex-col">
        {/* Top accent */}
        <div className="h-1" style={{ background: p.s32_reviewed ? (p.risk_score && p.risk_score >= 8 ? '#E24B4A' : p.risk_score && p.risk_score >= 5 ? '#EF9F27' : '#16a34a') : '#D1D5DB' }} />

        <div className="p-5 flex-1 flex flex-col">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <span className="text-xl flex-shrink-0">{typeIcon[p.property_type] ?? '🏠'}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {p.is_demo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A] text-white">🦉 Demo</span>
              )}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                {p.s32_reviewed ? '✓ ' : ''}{statusLabel}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-[#E8001D] transition-colors">
              {p.address}
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">{p.suburb}{p.postcode ? ` ${p.postcode}` : ''}, VIC</p>
          </div>

          {/* Price + attention level */}
          <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Asking</p>
              <p className="text-sm font-bold text-gray-900">{price}</p>
            </div>

            {p.s32_reviewed && p.risk_score !== null ? (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${attn.bg}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${attn.dot}`} />
                <span className={`text-xs font-semibold ${attn.color}`}>{attn.label}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Not reviewed</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <span className="flex items-center gap-1 text-xs text-[#E8001D] font-semibold">
            View details <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🦉</span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">No properties yet</h3>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
        Add a property you're considering and PropertyOwl AI will help you review the documents before you bid.
      </p>
      <Link href="/dashboard/add-property"
        className="inline-block bg-[#E8001D] hover:bg-red-700 text-white px-7 py-2.5 rounded-xl font-bold text-sm transition-colors">
        Add Your First Property →
      </Link>
      <div className="mt-8 flex items-center justify-center gap-8">
        {[['📄', 'Upload S32 & Contract'], ['🔍', 'AI reviews the docs'], ['✅', 'Bid with confidence']].map(([icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <span className="text-xl">{icon}</span>
            <span className="text-xs text-gray-400 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
