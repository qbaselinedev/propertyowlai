'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface SharedProperty {
  property_id: string; address: string; suburb: string; postcode: string|null
  property_type: string; price: number|null; risk_score: number|null
  validated_at: string|null; conveyancer_name: string
}

const TI: Record<string,string> = { house:'🏠', apartment:'🏢', townhouse:'🏘️', land:'🌿', other:'🏗️' }

export default function BuyerDashboardPage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<SharedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    setUserName(profile?.full_name ?? user.email?.split('@')[0] ?? 'there')

    // Find customer records matching this user's email
    const { data: custRecords } = await supabase.from('crm_customers').select('id').eq('email', user.email?.toLowerCase())
    if (!custRecords || custRecords.length === 0) { setLoading(false); return }

    const custIds = custRecords.map(c => c.id)

    // Fetch linked properties
    const { data: links } = await supabase
      .from('crm_customer_properties')
      .select('property_id, validated_at, properties(address, suburb, postcode, property_type, price, risk_score), crm_customers(conveyancer_id)')
      .in('customer_id', custIds)

    const props: SharedProperty[] = []
    for (const link of (links ?? [])) {
      const p = (link as any).properties
      const convId = (link as any).crm_customers?.conveyancer_id
      let convName = 'Your conveyancer'
      if (convId) {
        const { data: convProfile } = await supabase.from('profiles').select('full_name').eq('id', convId).single()
        convName = convProfile?.full_name ?? convName
      }
      if (p) {
        props.push({
          property_id: link.property_id, address: p.address, suburb: p.suburb,
          postcode: p.postcode, property_type: p.property_type ?? 'other',
          price: p.price, risk_score: p.risk_score, validated_at: link.validated_at,
          conveyancer_name: convName,
        })
      }
    }
    setProperties(props)
    setLoading(false)
  }

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 pb-10">
      <div>
        <p className="text-sm text-gray-400">{greeting}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{userName} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">Your shared property reviews</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin w-5 h-5 border-2 border-[#E8001D] border-t-transparent rounded-full" /></div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-base font-bold text-gray-700 mb-1">No properties shared with you yet</p>
          <p className="text-sm text-gray-400">When your conveyancer or lawyer shares a property review, it will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {properties.map(p => (
            <Link key={p.property_id} href={`/dashboard/property/${p.property_id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group block">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{TI[p.property_type] ?? '🏗️'}</span>
                  <div>
                    <p className="text-base font-bold text-gray-900 group-hover:text-[#E8001D] transition-colors">{p.address}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{p.suburb}{p.postcode ? `, ${p.postcode}` : ''}</p>
                    <p className="text-xs text-gray-400 mt-1">Reviewed by: {p.conveyancer_name}</p>
                    {p.risk_score != null && p.risk_score > 0 && (
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-2 ${p.risk_score >= 7 ? 'bg-red-50 text-red-600' : p.risk_score >= 4 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {p.risk_score} risk item{p.risk_score !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {p.price && <p className="text-sm font-bold text-gray-700">${p.price.toLocaleString()}</p>}
                  {p.validated_at
                    ? <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Review Complete</span>
                    : <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">⏳ Under Review</span>
                  }
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <p className="text-xs text-gray-500">
          Property reviews are shared with you by your conveyancer or lawyer. If you have questions about any findings, please contact them directly.
        </p>
      </div>
    </div>
  )
}
