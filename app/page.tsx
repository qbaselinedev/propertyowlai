import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{fontFamily:"'Georgia', 'Times New Roman', serif"}} className="min-h-screen bg-[#FAFAF8]">

      {/* ── NAV ── */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-[#E8E8E4] bg-[#FAFAF8] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦉</span>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]" style={{letterSpacing:'-0.02em'}}>
            PropertyOwl<span className="text-[#E8001D]"> AI</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors" style={{fontFamily:"system-ui"}}>Pricing</Link>
          <Link href="/auth/login" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors" style={{fontFamily:"system-ui"}}>Sign in</Link>
          <Link href="/auth/signup"
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
            style={{background:'#E8001D', fontFamily:"system-ui"}}>
            Get started →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — headline */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E8001D] uppercase tracking-widest mb-6 pb-2 border-b border-[#E8001D]/30"
                 style={{fontFamily:"system-ui"}}>
              Victorian Property Intelligence
            </div>
            <h1 className="text-[3.2rem] font-bold text-[#1A1A1A] leading-[1.1] mb-6" style={{letterSpacing:'-0.03em'}}>
              Your AI advisor<br />
              before you<br />
              <span className="text-[#E8001D]">sign anything.</span>
            </h1>
            <p className="text-lg text-[#555] leading-relaxed mb-8" style={{fontFamily:"system-ui", fontWeight:400}}>
              PropertyOwl reviews your Section 32 and Contract of Sale, flags what matters, and hands you a brief your conveyancer will actually use.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/auth/signup"
                className="inline-flex items-center gap-2 text-base font-semibold text-white px-7 py-3.5 rounded-xl transition-all hover:opacity-90 shadow-sm"
                style={{background:'#E8001D', fontFamily:"system-ui"}}>
                Start for free
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center gap-2 text-base text-[#555] hover:text-[#1A1A1A] transition-colors"
                style={{fontFamily:"system-ui"}}>
                See pricing →
              </Link>
            </div>
            <p className="text-xs text-[#999] mt-4" style={{fontFamily:"system-ui"}}>
              From $25 per property · No subscription · Not legal advice
            </p>
          </div>

          {/* Right — benefit cards */}
          <div className="space-y-3">
            {[
              {
                icon: "🔍",
                title: "Scan before you request documents",
                body: "Enter any address. Get planning zone, overlays, flood risk, sold history and school zones — instantly, no upload needed.",
              },
              {
                icon: "⚠️",
                title: "Know the red flags before your conveyancer does",
                body: "AI reads your Section 32 and flags undischarged mortgages, overdue rates, missing OC levies and unusual contract terms.",
              },
              {
                icon: "💬",
                title: "Walk in with the right questions",
                body: "Get a plain-English list of things to ask the agent, vendor and your conveyancer — before you exchange.",
              },
              {
                icon: "📋",
                title: "Hand your conveyancer a head start",
                body: "Download a structured briefing pack. Saves your conveyancer time and helps you ask smarter questions at a fraction of the cost.",
              },
            ].map((b, i) => (
              <div key={i} className="flex gap-4 bg-white rounded-2xl p-4 border border-[#E8E8E4] hover:border-[#E8001D]/30 transition-colors">
                <span className="text-2xl flex-shrink-0 mt-0.5">{b.icon}</span>
                <div>
                  <p className="font-bold text-[#1A1A1A] text-sm mb-0.5" style={{fontFamily:"system-ui"}}>{b.title}</p>
                  <p className="text-sm text-[#666] leading-relaxed" style={{fontFamily:"system-ui"}}>{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET strip ── */}
      <section className="border-y border-[#E8E8E4] bg-white py-12 px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-widest text-center mb-8" style={{fontFamily:"system-ui"}}>
            What's included with every property review
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {icon:"🏛", label:"Planning zone & overlays", sub:"Heritage, flood, bushfire, design"},
              {icon:"📜", label:"Title & encumbrances", sub:"Mortgages, caveats, easements"},
              {icon:"💰", label:"Outgoings & fees", sub:"Rates, water, OC levies, land tax"},
              {icon:"📋", label:"Contract terms", sub:"Price, deposit, cooling off, conditions"},
              {icon:"🏫", label:"School zones", sub:"Zoned primary & secondary"},
              {icon:"📈", label:"Suburb intelligence", sub:"Median prices, growth, yield"},
              {icon:"📅", label:"Property history", sub:"Past sales, rentals, year built"},
              {icon:"📄", label:"Conveyancer Pack PDF", sub:"Structured 8-page briefing doc"},
            ].map(({icon,label,sub}) => (
              <div key={label} className="text-center">
                <span className="text-2xl">{icon}</span>
                <p className="text-sm font-semibold text-[#1A1A1A] mt-2 mb-0.5" style={{fontFamily:"system-ui"}}>{label}</p>
                <p className="text-xs text-[#999]" style={{fontFamily:"system-ui"}}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="bg-[#FAFAF8] py-14 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl font-bold text-[#1A1A1A] mb-3" style={{letterSpacing:'-0.02em'}}>
            Built for Victorian property buyers
          </p>
          <p className="text-base text-[#666] leading-relaxed mb-10" style={{fontFamily:"system-ui"}}>
            PropertyOwl is purpose-built for Victoria's property market — Sale of Land Act 1962,
            Owners Corporation Act, VicPlan planning zones and Victorian conveyancing practice.
            It's not generic property advice. It's your local AI buyer's guide.
          </p>
          <div className="grid grid-cols-3 gap-8">
            {[
              {stat:"18+", label:"Legal checks on every S32"},
              {stat:"60s", label:"Average scan time"},
              {stat:"$25", label:"Starting price per property"},
            ].map(({stat,label}) => (
              <div key={stat}>
                <p className="text-4xl font-bold text-[#E8001D] mb-1" style={{letterSpacing:'-0.03em'}}>{stat}</p>
                <p className="text-sm text-[#666]" style={{fontFamily:"system-ui"}}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section className="bg-[#1A1A1A] py-16 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-3xl font-bold text-white mb-3" style={{letterSpacing:'-0.02em'}}>
            Ready to review your next property?
          </p>
          <p className="text-[#999] mb-8" style={{fontFamily:"system-ui"}}>
            Sign up free. No credit card required to start.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/signup"
              className="text-base font-semibold text-white px-8 py-4 rounded-xl hover:opacity-90 transition-all"
              style={{background:'#E8001D', fontFamily:"system-ui"}}>
              Get started free →
            </Link>
            <Link href="/pricing"
              className="text-base text-[#999] hover:text-white transition-colors"
              style={{fontFamily:"system-ui"}}>
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#333] bg-[#1A1A1A] px-8 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🦉</span>
            <span className="text-sm text-[#666]" style={{fontFamily:"system-ui"}}>PropertyOwl AI · propertyowlai.com · Victoria, Australia</span>
          </div>
          <p className="text-xs text-[#555] max-w-sm text-right" style={{fontFamily:"system-ui"}}>
            AI-assisted review tool only. Not legal advice. Always engage a licensed Victorian conveyancer before signing.
          </p>
        </div>
      </footer>
    </div>
  );
}
