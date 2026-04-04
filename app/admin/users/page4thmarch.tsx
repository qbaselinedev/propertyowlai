'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types matching live schema exactly ────────────────────────────────────────

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: string
  credits: number
  // New columns added by migration:
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

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  buyer:             { label: 'Normal Buyer',  icon: '🏠', color: 'text-gray-400 bg-gray-800' },
  broker:            { label: 'Broker',         icon: '💼', color: 'text-blue-400 bg-blue-900/40' },
  buyer_agent:       { label: "Buyer's Agent",  icon: '🔍', color: 'text-purple-400 bg-purple-900/40' },
  conveyancer:       { label: 'Conveyancer',    icon: '📋', color: 'text-amber-400 bg-amber-900/40' },
  lawyer:            { label: 'Lawyer',          icon: '⚖️', color: 'text-emerald-400 bg-emerald-900/40' },
  real_estate_agent: { label: 'RE Agent',        icon: '🏢', color: 'text-pink-400 bg-pink-900/40' },
}

// Matches live transactions.package_type check constraint exactly:
// 'single' | 'three_pack' | 'five_pack' | 'yearly' | 'granted'
const PACKAGE_LABELS: Record<string, string> = {
  single:     '1 Report',
  three_pack: '3 Pack',
  five_pack:  '5 Pack',
  yearly:     'Annual',
  granted:    'Granted',
}

