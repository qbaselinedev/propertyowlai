'use client'

import { useEffect, useState } from 'react'
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
  joined_at: string | null
  created_at: string
  property_count?: number
}

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('crm_customers')
      .select(`
        *,
        crm_customer_properties ( count )
      `)
      .eq('conveyancer_id', user.id)
      .order('created_at', { ascending: false })

    setCustomers((data ?? []).map((c: any) => ({
      ...c,
      property_count: c.crm_customer_properties?.[0]?.count ?? 0,
    })))
    setLoading(false)
  }

  function status(c: Customer) {
    if (c.joined_at || c.propertyowl_user_id) return { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' }
    if (c.invite_sent_at) return { label: 'Invited', color: 'bg-blue-500/20 text-blue-400' }
    return { label: 'CRM Only', color: 'bg-gray-500/20 text-gray-400' }
  }

  const filtered = customers.filter(c =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">CRM</p>
          <h1 className="text-2xl font-black text-white">Customers</h1>
          <p className="text-gray-400 text-sm mt-1">Your private client list — invite them to view their property reports</p>
        </div>
        <Link
          href="/dashboard/customers/new"
          className="bg-[#E8001D] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          + Add Customer
        </Link>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D] mb-6"
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Customers', value: customers.length },
          { label: 'Invited', value: customers.filter(c => c.invite_sent_at && !c.joined_at).length },
          { label: 'Active on Platform', value: customers.filter(c => c.joined_at || c.propertyowl_user_id).length },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-white font-bold mb-1">{search ? 'No customers match your search' : 'No customers yet'}</p>
          <p className="text-gray-400 text-sm mb-4">Add your first client to get started</p>
          {!search && (
            <Link href="/dashboard/customers/new"
              className="inline-block bg-[#E8001D] text-white font-bold text-sm px-5 py-2.5 rounded-xl">
              + Add First Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => {
            const s = status(customer)
            return (
              <Link
                key={customer.id}
                href={`/dashboard/customers/${customer.id}`}
                className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl px-5 py-4 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#E8001D]/20 flex items-center justify-center text-[#E8001D] font-bold text-sm flex-shrink-0">
                  {customer.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{customer.full_name}</p>
                  <p className="text-xs text-gray-400">{customer.email}{customer.phone ? ` · ${customer.phone}` : ''}</p>
                </div>

                {/* Property count */}
                <div className="text-center flex-shrink-0">
                  <p className="text-sm font-bold text-white">{customer.property_count ?? 0}</p>
                  <p className="text-xs text-gray-500">Properties</p>
                </div>

                {/* Status */}
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${s.color}`}>
                  {s.label}
                </span>

                {/* Arrow */}
                <span className="text-gray-600 group-hover:text-white transition-colors">→</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
