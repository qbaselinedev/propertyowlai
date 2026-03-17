import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import CreditsDisplay from "@/components/CreditsDisplay";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles").select("full_name, credits, role").eq("id", user.id).single();

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* TOPBAR */}
      <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 gap-4 flex-shrink-0 relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#E8001D]" />
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg">🦉</span>
          <span className="font-black text-gray-900 text-lg">PropertyOwl<span className="text-[#E8001D]"> AI</span></span>
        </Link>
        <div className="w-px h-5 bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium hidden sm:block">Property Intelligence</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          {/* Client component that polls for credit updates */}
          <CreditsDisplay initialCredits={profile?.credits ?? 0} />
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900 font-medium px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
              Admin
            </Link>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E8001D] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto py-4">
          <nav className="space-y-0.5 px-3">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-wider px-2 py-2">Menu</p>
            {[
              { href: "/dashboard",              icon: "⊞",  label: "Dashboard" },
              { href: "/dashboard/add-property", icon: "+",  label: "Add Property" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                <span>{item.icon}</span><span>{item.label}</span>
              </Link>
            ))}
            <p className="text-xs font-bold text-gray-300 uppercase tracking-wider px-2 py-2 mt-3">Account</p>
            {[
              { href: "/dashboard/buy-credits", icon: "💳", label: "Buy Credits" },
              { href: "/dashboard/settings",    icon: "⚙️", label: "Settings" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                <span>{item.icon}</span><span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
