'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  isProfessional: boolean
  userType: string
}

export default function DashboardSidebar({ isProfessional, userType }: Props) {
  const pathname = usePathname()

  // Check if we're on a customer-specific page (viewing/editing a customer)
  const isOnCustomerPage = pathname.startsWith('/dashboard/customers/') && pathname !== '/dashboard/customers/new'
  const isOnCustomersSection = pathname.startsWith('/dashboard/customers')

  const typeLabel = userType === 'lawyer' ? 'Lawyer' : userType === 'conveyancer' ? 'Conveyancer' : null

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto py-4">
      <nav className="space-y-0.5 px-3">

        {/* Professional view label */}
        {isProfessional && typeLabel && (
          <div className="mx-2 mb-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {typeLabel} View
            </p>
          </div>
        )}

        {/* ── Main nav ── */}
        <p className="text-xs font-bold text-gray-300 uppercase tracking-wider px-2 py-2">
          Menu
        </p>
        <NavLink href="/dashboard" icon="⊞" label="Dashboard" current={pathname} />

        {/* Show "Add Customer" at top level, "Add Property" when inside customer detail */}
        {isProfessional && isOnCustomerPage ? (
          <NavLink href="/dashboard/add-property" icon="+" label="Add Property" current={pathname} />
        ) : isProfessional ? (
          <NavLink href="/dashboard/customers/new" icon="+" label="Add Customer" current={pathname} />
        ) : (
          <NavLink href="/dashboard/add-property" icon="+" label="Add Property" current={pathname} />
        )}

        {/* ── CRM nav — professionals only ── */}
        {isProfessional && (
          <>
            <p className="text-xs font-bold text-gray-300 uppercase tracking-wider px-2 py-2 mt-3">
              CRM
            </p>
            <NavLink href="/dashboard/customers" icon="👥" label="Customers" current={pathname} />
            <NavLink href="/dashboard/partners" icon="🤝" label="Partners" current={pathname} />
          </>
        )}

        {/* ── Account nav ── */}
        <p className="text-xs font-bold text-gray-300 uppercase tracking-wider px-2 py-2 mt-3">
          Account
        </p>
        <NavLink href="/dashboard/buy-credits" icon="💳" label="Buy Credits" current={pathname} />
        <NavLink href="/dashboard/settings" icon="⚙️" label="Settings" current={pathname} />
      </nav>
    </aside>
  )
}

function NavLink({ href, icon, label, current }: { href: string; icon: string; label: string; current: string }) {
  const isActive = current === href || (href !== '/dashboard' && current.startsWith(href))
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-red-50 text-[#E8001D]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
