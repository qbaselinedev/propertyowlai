'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: string
  credits: number
  user_type: string | null
  conveyancer_licence_number: string | null
  conveyancer_verified: boolean
  conveyancer_pending_approval: boolean
  conveyancer_registered_name: string | null
  created_at: string
}

interface Transaction {
  user_id: string
  amount_aud: number
  package_type: string
  credits_purchased: number
}

interface UserRow extends Profile {
  tx_count: number
  tx_total: number
  tx_packages: string[]
}

const USER_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  buyer:             { label: 'Normal Buyer',  icon: '🏠', color: 'text-gray-400 bg-gray-800' },
  broker:            { label: 'Broker',         icon: '💼', color: 'text-blue-400 bg-blue-900/40' },
  buyer_agent:       { label: "Buyer's Agent",  icon: '🔍', color: 'text-purple-400 bg-purple-900/40' },
  conveyancer:       { label: 'Conveyancer',    icon: '📋', color: 'text-amber-400 bg-amber-900/40' },
  lawyer:            { label: 'Lawyer',          icon: '⚖️', color: 'text-emerald-400 bg-emerald-900/40' },
  real_estate_agent: { label: 'RE Agent',        icon: '🏢', color: 'text-pink-400 bg-pink-900/40' },
}

const PACKAGE_LABELS: Record<string, string> = {
  single: '1 Report', three_pack: '3 Pack', five_pack: '5 Pack',
  yearly: 'Annual', granted: 'Granted',
}

const ALL_USER_TYPES = Object.keys(USER_TYPE_META)
const PROFESSIONAL_TYPES = ['conveyancer', 'lawyer']