const ALL_USER_TYPES = Object.keys(USER_TYPE_META)

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const supabase = createClient()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPending, setFilterPending] = useState(false)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    role: string
    user_type: string
    conveyancer_verified: boolean
    conveyancer_pending_approval: boolean
  }>({ role: 'user', user_type: 'buyer', conveyancer_verified: false, conveyancer_pending_approval: false })
  const [saving, setSaving] = useState(false)

  // Grant credits state
  const [grantingId, setGrantingId] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState(1)

  async function load() {
    setLoading(true)

    // Fetch all profiles — requires admin RLS policy from migration
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error loading profiles:', profilesError.message,
        '— Have you run the migration SQL to add admin RLS policies?')
    }

    // Fetch transactions to aggregate spend per user
    // Columns confirmed in live schema: user_id, amount_aud, package_type, credits_purchased
    const { data: transactions } = await supabase
      .from('transactions')
      .select('user_id, amount_aud, package_type, credits_purchased')

    // Build per-user transaction summary
    const txMap: Record<string, { count: number; total: number; packages: string[] }> = {}
    for (const tx of (transactions || []) as Transaction[]) {
      if (!txMap[tx.user_id]) txMap[tx.user_id] = { count: 0, total: 0, packages: [] }
      txMap[tx.user_id].count++
      txMap[tx.user_id].total += Number(tx.amount_aud)
      if (!txMap[tx.user_id].packages.includes(tx.package_type)) {
        txMap[tx.user_id].packages.push(tx.package_type)
      }
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

  // ── Edit handlers ────────────────────────────────────────────────────────────

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setEditValues({
      role:                         user.role ?? 'user',
      user_type:                    user.user_type ?? 'buyer',
      conveyancer_verified:         user.conveyancer_verified ?? false,
      conveyancer_pending_approval: user.conveyancer_pending_approval ?? false,
    })
  }

  async function saveEdit(userId: string) {
    setSaving(true)
    const updates = {
      role:                         editValues.role,
      user_type:                    editValues.user_type,
      conveyancer_verified:         editValues.conveyancer_verified,
      // If marking as verified, automatically clear pending flag
      conveyancer_pending_approval: editValues.conveyancer_verified
        ? false
        : editValues.conveyancer_pending_approval,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (error) console.error('Save error:', error.message)
    setEditingId(null)
    setSaving(false)
    await load()
  }

  // ── Grant credits ────────────────────────────────────────────────────────────

  async function grantCredits(user: UserRow) {
    if (creditAmount < 1) return
    setSaving(true)

    // Update credits balance
    await supabase
      .from('profiles')
      .update({ credits: (user.credits ?? 0) + creditAmount, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    // Record in transactions — package_type 'granted' is valid per live constraint
    await supabase.from('transactions').insert({
      user_id:           user.id,
      package_type:      'granted',
      credits_purchased: creditAmount,
      amount_aud:        0,
      notes:             `Admin granted ${creditAmount} credit${creditAmount > 1 ? 's' : ''}`,
    })

    // Log activity — 'credits_granted' is valid per live activity_log_event_type_check
    await supabase.from('activity_log').insert({
      user_id:      user.id,
      event_type:   'credits_granted',
      event_detail: { credits: creditAmount, granted_by_admin: true },
    })

    setGrantingId(null)
    setSaving(false)
    await load()
  }

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch  = !q || (u.email ?? '').toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q)
    const matchType    = filterType === 'all' || u.user_type === filterType
    const matchPending = !filterPending || (u.conveyancer_pending_approval && !u.conveyancer_verified)
    return matchSearch && matchType && matchPending
  })

  const pendingCount = users.filter(u => u.conveyancer_pending_approval && !u.conveyancer_verified).length

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-full">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-2xl font-black text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-1">{users.length} total users</p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => setFilterPending(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
              filterPending
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500/20'
            }`}
          >
            ⏳ {pendingCount} pending conveyancer{pendingCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D] w-60"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]"
        >
          <option value="all">All user types</option>
          {ALL_USER_TYPES.map(t => (
            <option key={t} value={t}>{USER_TYPE_META[t].icon} {USER_TYPE_META[t].label}</option>
          ))}
        </select>
        {(search || filterType !== 'all' || filterPending) && (
          <button
            onClick={() => { setSearch(''); setFilterType('all'); setFilterPending(false) }}
            className="text-xs text-gray-500 hover:text-white px-3 py-2 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="bg-[#111827] rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-white/10">
                    {['User', 'User Type', 'Role', 'Credits', 'Packages', 'Spent', 'Conveyancer', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                        {users.length === 0
                          ? '⚠️ No users loaded. Run the migration SQL to add admin RLS policies first.'
                          : 'No users match your filters.'}
                      </td>
                    </tr>
                  ) : filtered.map((user, i) => {
                    const typeMeta   = USER_TYPE_META[user.user_type ?? 'buyer'] ?? USER_TYPE_META['buyer']
                    const isEditing  = editingId === user.id
                    const isGranting = grantingId === user.id
                    const isPending  = user.conveyancer_pending_approval && !user.conveyancer_verified

                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                          isPending ? 'bg-amber-500/5' : i % 2 === 0 ? '' : 'bg-white/[0.01]'
                        }`}
                      >
                        {/* User */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#E8001D]/20 flex items-center justify-center text-[#E8001D] text-xs font-bold flex-shrink-0">
                              {(user.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate max-w-[140px]">{user.full_name ?? '—'}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[140px]">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* User Type */}
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <select
                              value={editValues.user_type}
                              onChange={e => setEditValues(v => ({ ...v, user_type: e.target.value }))}
                              className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-[#E8001D]"
                            >
                              {ALL_USER_TYPES.map(t => (
                                <option key={t} value={t}>{USER_TYPE_META[t].icon} {USER_TYPE_META[t].label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${typeMeta.color}`}>
                              {typeMeta.icon} {typeMeta.label}
                            </span>
                          )}
                        </td>

                        {/* Role — values constrained to 'user' | 'admin' */}
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <select
                              value={editValues.role}
                              onChange={e => setEditValues(v => ({ ...v, role: e.target.value }))}
                              className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-[#E8001D]"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              user.role === 'admin' ? 'bg-[#E8001D]/20 text-[#E8001D]' : 'bg-gray-800 text-gray-400'
                            }`}>
                              {user.role === 'admin' ? '👑 Admin' : 'User'}
                            </span>
                          )}
                        </td>

                        {/* Credits */}
                        <td className="px-4 py-3.5">
                          {isGranting ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number" min={1} max={100}
                                value={creditAmount}
                                onChange={e => setCreditAmount(Number(e.target.value))}
                                className="w-12 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none"
                              />
                              <button
                                onClick={() => grantCredits(user)}
                                disabled={saving}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded disabled:opacity-50"
                              >
                                +Add
                              </button>
                              <button onClick={() => setGrantingId(null)} className="text-xs text-gray-500 hover:text-white">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-bold ${(user.credits ?? 0) > 0 ? 'text-white' : 'text-gray-500'}`}>
                                {user.credits ?? 0}
                              </span>
                              <button
                                onClick={() => { setGrantingId(user.id); setCreditAmount(1) }}
                                className="text-xs text-gray-600 hover:text-emerald-400 font-bold transition-colors"
                                title="Grant credits"
                              >+</button>
                            </div>
                          )}
                        </td>

                        {/* Packages from transactions */}
                        <td className="px-4 py-3.5">
                          {user.tx_packages.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.tx_packages.map(pkg => (
                                <span key={pkg} className="text-xs bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">
                                  {PACKAGE_LABELS[pkg] ?? pkg}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>

                        {/* Total spent from transactions.amount_aud */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-white">
                            {user.tx_total > 0 ? `$${user.tx_total.toFixed(0)}` : '—'}
                          </span>
                        </td>

                        {/* Conveyancer */}
                        <td className="px-4 py-3.5">
                          {user.conveyancer_licence_number ? (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400 font-mono">#{user.conveyancer_licence_number}</div>
                              {isEditing ? (
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editValues.conveyancer_verified}
                                    onChange={e => setEditValues(v => ({ ...v, conveyancer_verified: e.target.checked }))}
                                    className="accent-emerald-500"
                                  />
                                  <span className="text-xs text-gray-300">Mark verified</span>
                                </label>
                              ) : (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  user.conveyancer_verified
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : isPending
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {user.conveyancer_verified ? '✓ Verified' : isPending ? '⏳ Pending' : '✗ Unverified'}
                                </span>
                              )}
                              {user.conveyancer_registered_name && (
                                <div className="text-xs text-gray-500 italic">{user.conveyancer_registered_name}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-700">—</span>
                          )}
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(user.created_at)}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => saveEdit(user.id)}
                                disabled={saving}
                                className="text-xs bg-[#E8001D] hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                              >
                                {saving ? '…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs text-gray-500 hover:text-white px-2 py-1.5 rounded border border-gray-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit(user)}
                                className="text-xs text-gray-400 hover:text-white font-medium px-3 py-1.5 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                              >
                                Edit
                              </button>
                              <a
                                href={`/admin/users/${user.id}`}
                                className="text-xs text-[#E8001D] hover:text-red-400 font-semibold transition-colors"
                              >
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
