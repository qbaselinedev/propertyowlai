import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminReportsPage() {
  const supabase = createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id, document_type, risk_score, status, created_at,
      red_flags,
      properties(id, address, suburb, postcode),
      profiles(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const total = reports?.length ?? 0
  const highRisk = (reports || []).filter((r: any) => (r.risk_score ?? 0) >= 8).length
  const s32Count = (reports || []).filter((r: any) => r.document_type === 's32').length

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-[#E8001D] uppercase tracking-wider mb-1">Admin</p>
        <h1 className="text-2xl font-black text-white">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">All AI analyses run across all users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total reports', value: total },
          { label: 'S32 reviews', value: s32Count },
          { label: 'High risk (8+)', value: highRisk },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-bold text-white">All Reports ({total})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Property', 'User', 'Type', 'Risk', 'Flags', 'Date'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {(reports || []).map((r: any) => {
                const prop = r.properties as any
                const user = r.profiles as any
                const flagCount = Array.isArray(r.red_flags) ? r.red_flags.length : 0
                const highFlags = Array.isArray(r.red_flags) ? r.red_flags.filter((f: any) => f.severity === 'high').length : 0
                return (
                  <tr key={r.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm text-white font-medium">{prop?.address || '—'}</p>
                      <p className="text-xs text-gray-500">{prop?.suburb}{prop?.postcode ? ` ${prop.postcode}` : ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-gray-300">{user?.full_name || '—'}</p>
                      <p className="text-xs text-gray-600 truncate max-w-[140px]">{user?.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.document_type === 's32' ? 'bg-blue-900/40 text-blue-400' : 'bg-purple-900/40 text-purple-400'
                      }`}>
                        {r.document_type === 's32' ? 'S32' : 'Contract'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {r.risk_score != null ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.risk_score >= 8 ? 'bg-red-900/40 text-red-400' :
                          r.risk_score >= 5 ? 'bg-amber-900/40 text-amber-400' :
                          'bg-emerald-900/40 text-emerald-400'
                        }`}>{r.risk_score}/10</span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {flagCount > 0 ? (
                        <div className="flex items-center gap-1.5">
                          {highFlags > 0 && <span className="text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded font-bold">{highFlags} high</span>}
                          <span className="text-xs text-gray-500">{flagCount} total</span>
                        </div>
                      ) : <span className="text-gray-600 text-xs">None</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {total === 0 && <div className="text-center py-12 text-gray-600 text-sm">No reports yet.</div>}
        </div>
      </div>
    </div>
  )
}