export default function AdminUsersPage() {
  const supabase = createClient()

  const [users, setUsers]           = useState<UserRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState('all')

  // Approve/reject state
  const [actioning, setActioning]       = useState<string | null>(null)
  const [rejectingId, setRejectingId]   = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Inline edit state
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ role: string; user_type: string }>({ role: 'user', user_type: 'buyer' })
  const [saving, setSaving]         = useState(false)

  // Grant credits state
  const [grantingId, setGrantingId]   = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState(1)

  // Licence lookup state
  const [lookingUp, setLookingUp]     = useState<string | null>(null)
  const [lookupResult, setLookupResult] = useState<Record<string, any>>({})

  async function load() {
    setLoading(true)
    const { data: profiles, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false })

    if (error) console.error('Error loading profiles:', error.message,
      '— Run migration SQL to add admin RLS policies')

    const { data: transactions } = await supabase
      .from('transactions').select('user_id, amount_aud, package_type, credits_purchased')

    const txMap: Record<string, { count: number; total: number; packages: string[] }> = {}
    for (const tx of (transactions || []) as Transaction[]) {
      if (!txMap[tx.user_id]) txMap[tx.user_id] = { count: 0, total: 0, packages: [] }
      txMap[tx.user_id].count++
      txMap[tx.user_id].total += Number(tx.amount_aud)
      if (!txMap[tx.user_id].packages.includes(tx.package_type))
        txMap[tx.user_id].packages.push(tx.package_type)
    }

    const rows: UserRow[] = ((profiles || []) as Profile[]).map(p => ({
      ...p,
      tx_count:    txMap[p.id]?.count    ?? 0,
      tx_total:    txMap[p.id]?.total    ?? 0,
      tx_packages: txMap[p.id]?.packages ?? [],
    }))

    setUsers(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Approve / Reject ──────────────────────────────────────────────────────

  async function handleApprove(userId: string) {
    setActioning(userId)
    const res = await fetch('/api/admin/approve-user', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'approve' }),
    })
    const data = await res.json()
    if (!data.success) console.error('Approve failed:', data.error)
    setActioning(null)
    await load()
  }

  async function handleReject(userId: string) {
    setActioning(userId)
    const res = await fetch('/api/admin/approve-user', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'reject', reason: rejectReason || undefined }),
    })
    const data = await res.json()
    if (!data.success) console.error('Reject failed:', data.error)
    setActioning(null)
    setRejectingId(null)
    setRejectReason('')
    await load()
  }

  // ── Licence lookup ────────────────────────────────────────────────────────

  async function lookupLicence(userId: string, licence: string) {
    setLookingUp(userId)
    const res  = await fetch(`/api/verify-conveyancer?licence=${encodeURIComponent(licence)}`)
    const data = await res.json()
    setLookupResult(prev => ({ ...prev, [userId]: data }))
    setLookingUp(null)
  }

  // ── Inline edit ───────────────────────────────────────────────────────────

  async function saveEdit(userId: string) {
    setSaving(true)
    await supabase.from('profiles').update({
      role:       editValues.role,
      user_type:  editValues.user_type,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
    setEditingId(null)
    setSaving(false)
    await load()
  }

  // ── Grant credits ─────────────────────────────────────────────────────────

  async function grantCredits(user: UserRow) {
    setSaving(true)
    await supabase.from('profiles')
      .update({ credits: (user.credits ?? 0) + creditAmount, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    await supabase.from('transactions').insert({
      user_id: user.id, package_type: 'granted',
      credits_purchased: creditAmount, amount_aud: 0,
      notes: `Admin granted ${creditAmount} credit${creditAmount > 1 ? 's' : ''}`,
    })
    await supabase.from('activity_log').insert({
      user_id: user.id, event_type: 'credits_granted',
      event_detail: { credits: creditAmount, granted_by_admin: true },
    })
    setGrantingId(null)
    setSaving(false)
    await load()
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  const pending  = users.filter(u => u.conveyancer_pending_approval && !u.conveyancer_verified)
  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || (u.email ?? '').toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q)
    const matchType   = filterType === 'all' || u.user_type === filterType
    return matchSearch && matchType
  })

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-full">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-black text-white">Users</h1>
        <p className="text-gray-400 text-sm mt-1">{users.length} total users</p>
      </div>

      {/* ── PENDING APPROVALS — shown at top when there are pending users ── */}
      {pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
            <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider">
              Pending Approval ({pending.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pending.map(user => {
              const typeLabel  = USER_TYPE_META[user.user_type ?? 'buyer']?.label ?? user.user_type
              const isActioning = actioning === user.id
              const isRejecting = rejectingId === user.id
              const lookup      = lookupResult[user.id]

              return (
                <div key={user.id} className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">

                    {/* User info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                        {(user.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm">{user.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                            {USER_TYPE_META[user.user_type ?? 'buyer']?.icon} {typeLabel}
                          </span>
                          <span className="text-xs text-gray-500">Registered {fmtDate(user.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isRejecting ? (
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={!!isActioning}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isActioning ? '…' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => setRejectingId(user.id)}
                          disabled={!!isActioning}
                          className="bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs font-bold px-4 py-2 rounded-lg transition-colors border border-red-500/30 disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 w-48"
                        />
                        <button
                          onClick={() => handleReject(user.id)}
                          disabled={!!isActioning}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                        >
                          {isActioning ? '…' : 'Confirm Reject'}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason('') }}
                          className="text-xs text-gray-500 hover:text-white"
                        >Cancel</button>
                      </div>
                    )}
                  </div>

                  {/* Licence info + lookup */}
                  {user.conveyancer_licence_number && (
                    <div className="mt-4 pt-4 border-t border-amber-500/20">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-xs text-gray-400">
                          Licence: <span className="font-mono text-white">{user.conveyancer_licence_number}</span>
                        </div>

                        {/* Lookup button */}
                        {!lookup ? (
                          <button
                            onClick={() => lookupLicence(user.id, user.conveyancer_licence_number!)}
                            disabled={lookingUp === user.id}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
                          >
                            {lookingUp === user.id ? 'Checking…' : '🔍 Check VIC Register'}
                          </button>
                        ) : (
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold ${
                            lookup.found
                              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-900/30 text-red-400 border border-red-500/30'
                          }`}>
                            {lookup.found
                              ? `✓ Found: ${lookup.registeredName}`
                              : `✗ ${lookup.message || lookup.error || 'Not found'}`
                            }
                          </div>
                        )}

                        {/* Direct link to register */}
                        <a
                          href={`https://registers.consumer.vic.gov.au/CvSearch/PerformSearch?NameOrLicenceNumber=LicenceNumber&LicenceNumber=${encodeURIComponent(user.conveyancer_licence_number)}&IncludeNonCurrentLicensees=False`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#E8001D] hover:text-red-400 transition-colors"
                        >
                          Open in VIC Register ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── FILTERS ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text" placeholder="Search name or email…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D] w-60"
        />
        <select
          value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]"
        >
          <option value="all">All user types</option>
          {ALL_USER_TYPES.map(t => (
            <option key={t} value={t}>{USER_TYPE_META[t].icon} {USER_TYPE_META[t].label}</option>
          ))}
        </select>
        {(search || filterType !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterType('all') }}
            className="text-xs text-gray-500 hover:text-white px-3 py-2 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* ── USERS TABLE ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="bg-[#111827] rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-white/10">
                    {['User', 'User Type', 'Role', 'Credits', 'Packages', 'Spent', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                      {users.length === 0
                        ? '⚠️ No users loaded. Run migration SQL to add admin RLS policies.'
                        : 'No users match your filters.'}
                    </td></tr>
                  ) : filtered.map((user, i) => {
                    const typeMeta   = USER_TYPE_META[user.user_type ?? 'buyer'] ?? USER_TYPE_META['buyer']
                    const isEditing  = editingId === user.id
                    const isGranting = grantingId === user.id
                    const isPending  = user.conveyancer_pending_approval && !user.conveyancer_verified
                    const isPro      = PROFESSIONAL_TYPES.includes(user.user_type ?? '')

                    return (
                      <tr key={user.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                        isPending ? 'bg-amber-500/5' : i % 2 === 0 ? '' : 'bg-white/[0.01]'
                      }`}>
                        {/* User */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#E8001D]/20 flex items-center justify-center text-[#E8001D] text-xs font-bold flex-shrink-0">
                              {(user.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate max-w-[130px]">{user.full_name ?? '—'}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[130px]">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* User Type */}
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <select value={editValues.user_type} onChange={e => setEditValues(v => ({ ...v, user_type: e.target.value }))}
                              className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none">
                              {ALL_USER_TYPES.map(t => <option key={t} value={t}>{USER_TYPE_META[t].icon} {USER_TYPE_META[t].label}</option>)}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${typeMeta.color}`}>
                              {typeMeta.icon} {typeMeta.label}
                            </span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <select value={editValues.role} onChange={e => setEditValues(v => ({ ...v, role: e.target.value }))}
                              className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none">
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              user.role === 'admin' ? 'bg-[#E8001D]/20 text-[#E8001D]' : 'bg-gray-800 text-gray-400'
                            }`}>{user.role === 'admin' ? '👑 Admin' : 'User'}</span>
                          )}
                        </td>

                        {/* Credits */}
                        <td className="px-4 py-3.5">
                          {isGranting ? (
                            <div className="flex items-center gap-1.5">
                              <input type="number" min={1} max={100} value={creditAmount}
                                onChange={e => setCreditAmount(Number(e.target.value))}
                                className="w-12 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none" />
                              <button onClick={() => grantCredits(user)} disabled={saving}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded disabled:opacity-50">
                                +Add
                              </button>
                              <button onClick={() => setGrantingId(null)} className="text-xs text-gray-500 hover:text-white">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-bold ${(user.credits ?? 0) > 0 ? 'text-white' : 'text-gray-500'}`}>{user.credits ?? 0}</span>
                              <button onClick={() => { setGrantingId(user.id); setCreditAmount(1) }}
                                className="text-xs text-gray-600 hover:text-emerald-400 font-bold transition-colors" title="Grant credits">+</button>
                            </div>
                          )}
                        </td>

                        {/* Packages */}
                        <td className="px-4 py-3.5">
                          {user.tx_packages.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.tx_packages.map(pkg => (
                                <span key={pkg} className="text-xs bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">
                                  {PACKAGE_LABELS[pkg] ?? pkg}
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-xs text-gray-600">—</span>}
                        </td>

                        {/* Total Spent */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-white">
                            {user.tx_total > 0 ? `$${user.tx_total.toFixed(0)}` : '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {isPro ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              user.conveyancer_verified
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isPending
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {user.conveyancer_verified ? '✓ Verified' : isPending ? '⏳ Pending' : '✗ Unverified'}
                            </span>
                          ) : <span className="text-xs text-gray-600">—</span>}
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(user.created_at)}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => saveEdit(user.id)} disabled={saving}
                                className="text-xs bg-[#E8001D] hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50">
                                {saving ? '…' : 'Save'}
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="text-xs text-gray-500 hover:text-white px-2 py-1.5 rounded border border-gray-700 transition-colors">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setEditingId(user.id); setEditValues({ role: user.role ?? 'user', user_type: user.user_type ?? 'buyer' }) }}
                                className="text-xs text-gray-400 hover:text-white font-medium px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 transition-colors">
                                Edit
                              </button>
                              <a href={`/admin/users/${user.id}`}
                                className="text-xs text-[#E8001D] hover:text-red-400 font-semibold transition-colors">
                                View →
                              </a>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Showing {filtered.length} of {users.length} users</p>
        </>
      )}
    </div>
  )
}
