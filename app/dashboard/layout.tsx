import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import CreditsDisplay from "@/components/CreditsDisplay";
import InactivityLogout from "@/components/InactivityLogout";

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
      {/* Inactivity logout — signs out after 60 min of no activity */}
      <InactivityLogout />

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
          <CreditsDisplay initialCredits={profile?.credits ?? 0} />
          <Link href="/dashboard/buy-credits"
            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90"
            style={{ background: '#E8001D' }}>
            Buy Credits
          </Link>
          <div className="w-px h-5 bg-gray-200" />
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <span className="text-xs text-gray-600 font-medium hidden sm:block">{displayName}</span>
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-700 font-medium transition-colors px-2 py-1">
              Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
