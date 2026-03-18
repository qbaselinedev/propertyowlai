import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-black leading-none ${accent ? 'text-[#E8001D]' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1.5">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const supabase = createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const [
    { count: totalUsers },
    { count: totalReports },
    { count: totalProperties },
    { data: recentUsers },
    { data: recentReports },
    { data: allProfiles },
    { data: todayActivity },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, full_name, email, credits, created_at, role')
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('reports').select('id, document_type, risk_score, created_at, property_id, properties(address, suburb)')
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('profiles').select('credits'),
    supabase.from('activity_log').select('id, event_type')
      .gte('created_at', todayISO),
  ])

  const totalCredits = (allProfiles || []).reduce((s, p) => s + (p.credits ?? 0), 0)
  const activeToday = new Set((todayActivity || []).map((a: any) => a.user_id)).size
  const reportsToday = (todayActivity || []).filter((a: any) => a.event_type === 'report_run').length

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold text-[#E8001D] uppercase tracking-wider mb-1">Admin</p>
        <h1 className="text-2xl font-black text-white">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">PropertyOwl AI — management portal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers ?? 0} sub="Registered accounts" />
        <StatCard label="Reports Run" value={totalReports ?? 0} sub="All time" accent />
        <StatCard label="Properties Tracked" value={totalProperties ?? 0} sub="Across all users" />
        <StatCard label="Credits in Circulation" value={totalCredits} sub="Unspent credits" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Reports Today" value={reportsToday} sub="Since midnight" />
        <StatCard label="Active Today" value={activeToday} sub="Unique users" />
        <StatCard label="Avg Credits / User" value={totalUsers ? Math.round(totalCredits / totalUsers) : 0} sub="Mean balance" />
        <StatCard label="Victoria Only" value="✓" sub="MVP market" />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent users */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-bold text-white">Recent Users</h2>
            <Link href="/admin/users" className="text-xs text-[#E8001D] hover:underline font-semibold">View all →</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {(recentUsers || []).map((u: any) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#E8001D]/20 flex items-center justify-center text-[#E8001D] font-bold text-xs flex-shrink-0">
                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{u.full_name || '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.credits > 0 ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                    {u.credits} cr
                  </span>
                  <Link href={`/admin/users/${u.id}`} className="text-xs text-gray-600 hover:text-[#E8001D]">→</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent reports */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-bold text-white">Recent Reports</h2>
            <Link href="/admin/reports" className="text-xs text-[#E8001D] hover:underline font-semibold">View all →</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {(recentReports || []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{(r.properties as any)?.address || '—'}</p>
                  <p className="text-xs text-gray-500">{(r.properties as any)?.suburb} · {r.document_type === 's32' ? 'S32 Review' : 'Contract Review'}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  {r.risk_score != null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      r.risk_score >= 8 ? 'bg-red-900/40 text-red-400' :
                      r.risk_score >= 5 ? 'bg-amber-900/40 text-amber-400' :
                      'bg-emerald-900/40 text-emerald-400'
                    }`}>{r.risk_score}/10</span>
                  )}
                  <p className="text-xs text-gray-600">{new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
