'use client'

import Link from "next/link"

export default function HomePage() {
  return (
    <div style={{fontFamily:"'Georgia', 'Times New Roman', serif"}} className="min-h-screen bg-[#FAFAF8]">

      {/* ── NAV ── */}
      <nav className="px-8 py-4 flex items-center justify-between border-b border-[#E8E8E4] bg-[#FAFAF8] sticky top-0 z-50">
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

      {/* ── HERO with orbiting questions ── */}
      <section className="w-full bg-[#FAFAF8] flex items-center justify-center overflow-hidden" style={{minHeight:'700px', padding:'48px 20px 40px'}}>
        <style>{`
          @keyframes spin-cw  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
          @keyframes spin-ccw { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
          @keyframes card-ccw { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
          @keyframes card-cw  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
          @keyframes owl-bob  { 0%,100% { transform: translate(-50%,-50%) translateY(0px); } 50% { transform: translate(-50%,-50%) translateY(-7px); } }
          @keyframes owl-blink { 0%,92%,100% { transform: scaleY(1); } 95%,98% { transform: scaleY(0.05); } }
          @keyframes monocle-glint { 0%,85%,100% { opacity:0; } 90%,96% { opacity:1; } }
          .ring1 { position:absolute; top:50%; left:50%; width:410px; height:410px; margin-top:-205px; margin-left:-205px; animation: spin-cw 35s linear infinite; }
          .ring2 { position:absolute; top:50%; left:50%; width:600px; height:600px; margin-top:-300px; margin-left:-300px; animation: spin-ccw 50s linear infinite; }
          .ring1 .q-card { animation: card-ccw 35s linear infinite; }
          .ring2 .q-card { animation: card-cw  50s linear infinite; }
          .owl-center { animation: owl-bob 4s ease-in-out infinite; }
          .owl-left-eye  { transform-origin: 51px 48px; animation: owl-blink 5s ease-in-out infinite; }
          .owl-right-eye { transform-origin: 79px 48px; animation: owl-blink 5s ease-in-out infinite; }
          .monocle-glint { animation: monocle-glint 5s ease-in-out infinite; }
          .q-card { position:absolute; border-radius:10px; padding:8px 11px; width:164px; font-family:system-ui,sans-serif; box-shadow:0 1px 6px rgba(0,0,0,0.06); cursor:default; border:1px solid transparent; transition: box-shadow 0.3s ease, transform 0.3s ease; }
          .q-card:hover { box-shadow:0 4px 18px rgba(0,0,0,0.13); transform:scale(1.06); z-index:30; }
          .q-cat { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:3px; display:flex; align-items:center; gap:4px; }
          .q-text { font-size:11px; line-height:1.4; }
          .c-red    { background:#FFF5F5; border-color:#FCCACA; } .c-red    .q-cat { color:#B52020; } .c-red    .q-text { color:#2D1010; }
          .c-blue   { background:#F2F7FF; border-color:#C0D6F7; } .c-blue   .q-cat { color:#1A4FA0; } .c-blue   .q-text { color:#0D1E3A; }
          .c-green  { background:#F2FAF4; border-color:#B8E4C2; } .c-green  .q-cat { color:#1A6B32; } .c-green  .q-text { color:#0D2A14; }
          .c-amber  { background:#FFFBF0; border-color:#F5DFA0; } .c-amber  .q-cat { color:#8A5C00; } .c-amber  .q-text { color:#2D1E00; }
          .c-purple { background:#F8F5FF; border-color:#D8C8F5; } .c-purple .q-cat { color:#5A2FB5; } .c-purple .q-text { color:#1E0D40; }
          .c-teal   { background:#F0FAFA; border-color:#A8E0DC; } .c-teal   .q-cat { color:#0D6B65; } .c-teal   .q-text { color:#042220; }
          .c-rose   { background:#FFF0F5; border-color:#F5C0D5; } .c-rose   .q-cat { color:#A0204A; } .c-rose   .q-text { color:#2D0A14; }
          .c-slate  { background:#F5F7FA; border-color:#C8D4E4; } .c-slate  .q-cat { color:#3A4A60; } .c-slate  .q-text { color:#1A2030; }
          .slot { position:absolute; width:164px; height:66px; margin-top:-33px; margin-left:-82px; }
          .r1s0{top:0%;left:50%} .r1s1{top:25%;left:97%} .r1s2{top:75%;left:97%}
          .r1s3{top:100%;left:50%} .r1s4{top:75%;left:3%} .r1s5{top:25%;left:3%}
          .r2s0{top:0%;left:50%} .r2s1{top:17%;left:85%} .r2s2{top:50%;left:100%}
          .r2s3{top:83%;left:85%} .r2s4{top:100%;left:50%} .r2s5{top:83%;left:15%}
          .r2s6{top:50%;left:0%} .r2s7{top:17%;left:15%}
        `}</style>

        <div style={{position:'relative', width:'640px', height:'640px', flexShrink:0}}>

          {/* Ring 1 */}
          <div className="ring1">
            <div className="slot r1s0"><div className="q-card c-red"><div className="q-cat">🏛 Title</div><div className="q-text">Any undischarged mortgages on this title?</div></div></div>
            <div className="slot r1s1"><div className="q-card c-blue"><div className="q-cat">🏫 Schools</div><div className="q-text">What school zones does this property fall in?</div></div></div>
            <div className="slot r1s2"><div className="q-card c-green"><div className="q-cat">🗺 Planning</div><div className="q-text">What planning zone and overlays apply here?</div></div></div>
            <div className="slot r1s3"><div className="q-card c-amber"><div className="q-cat">💰 Financials</div><div className="q-text">Are council rates overdue or in arrears?</div></div></div>
            <div className="slot r1s4"><div className="q-card c-purple"><div className="q-cat">📋 Contract</div><div className="q-text">Has the cooling off period been waived?</div></div></div>
            <div className="slot r1s5"><div className="q-card c-teal"><div className="q-cat">📜 Easements</div><div className="q-text">Are there easements or covenants on title?</div></div></div>
          </div>

          {/* Ring 2 */}
          <div className="ring2">
            <div className="slot r2s0"><div className="q-card c-slate"><div className="q-cat">🚂 Transport</div><div className="q-text">How far is the nearest train station?</div></div></div>
            <div className="slot r2s1"><div className="q-card c-rose"><div className="q-cat">🏢 Owners Corp</div><div className="q-text">What is the OC levy and any special levies?</div></div></div>
            <div className="slot r2s2"><div className="q-card c-amber"><div className="q-cat">🔨 Building</div><div className="q-text">Any unpermitted building work in 7 years?</div></div></div>
            <div className="slot r2s3"><div className="q-card c-green"><div className="q-cat">🔥 Environment</div><div className="q-text">Is there bushfire or contamination risk?</div></div></div>
            <div className="slot r2s4"><div className="q-card c-blue"><div className="q-cat">📅 History</div><div className="q-text">What did this property last sell for and when?</div></div></div>
            <div className="slot r2s5"><div className="q-card c-purple"><div className="q-cat">🛋 Chattels</div><div className="q-text">What goods and chattels are included in the sale?</div></div></div>
            <div className="slot r2s6"><div className="q-card c-red"><div className="q-cat">⚠️ Overlays</div><div className="q-text">Any heritage, flood or design overlays?</div></div></div>
            <div className="slot r2s7"><div className="q-card c-teal"><div className="q-cat">💼 Land Tax</div><div className="q-text">Is land tax or windfall gains tax applicable?</div></div></div>
          </div>

          {/* Center: Owl + Text */}
          <div className="owl-center" style={{position:'absolute', top:'50%', left:'50%', textAlign:'center', zIndex:10, width:'230px'}}>
            <svg width="130" height="130" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" style={{display:'block', margin:'0 auto 10px'}}>
              <ellipse cx="65" cy="123" rx="30" ry="5" fill="rgba(0,0,0,0.08)"/>
              <ellipse cx="65" cy="88" rx="36" ry="38" fill="#3D2208"/>
              <ellipse cx="65" cy="95" rx="22" ry="26" fill="#C8841A"/>
              <path d="M55,82 Q65,78 75,82" fill="none" stroke="#A06010" strokeWidth="1" opacity="0.5"/>
              <path d="M52,90 Q65,85 78,90" fill="none" stroke="#A06010" strokeWidth="1" opacity="0.5"/>
              <path d="M54,98 Q65,93 76,98" fill="none" stroke="#A06010" strokeWidth="1" opacity="0.5"/>
              <ellipse cx="34" cy="92" rx="14" ry="26" fill="#2A1504" transform="rotate(-10,34,92)"/>
              <ellipse cx="96" cy="92" rx="14" ry="26" fill="#2A1504" transform="rotate(10,96,92)"/>
              <ellipse cx="65" cy="48" rx="32" ry="30" fill="#3D2208"/>
              <polygon points="40,26 34,8 48,22" fill="#5A3210"/>
              <polygon points="90,26 96,8 82,22" fill="#5A3210"/>
              <g className="owl-left-eye">
                <circle cx="51" cy="48" r="13" fill="#F5E8C0"/>
                <circle cx="51" cy="48" r="7.5" fill="#1A0D02"/>
                <circle cx="48" cy="45" r="2.5" fill="white" opacity="0.9"/>
              </g>
              <g className="owl-right-eye">
                <circle cx="79" cy="48" r="13" fill="#F5E8C0"/>
                <circle cx="79" cy="48" r="7.5" fill="#1A0D02"/>
                <circle cx="76" cy="45" r="2.5" fill="white" opacity="0.9"/>
              </g>
              <circle cx="79" cy="48" r="16" fill="none" stroke="#B8860B" strokeWidth="4"/>
              <circle cx="79" cy="48" r="16" fill="none" stroke="#F0C030" strokeWidth="1.5" strokeDasharray="2,4" opacity="0.7"/>
              <circle cx="72" cy="40" r="2.5" fill="white" className="monocle-glint" opacity="0"/>
              <path d="M94,58 C100,66 102,76 98,86 C95,92 90,97 85,100" fill="none" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M94,58 C100,66 102,76 98,86 C95,92 90,97 85,100" fill="none" stroke="#F5D050" strokeWidth="1.2" strokeDasharray="3,3" opacity="0.9"/>
              <circle cx="85" cy="101" r="4" fill="#B8860B"/>
              <circle cx="85" cy="101" r="2.2" fill="#F5D050"/>
              <polygon points="65,59 57,69 73,69" fill="#D4850A"/>
              <polygon points="65,59 57,69 65,65" fill="#B86A08"/>
              <line x1="52" y1="122" x2="42" y2="128" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
              <line x1="52" y1="122" x2="50" y2="129" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
              <line x1="52" y1="122" x2="58" y2="129" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
              <line x1="78" y1="122" x2="72" y2="129" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
              <line x1="78" y1="122" x2="78" y2="130" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
              <line x1="78" y1="122" x2="88" y2="128" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <p style={{fontSize:'10px', fontFamily:'system-ui', fontWeight:700, color:'#E8001D', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'8px'}}>Victorian Property Intelligence</p>
            <p style={{fontSize:'21px', fontWeight:700, color:'#1A1A1A', lineHeight:1.25, letterSpacing:'-0.02em', marginBottom:'9px'}}>
              Your AI advisor<br/>before you <span style={{color:'#E8001D'}}>sign anything.</span>
            </p>
            <p style={{fontSize:'11px', fontFamily:'system-ui', color:'#666', lineHeight:1.6, marginBottom:'14px'}}>
              PropertyOwl reviews your Section 32 and Contract of Sale, flags what matters, and hands you a brief your conveyancer will actually use.
            </p>
            <Link href="/auth/signup"
              style={{display:'inline-block', background:'#E8001D', color:'white', fontFamily:'system-ui', fontSize:'12px', fontWeight:600, padding:'9px 20px', borderRadius:'8px', textDecoration:'none'}}>
              Get started →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-y border-[#E8E8E4] bg-white py-14 px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold text-[#999] uppercase tracking-widest text-center mb-10" style={{fontFamily:"system-ui"}}>How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step:"1", icon:"🏠", title:"Add a property", body:"Enter the address. We set up your property file instantly." },
              { step:"2", icon:"🔍", title:"Run an online scan", body:"AI searches public data — planning zones, overlays, school zones, flood risk, sold history." },
              { step:"3", icon:"📄", title:"Upload your documents", body:"Upload the Section 32 and Contract of Sale. AI reads every page in under 2 minutes." },
              { step:"4", icon:"📋", title:"Get your answers", body:"Flags, risk scores, negotiation points and a Conveyancer Pack PDF — ready before you bid." },
            ].map(({ step, icon, title, body }) => (
              <div key={step} className="text-center">
                <div className="w-9 h-9 rounded-full bg-[#E8001D]/10 flex items-center justify-center mx-auto mb-3">
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
              {icon:"📄", label:"Conveyancer Pack PDF", sub:"Structured 8-page briefing doc"},
            ].map(({icon, label, sub}) => (
              <div key={label} className="text-center">
                <span className="text-2xl">{icon}</span>
                <p className="text-sm font-semibold text-[#1A1A1A] mt-2 mb-0.5" style={{fontFamily:"system-ui"}}>{label}</p>
                <p className="text-xs text-[#999]" style={{fontFamily:"system-ui"}}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR + CTA ── */}
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
          <p className="text-xs font-semibold text-[#999] uppercase tracking-widest text-center mb-8" style={{fontFamily:"system-ui"}}>Pricing</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name:"1 Property",   price:"$25",  note:"$25 per property", credits:"5 credits",  popular:false },
              { name:"3 Properties", price:"$70",  note:"$23 per property", credits:"15 credits", popular:true  },
              { name:"5 Properties", price:"$100", note:"$20 per property", credits:"25 credits", popular:false },
            ].map(({ name, price, note, credits, popular }) => (
              <div key={name}
                className={`bg-white rounded-2xl border p-5 text-center ${popular ? 'border-[#E8001D] shadow-sm' : 'border-[#E8E8E4]'}`}>
                {popular && <p className="text-[10px] font-bold text-[#E8001D] uppercase tracking-widest mb-2" style={{fontFamily:"system-ui"}}>Most popular</p>}
                <p className="text-sm font-semibold text-[#1A1A1A] mb-1" style={{fontFamily:"system-ui"}}>{name}</p>
                <p className="text-3xl font-bold text-[#1A1A1A]" style={{fontFamily:"system-ui"}}>{price}</p>
                <p className="text-xs text-[#999] mt-0.5 mb-3" style={{fontFamily:"system-ui"}}>{note} · {credits}</p>
                <Link href="/auth/signup"
                  className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 ${popular ? 'text-white' : 'text-[#1A1A1A] border border-[#E8E8E4] hover:border-[#1A1A1A] bg-white'}`}
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
  )
}
