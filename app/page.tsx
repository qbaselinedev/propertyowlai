import Link from "next/link";

const QUESTIONS = [
  { q: "Are there any undischarged mortgages on this property?", category: "Title", icon: "🏛" },
  { q: "What school zones does this property fall in?", category: "Schools", icon: "🏫" },
  { q: "How close is the nearest train station?", category: "Transport", icon: "🚂" },
  { q: "Are there easements or covenants on the title?", category: "Easements", icon: "📜" },
  { q: "Are council rates overdue or in arrears?", category: "Financials", icon: "💰" },
  { q: "What planning zone is this property in?", category: "Planning", icon: "🗺" },
  { q: "Are there any heritage or flood overlays?", category: "Overlays", icon: "⚠️" },
  { q: "What is the OC annual levy and any special levies?", category: "Owners Corp", icon: "🏢" },
  { q: "Has there been any unpermitted building work?", category: "Building", icon: "🔨" },
  { q: "What is the cooling off period — has it been waived?", category: "Contract", icon: "📋" },
  { q: "What chattels and goods are included in the sale?", category: "Contract", icon: "🛋" },
  { q: "Is there a bushfire or contamination risk on this site?", category: "Environment", icon: "🔥" },
]

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
      <section className="max-w-5xl mx-auto px-8 pt-14 pb-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E8001D] uppercase tracking-widest mb-5 pb-2 border-b border-[#E8001D]/30"
               style={{fontFamily:"system-ui"}}>
            Victorian Property Intelligence
          </div>
          <h1 className="text-[3rem] font-bold text-[#1A1A1A] leading-[1.1] mb-5" style={{letterSpacing:'-0.03em'}}>
            Get answers before you<br />
            <span className="text-[#E8001D]">sign anything.</span>
          </h1>
          <p className="text-lg text-[#555] leading-relaxed mb-8 max-w-2xl mx-auto" style={{fontFamily:"system-ui", fontWeight:400}}>
            PropertyOwl reads your Section 32 and Contract of Sale, then answers every question
            you should be asking — before you bid or exchange.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
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

        {/* ── QUESTIONS GRID ── */}
        <div className="mb-4">
          <p className="text-center text-xs font-semibold text-[#999] uppercase tracking-widest mb-6" style={{fontFamily:"system-ui"}}>
            Questions PropertyOwl answers for you
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUESTIONS.map(({ q, category, icon }) => (
              <div key={q}
                className="flex items-start gap-3 bg-white rounded-xl px-4 py-3.5 border border-[#E8E8E4] hover:border-[#E8001D]/30 hover:shadow-sm transition-all">
                <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#E8001D] uppercase tracking-wider mb-0.5" style={{fontFamily:"system-ui"}}>{category}</p>
                  <p className="text-sm text-[#1A1A1A] leading-snug" style={{fontFamily:"system-ui"}}>{q}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA under questions */}
        <p className="text-center text-sm text-[#888] mt-6" style={{fontFamily:"system-ui"}}>
          + dozens more questions answered automatically from your documents
        </p>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-y border-[#E8E8E4] bg-white py-14 px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-widest text-center mb-10" style={{fontFamily:"system-ui"}}>
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "1", icon: "🏠", title: "Add a property", body: "Enter the address. We set up your property file instantly." },
              { step: "2", icon: "🔍", title: "Run an online scan", body: "AI searches public data — planning zones, overlays, school zones, flood risk, sold history." },
              { step: "3", icon: "📄", title: "Upload your documents", body: "Upload the Section 32 and Contract of Sale. AI reads every page in under 2 minutes." },
              { step: "4", icon: "📋", title: "Get your answers", body: "Flags, risk scores, negotiation points and a Conveyancer Pack PDF — ready before you bid." },
            ].map(({ step, icon, title, body }) => (
              <div key={step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#E8001D]/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xs font-black text-[#E8001D]" style={{fontFamily:"system-ui"}}>{step}</span>
                </div>
                <span className="text-2xl">{icon}</span>
                <p className="text-sm font-bold text-[#1A1A1A] mt-2 mb-1" style={{fontFamily:"system-ui"}}>{title}</p>
                <p className="text-xs text-[#666] leading-relaxed" style={{fontFamily:"system-ui"}}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section className="bg-[#FAFAF8] py-14 px-8">
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
              {icon:"🏫", label:"School zones", sub:"Zoned primary & secondary + distances"},
              {icon:"📈", label:"Suburb intelligence", sub:"Median prices, growth, yield"},
              {icon:"📅", label:"Property history", sub:"Past sales, rentals, year built"},
              {icon:"📄", label:"Conveyancer Pack PDF", sub:"Structured briefing doc"},
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

      {/* ── TRUST + CTA ── */}
      <section className="bg-white border-y border-[#E8E8E4] py-14 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl font-bold text-[#1A1A1A] mb-3" style={{letterSpacing:'-0.02em'}}>
            Built for Victorian property buyers
          </p>
          <p className="text-base text-[#666] leading-relaxed mb-8" style={{fontFamily:"system-ui"}}>
            PropertyOwl is purpose-built for Victoria's property market — Sale of Land Act 1962,
            Owners Corporation Act, VicPlan planning zones and Victorian conveyancing practice.
          </p>
          <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
            {[
              "🦉 AI trained on Victorian property law",
              "⚖️ Not legal advice — always use a conveyancer",
              "🔒 Your documents are private",
            ].map(t => (
              <span key={t} className="text-xs text-[#666]" style={{fontFamily:"system-ui"}}>{t}</span>
            ))}
          </div>
          <Link href="/auth/signup"
            className="inline-flex items-center gap-2 text-base font-semibold text-white px-8 py-4 rounded-xl transition-all hover:opacity-90 shadow-sm"
            style={{background:'#E8001D', fontFamily:"system-ui"}}>
            Get started — from $25 per property →
          </Link>
        </div>
      </section>

      {/* ── PRICING STRIP ── */}
      <section className="bg-[#FAFAF8] py-12 px-8">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "1 Property", price: "$25", note: "$25 per property", credits: "5 credits", popular: false },
              { name: "3 Properties", price: "$70", note: "$23 per property", credits: "15 credits", popular: true },
              { name: "5 Properties", price: "$100", note: "$20 per property", credits: "25 credits", popular: false },
            ].map(({ name, price, note, credits, popular }) => (
              <div key={name}
                className={`bg-white rounded-2xl border p-5 text-center ${popular ? 'border-[#E8001D] shadow-sm' : 'border-[#E8E8E4]'}`}>
                {popular && <p className="text-[10px] font-bold text-[#E8001D] uppercase tracking-widest mb-2" style={{fontFamily:"system-ui"}}>Most popular</p>}
                <p className="text-sm font-semibold text-[#1A1A1A] mb-1" style={{fontFamily:"system-ui"}}>{name}</p>
                <p className="text-3xl font-bold text-[#1A1A1A]" style={{fontFamily:"system-ui"}}>{price}</p>
                <p className="text-xs text-[#999] mt-0.5 mb-3" style={{fontFamily:"system-ui"}}>{note} · {credits}</p>
                <Link href="/auth/signup"
                  className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 ${
                    popular ? 'text-white' : 'text-[#1A1A1A] border border-[#E8E8E4] hover:border-[#1A1A1A] bg-white'
                  }`}
                  style={{...(popular ? {background:'#E8001D'} : {}), fontFamily:"system-ui"}}>
                  Get started →
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[#999] mt-6" style={{fontFamily:"system-ui"}}>
            No subscription · Credits never expire · Conveyancer Pack PDF always free
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E8E8E4] px-8 py-8 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span>🦉</span>
            <span className="text-sm text-[#999]" style={{fontFamily:"system-ui"}}>PropertyOwl AI · propertyowlai.com · Victoria, Australia</span>
          </div>
          <p className="text-xs text-[#BBB] max-w-xs text-right" style={{fontFamily:"system-ui"}}>
            AI-assisted review tool only. Not legal advice. Always engage a licensed Victorian conveyancer.
          </p>
        </div>
      </footer>
    </div>
  );
}
