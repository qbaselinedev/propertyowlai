'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import BuyerDashboardPage from '@/app/dashboard/buyer/page'

// Import the original conveyancer dashboard content
import Link from 'next/link'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [isBuyer, setIsBuyer] = useState(false)

  // Conveyancer state
  const [customers, setCustomers] = useState<any[]>([])
  const [draftReports, setDraftReports] = useState(0)
  const [finalisedReports, setFinalisedReports] = useState(0)
  const [tasksPending, setTasksPending] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase.from('profiles').select('full_name, user_type, conveyancer_verified').eq('id', user.id).single()
    setProfile(prof ?? {})

    // Check if buyer
    if (!['conveyancer', 'lawyer'].includes(prof?.user_type ?? '')) {
      setIsBuyer(true)
      setLoading(false)
      return
    }

    // Conveyancer data loading
    const { data } = await supabase.from('crm_customers').select('*, crm_customer_properties(id, validated_at)')
      .eq('conveyancer_id', user.id).order('created_at', { ascending: false })
    setCustomers((data ?? []).map((c: any) => ({
      ...c, property_count: c.crm_customer_properties?.length ?? 0,
      validated_count: c.crm_customer_properties?.filter((p: any) => p.validated_at)?.length ?? 0,
    })))

    const { data: reports } = await supabase.from('reports').select('raw_analysis').eq('user_id', user.id).in('document_type', ['s32', 'contract'])
    if (reports) {
      setFinalisedReports(reports.filter((r: any) => r.raw_analysis?._professional_finalised).length)
      setDraftReports(reports.filter((r: any) => r.raw_analysis && !r.raw_analysis._professional_finalised).length)
    }

    const { count } = await supabase.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('conveyancer_id', user.id).neq('status', 'completed')
    setTasksPending(count ?? 0)

    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" /></div>

  // ── BUYER VIEW ──
  if (isBuyer) return <BuyerDashboardPage />

  // ── CONVEYANCER VIEW ──
  const total = customers.length
  const active = customers.filter(c => c.joined_at || c.propertyowl_user_id).length
  const pending = customers.filter(c => !c.invite_sent_at && !c.joined_at).length
  const firstName = profile.full_name?.split(' ')[0] || 'there'
  const typeLabel = profile.user_type === 'lawyer' ? 'Lawyer' : 'Conveyancer'

  const filtered = customers.filter(c =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  )

  function customerStatus(c: any) {
    if (c.joined_at || c.propertyowl_user_id) return { label: 'Active', dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' }
    if (c.invite_sent_at) return { label: 'Invited', dotColor: 'bg-blue-500', textColor: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' }
    return { label: 'CRM Only', dotColor: 'bg-gray-300', textColor: 'text-gray-500', badgeBg: 'bg-gray-50 border-gray-200' }
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{greeting()}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">{typeLabel} Dashboard · {total} customer{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/customers/new" className="flex items-center gap-2 bg-[#E8001D] hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm">+ Add Customer</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"><span className="text-2xl">👥</span><p className="text-3xl font-bold mt-3 text-gray-900">{total}</p><p className="text-sm font-semibold text-gray-700 mt-1.5">Total Customers</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"><span className="text-2xl">📝</span><p className="text-3xl font-bold mt-3 text-amber-600">{draftReports}</p><p className="text-sm font-semibold text-gray-700 mt-1.5">Draft Reports</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"><span className="text-2xl">✅</span><p className="text-3xl font-bold mt-3 text-emerald-600">{finalisedReports}</p><p className="text-sm font-semibold text-gray-700 mt-1.5">Finalised Reports</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"><span className="text-2xl">📌</span><p className={`text-3xl font-bold mt-3 ${tasksPending > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{tasksPending}</p><p className="text-sm font-semibold text-gray-700 mt-1.5">Tasks Pending</p></div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input type="text" placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8001D]/20 focus:border-[#E8001D] bg-white" />
      </div>

      {/* Customer cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{search ? `Results for "${search}"` : 'Recent Customers'}</h2>
          <Link href="/dashboard/customers" className="text-sm text-[#E8001D] font-semibold hover:underline">View all →</Link>
        </div>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm font-bold text-gray-700 mb-1">{search ? 'No matches' : 'No customers yet'}</p>
            {!search && <Link href="/dashboard/customers/new" className="inline-flex items-center gap-2 bg-[#E8001D] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700 mt-3">+ Add Customer</Link>}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.slice(0, 8).map(c => {
              const s = customerStatus(c)
              return (
                <Link key={c.id} href={`/dashboard/customers/${c.id}`} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center text-[#E8001D] font-bold text-sm">{c.full_name.charAt(0).toUpperCase()}</div>
                    <div><p className="text-sm font-semibold text-gray-900 group-hover:text-[#E8001D]">{c.full_name}</p><p className="text-xs text-gray-400">{c.email}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{c.property_count} propert{c.property_count !== 1 ? 'ies' : 'y'}</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${s.badgeBg} ${s.textColor}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dotColor}`} />{s.label}</span>
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
