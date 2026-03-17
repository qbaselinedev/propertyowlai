import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GrantCreditsPanel from './GrantCreditsPanel'

const eventLabels: Record<string, { label: string; icon: string; color: string }> = {
  signup:             { label: 'Signed up',          icon: '🎉', color: 'text-emerald-400' },
  login:              { label: 'Logged in',           icon: '🔐', color: 'text-blue-400' },
  property_added:     { label: 'Added a property',    icon: '🏠', color: 'text-purple-400' },
  property_deleted:   { label: 'Deleted a property',  icon: '🗑️', color: 'text-gray-400' },
  report_run:         { label: 'Ran a report',         icon: '📊', color: 'text-yellow-400' },
  pdf_downloaded:     { label: 'Downloaded PDF',       icon: '📄', color: 'text-teal-400' },
  credits_purchased:  { label: 'Purchased credits',   icon: '💳', color: 'text-emerald-400' },
  credits_granted:    { label: 'Credits granted',     icon: '🎁', color: 'text-pink-400' },
}

const packageLabel: Record<string, string> = {
  single: '1 Report — $49',
  three_pack: '3 Pack — $119',
  five_pack: '5 Pack — $179',
  yearly: 'Annual — $499',
  granted: 'Admin Grant (Free)',
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: profile }, { data: transactions }, { data: activity }, { data: properties }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('transactions').select('*').eq('user_id', params.id).order('created_at', { ascending: false }),
    supabase.from('activity_log').select('*').eq('user_id', params.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('properties').select('id, address, suburb, s32_reviewed, created_at').eq('user_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!profile) notFound()

  const totalSpent = (transactions || []).reduce((sum, t) => sum + Number(t.amount_aud), 0)

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <a href="/admin/users" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to Users
        </a>
        <div className="flex items-start justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#E8001D]/20 flex items-center justify-center text-[#E8001D] font-bold text-xl">
              {(profile.full_name || profile.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile.full_name || 'Unnamed User'}</h1>
              <p className="text-gray-400 text-sm">{profile.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  profile.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {profile.role}
                </span>
                <span className="text-xs text-gray-500">
                  Joined {new Date(profile.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Credits Remaining', value: profile.credits, highlight: true },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(0)}` },
          { label: 'Properties', value: properties?.length || 0 },
          { label: 'Reports Run', value: (properties || []).filter(p => p.s32_reviewed).length },
        ].map((s) => (
          <div key={s.label} className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.highlight ? 'text-emerald-400' : 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Left column: Grant credits + Transactions */}
        <div className="space-y-6">
          {/* Grant Credits Panel (client component) */}
          <GrantCreditsPanel userId={params.id} userEmail={profile.email} currentCredits={profile.credits} />

          {/* Transactions */}
          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5">
            <h3 className="text-sm font-bold text-white mb-4">Purchase History</h3>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-300">{packageLabel[tx.package_type] || tx.package_type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">+{tx.credits_purchased} cr</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No purchases yet.</p>
            )}
          </div>
        </div>

        {/* Middle: Properties */}
        <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Properties ({properties?.length || 0})</h3>
          {properties && properties.length > 0 ? (
            <div className="space-y-3">
              {properties.map((p) => (
                <div key={p.id} className="border border-white/10 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-200">{p.address}</p>
                  <p className="text-xs text-gray-500">{p.suburb}</p>
                  <span className={`text-xs mt-1.5 inline-block px-2 py-0.5 rounded-full font-bold ${
                    p.s32_reviewed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {p.s32_reviewed ? '✓ Reviewed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No properties added yet.</p>
          )}
        </div>

        {/* Right: Activity timeline */}
        <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-bold text-white mb-4">Activity Timeline</h3>
          {activity && activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map((event) => {
                const config = eventLabels[event.event_type] || { label: event.event_type, icon: '•', color: 'text-gray-400' }
                return (
                  <div key={event.id} className="flex items-start gap-3">
                    <span className="text-base mt-0.5 flex-shrink-0">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${config.color}`}>{config.label}</p>
                      {event.event_detail && Object.keys(event.event_detail).length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {JSON.stringify(event.event_detail)}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date(event.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No activity recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
