import { createClient } from '@/lib/supabase/server'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  credits: number
  role: string
  created_at: string
  transaction_count: number
  total_spent: number
}

export default async function AdminUsersPage() {
  const supabase = createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get transaction summaries per user
  const { data: txSummary } = await supabase
    .from('transactions')
    .select('user_id, amount_aud, package_type')

  const txByUser: Record<string, { count: number; total: number; packages: string[] }> = {}
  for (const tx of txSummary || []) {
    if (!txByUser[tx.user_id]) txByUser[tx.user_id] = { count: 0, total: 0, packages: [] }
    txByUser[tx.user_id].count++
    txByUser[tx.user_id].total += Number(tx.amount_aud)
    if (!txByUser[tx.user_id].packages.includes(tx.package_type)) {
      txByUser[tx.user_id].packages.push(tx.package_type)
    }
  }

  const users: UserRow[] = (profiles || []).map((p) => ({
    ...p,
    transaction_count: txByUser[p.id]?.count || 0,
    total_spent: txByUser[p.id]?.total || 0,
  }))

  const packageLabel: Record<string, string> = {
    single: '1 Report',
    three_pack: '3 Pack',
    five_pack: '5 Pack',
    yearly: 'Annual',
    granted: 'Granted',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-1">{users.length} total users</p>
        </div>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {['User', 'Credits', 'Packages Bought', 'Total Spent', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => {
              const userTx = txByUser[user.id]
              return (
                <tr key={user.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E8001D]/20 flex items-center justify-center text-[#E8001D] font-bold text-sm flex-shrink-0">
                        {(user.full_name || user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{user.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-bold ${user.credits > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {user.credits}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {userTx?.packages?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {userTx.packages.map((pkg) => (
                          <span key={pkg} className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                            {packageLabel[pkg] || pkg}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">None yet</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-white">
                      {user.total_spent > 0 ? `$${user.total_spent.toFixed(0)}` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <a href={`/admin/users/${user.id}`} className="text-xs text-[#E8001D] hover:text-red-400 font-semibold transition-colors">
                      View →
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">No users yet.</div>
        )}
      </div>
    </div>
  )
}
