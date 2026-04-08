'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Customer {
  id: string; full_name: string; email: string; phone: string | null
  notes: string | null; propertyowl_user_id: string | null
  invite_sent_at: string | null; joined_at: string | null; created_at: string
  property_count: number; validated_count: number
}

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all' | 'active' | 'invited' | 'crm_only'>('all')
  const [userType, setUserType]   = useState<string>('conveyancer')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user type for header
    const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
    if (profile?.user_type) setUserType(profile.user_type)

    const { data } = await supabase
      .from('crm_customers')
      .select('*, crm_customer_properties(id, validated_at)')
      .eq('conveyancer_id', user.id)
      .order('created_at', { ascending: false })
    setCustomers((data ?? []).map((c: any) => ({
      ...c,
      property_count:  c.crm_customer_properties?.length ?? 0,
      validated_count: c.crm_customer_properties?.filter((p: any) => p.validated_at)?.length ?? 0,
    })))
    setLoading(false)
  }

  function status(c: Customer) {
    if (c.joined_at || c.propertyowl_user_id) return { key: 'active',    label: 'Active',    dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
    if (c.invite_sent_at)                      return { key: 'invited',   label: 'Invited',   dot: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' }
    return                                            { key: 'crm_only',  label: 'CRM Only',  dot: 'bg-gray-300',    text: 'text-gray-500',    bg: 'bg-gray-50 border-gray-200' }
  }

  const total   = customers.length
  const active  = customers.filter(c => c.joined_at || c.propertyowl_user_id).length
  const invited = customers.filter(c => c.invite_sent_at && !c.joined_at).length
  const crmOnly = customers.filter(c => !c.invite_sent_at && !c.joined_at).length

  // Calculate totals for new stat boxes
  const totalProperties = customers.reduce((sum, c) => sum + c.property_count, 0)
  const pendingToFinalise = customers.reduce((sum, c) => sum + (c.property_count - c.validated_count), 0)

  const filtered = customers.filter(c => {
    const s = status(c)
    const matchesFilter = filter === 'all' || s.key === filter
    const matchesSearch = !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const typeLabel = userType === 'lawyer' ? 'Lawyer' : 'Conveyancer'

  return (
    <div className="max-w-5xl space-y-6 pb-10">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">{typeLabel} View · CRM</p>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Your private customer list — invite them to view their property reports</p>
        </div>
        <Link href="/dashboard/customers/new"
          className="flex items-center gap-2 bg-[#E8001D] hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
          + Add New Customer
        </Link>
      </div>

      {/* Stats — 3 boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Customers',     value: total,              icon: '👥', color: 'text-gray-900' },
          { label: 'Properties Total',    value: totalProperties,    icon: '🏠', color: 'text-blue-600' },
          { label: 'Pending to Finalise', value: pendingToFinalise,  icon: '⏳', color: 'text-amber-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <span className="text-xl">{card.icon}</span>
            <p className={`text-2xl font-bold mt-2 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all',      label: `All (${total})` },
            { key: 'active',   label: `Active (${active})` },
            { key: 'invited',  label: `Invited (${invited})` },
            { key: 'crm_only', label: `CRM Only (${crmOnly})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input type="text" placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#E8001D] transition-all w-52" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-base font-bold text-gray-700 mb-1">
            {search ? 'No matches found' : 'No customers yet'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {search ? 'Try a different search' : 'Add your first customer to get started'}
          </p>
          {!search && (
            <Link href="/dashboard/customers/new" className="inline-flex items-center gap-2 bg-[#E8001D] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors">
              + Add Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Customer', 'Contact', 'Properties', 'Status', 'Added'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const s = status(c)
                return (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/customers/${c.id}`} className="group">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#E8001D] transition-colors">{c.full_name}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-gray-500">{c.email}</p>
                      {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-700">{c.property_count}</span>
                      {c.validated_count > 0 && (
                        <span className="text-xs text-emerald-600 ml-1">({c.validated_count} finalised)</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
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
