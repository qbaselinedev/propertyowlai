import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

const NAV = [
  { section: 'Overview', items: [
    { href: '/admin', icon: '📊', label: 'Dashboard' },
    { href: '/admin/users', icon: '👥', label: 'Users' },
    { href: '/admin/reports', icon: '📄', label: 'Reports' },
  ]},
  { section: 'Settings', items: [
    { href: '/admin/settings/llm', icon: '🤖', label: 'LLM & AI' },
    { href: '/admin/settings/pricing', icon: '💳', label: 'Pricing' },
    { href: '/admin/settings/content', icon: '✏️', label: 'Content & System' },
  ]},
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Admin'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Topbar */}
      <header className="bg-gray-900 border-b border-gray-800 h-14 flex items-center px-6 gap-4 flex-shrink-0">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-lg">🦉</span>
          <span className="font-black text-white text-base">PropertyOwl <span className="text-[#E8001D]">Admin</span></span>
        </Link>
        <div className="w-px h-5 bg-gray-700" />
        <span className="text-xs text-gray-500 hidden sm:block">Management Portal</span>
        <div className="flex-1" />
        <Link href="/dashboard" className="text-xs text-gray-500 hover:text-white transition-colors">
          ← User Portal
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-7 h-7 rounded-full bg-[#E8001D]/30 flex items-center justify-center text-[#E8001D] text-xs font-bold">
            {initials}
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">{displayName}</span>
        </div>
        <LogoutButton />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-gray-900 border-r border-gray-800 flex-shrink-0 overflow-y-auto py-4">
          <nav className="px-3 space-y-4">
            {NAV.map(({ section, items }) => (
              <div key={section}>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 mb-1.5">{section}</p>
                {items.map((item) => (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
                    <span className="text-base w-4 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
