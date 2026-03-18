'use client'

import Link from "next/link"

const R = "#E8001D"

function OwlSVG({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="65" cy="123" rx="30" ry="5" fill="rgba(0,0,0,0.08)"/>
      <ellipse cx="65" cy="88" rx="36" ry="38" fill="#3D2208"/>
      <ellipse cx="65" cy="95" rx="22" ry="26" fill="#C8841A"/>
      <path d="M55,82 Q65,78 75,82" fill="none" stroke="#A06010" strokeWidth="1" opacity="0.5"/>
      <path d="M52,90 Q65,85 78,90" fill="none" stroke="#A06010" strokeWidth="1" opacity="0.5"/>
      <ellipse cx="34" cy="92" rx="14" ry="26" fill="#2A1504" transform="rotate(-10,34,92)"/>
      <ellipse cx="96" cy="92" rx="14" ry="26" fill="#2A1504" transform="rotate(10,96,92)"/>
      <ellipse cx="65" cy="48" rx="32" ry="30" fill="#3D2208"/>
      <polygon points="40,26 34,8 48,22" fill="#5A3210"/>
      <polygon points="90,26 96,8 82,22" fill="#5A3210"/>
      <g style={{transformOrigin:"51px 48px", animation:"eye-blink 5s ease-in-out infinite"}}>
        <circle cx="51" cy="48" r="13" fill="#F5E8C0"/>
        <circle cx="51" cy="48" r="7.5" fill="#1A0D02"/>
        <circle cx="48" cy="45" r="2.5" fill="white" opacity="0.9"/>
      </g>
      <g style={{transformOrigin:"79px 48px", animation:"eye-blink 5s ease-in-out infinite"}}>
        <circle cx="79" cy="48" r="13" fill="#F5E8C0"/>
        <circle cx="79" cy="48" r="7.5" fill="#1A0D02"/>
        <circle cx="76" cy="45" r="2.5" fill="white" opacity="0.9"/>
      </g>
      <circle cx="79" cy="48" r="16" fill="none" stroke="#B8860B" strokeWidth="4"/>
      <circle cx="79" cy="48" r="16" fill="none" stroke="#F0C030" strokeWidth="1.5" strokeDasharray="2,4" opacity="0.7"/>
      <path d="M94,58 C100,66 102,76 98,86 C95,92 90,97 85,100" fill="none" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M94,58 C100,66 102,76 98,86 C95,92 90,97 85,100" fill="none" stroke="#F5D050" strokeWidth="1.2" strokeDasharray="3,3" opacity="0.9"/>
      <circle cx="85" cy="101" r="4" fill="#B8860B"/>
      <circle cx="85" cy="101" r="2.2" fill="#F5D050"/>
      <polygon points="65,59 57,69 73,69" fill="#D4850A"/>
      <line x1="52" y1="122" x2="42" y2="128" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
      <line x1="52" y1="122" x2="58" y2="129" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
      <line x1="78" y1="122" x2="72" y2="129" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
      <line x1="78" y1="122" x2="88" y2="128" stroke="#C8760A" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

// Floating callout cards on the right
const CALLOUTS = [
  { label:"🏛 Title check",    val:"CBA BK129045Z",          sub:"⚠ Mortgage outstanding",         bg:"#FFF5F5", bc:"#FECACA", lc:"#B52020", delay:"0s",   dur:"14s" },
  { label:"🗺 Planning zone",  val:"RGZ1 — Residential",     sub:"✓ No overlays detected",          bg:"#F0FDF4", bc:"#BBF7D0", lc:"#15803D", delay:"2s",   dur:"17s" },
  { label:"💰 Outgoings",      val:"$1,842.50 overdue",       sub:"⚠ Council rates — due 28/02/26",  bg:"#FFFBEB", bc:"#FDE68A", lc:"#92400E", delay:"4s",   dur:"12s" },
  { label:"🏫 School zone",   val:"Carlton Primary",         sub:"Melbourne High · 1.2km walk",     bg:"#EFF6FF", bc:"#BFDBFE", lc:"#1A4FA0", delay:"1s",   dur:"16s" },
  { label:"📊 Risk score",     val:"7.2 / 10",               sub:"4 negotiation points found",      bg:"#FFF5F5", bc:"#FECACA", lc:"#E8001D", delay:"3s",   dur:"15s" },
  { label:"📅 Last sold",      val:"$600,500",                sub:"September 2024 · +12% growth",   bg:"#F5F3FF", bc:"#DDD6FE", lc:"#5B21B6", delay:"6s",   dur:"13s" },
  { label:"🔥 Bushfire risk",  val:"None",                   sub:"✓ Urban area — clear",            bg:"#F0FDF4", bc:"#BBF7D0", lc:"#15803D", delay:"5s",   dur:"18s" },
  { label:"📋 Contract",       val:"Cooling off — 3 days",   sub:"✓ Not waived · Settlement 60d",  bg:"#F5F3FF", bc:"#DDD6FE", lc:"#5B21B6", delay:"7s",   dur:"11s" },
  { label:"🏢 OC Levy",        val:"Not disclosed",           sub:"⚠ Request OC certificate",       bg:"#FFFBEB", bc:"#FDE68A", lc:"#92400E", delay:"8s",   dur:"19s" },
]

export default function HomePage() {
  return (
    <div style={{fontFamily:"'Georgia', serif", background:"white", minHeight:"100vh"}}>
      <style>{`
        @keyframes eye-blink { 0%,92%,100%{transform:scaleY(1)} 95%,98%{transform:scaleY(0.05)} }
        @keyframes owl-bob   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes float-up  {
          0%   { transform: translateY(0px);   opacity: 1; }
          80%  { transform: translateY(-340px); opacity: 1; }
          90%  { transform: translateY(-370px); opacity: 0; }
          91%  { transform: translateY(20px);   opacity: 0; }
          100% { transform: translateY(0px);   opacity: 1; }
        }
        .owl-bob { animation: owl-bob 4s ease-in-out infinite; display:inline-block; }
        .float-card { animation: float-up linear infinite; position: absolute; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        background:"white", borderBottom:"1px solid #F0F0F0",
        height:"60px", position:"sticky", top:0, zIndex:100
      }}>
        <div style={{
          maxWidth:"1400px", margin:"0 auto", height:"100%",
          display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"0 48px"
        }}>
        <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
          <OwlSVG size={32} />
          <span style={{fontSize:"18px", fontWeight:700, letterSpacing:"-0.03em", fontFamily:"Georgia,serif"}}>
            PropertyOwl<span style={{color:R}}> AI</span>
          </span>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
          <Link href="/pricing" style={{fontSize:"13px", color:"#666", textDecoration:"none", padding:"8px 14px", fontFamily:"system-ui"}}>Pricing</Link>
          <Link href="/auth/login" style={{
            fontSize:"13px", color:"#111", textDecoration:"none",
            padding:"8px 18px", borderRadius:"100px",
            border:"1.5px solid #DDD", fontFamily:"system-ui", fontWeight:600
          }}>Sign in</Link>
          <Link href="/auth/signup" style={{
            fontSize:"13px", fontWeight:700, color:"white",
            background:R, padding:"9px 20px",
            borderRadius:"100px", textDecoration:"none", fontFamily:"system-ui"
          }}>Join free →</Link>
        </div>
        </div>
      </nav>

      {/* ── HERO: left text + right floating callouts ── */}
      <div style={{background:"white", borderBottom:"1px solid #F0F0F0"}}>
      <section style={{
        display:"grid", gridTemplateColumns:"1fr 1fr",
        minHeight:"calc(100vh - 60px)",
        maxWidth:"1400px", margin:"0 auto", overflow:"hidden",
      }}>
        {/* LEFT */}
        <div style={{
          padding:"64px 56px 56px 72px",
          display:"flex", flexDirection:"column",
          justifyContent:"center", borderRight:"1px solid #F0F0F0"
        }}>
          {/* Top red accent */}
          <div style={{width:"40px", height:"3px", background:R, borderRadius:"2px", marginBottom:"28px"}}/>

          <div style={{
            display:"inline-flex", alignItems:"center", gap:"7px",
            background:"#FFF0F0", border:"1px solid #FECACA",
            borderRadius:"100px", padding:"5px 14px 5px 8px",
            marginBottom:"24px", width:"fit-content", fontFamily:"system-ui"
          }}>
            <div style={{width:"6px", height:"6px", background:R, borderRadius:"50%"}}/>
            <span style={{fontSize:"11px", fontWeight:700, color:"#B52020"}}>Victoria's only AI property analyser</span>
          </div>

          <h1 style={{
            fontSize:"48px", fontWeight:700, lineHeight:1.05,
            letterSpacing:"-0.04em", color:"#111",
            marginBottom:"20px"
          }}>
            360° property<br/>intelligence.<br/>
            <span style={{color:R}}>In 2 minutes.</span>
          </h1>

          <p style={{
            fontSize:"16px", color:"#555", lineHeight:1.7,
            marginBottom:"14px", fontFamily:"system-ui", fontWeight:400,
            maxWidth:"420px"
          }}>
            Upload your Section 32 and Contract of Sale. Our AI surfaces every risk, fee and red flag — before you bid or sign anything.
          </p>
          <p style={{
            fontSize:"14px", color:"#888", lineHeight:1.65,
            marginBottom:"36px", fontFamily:"system-ui", maxWidth:"400px"
          }}>
            We also deep search the internet — planning zones, school catchments, sold history, flood risk — all in one place.
          </p>

          <div style={{display:"flex", gap:"12px", marginBottom:"24px", alignItems:"center", flexWrap:"wrap"}}>
            <Link href="/dashboard" style={{
              display:"inline-flex", alignItems:"center", gap:"8px",
              background:R, color:"white", fontWeight:700,
              fontSize:"15px", padding:"14px 32px", borderRadius:"100px",
              textDecoration:"none", fontFamily:"system-ui"
            }}>
              Try with demo property →
            </Link>
          </div>

          {/* Trust signals */}
          <div style={{display:"flex", flexDirection:"column", gap:"8px", marginBottom:"32px"}}>
            <div style={{display:"flex", alignItems:"center", gap:"8px", fontFamily:"system-ui"}}>
              <div style={{width:"18px", height:"18px", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", color:"#15803D", fontWeight:800}}>✓</div>
              <span style={{fontSize:"12px", color:"#444", fontWeight:600}}>One-time payment — no subscription, no lock-in</span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:"8px", fontFamily:"system-ui"}}>
              <div style={{width:"18px", height:"18px", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", color:"#15803D", fontWeight:800}}>✓</div>
              <span style={{fontSize:"12px", color:"#444", fontWeight:600}}>From $25 per property · Victorian law only</span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:"8px", fontFamily:"system-ui"}}>
              <div style={{width:"18px", height:"18px", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", color:"#15803D", fontWeight:800}}>✓</div>
              <span style={{fontSize:"12px", color:"#444", fontWeight:600}}>Not legal advice — always engage a conveyancer</span>
            </div>
          </div>

          {/* Owl strip */}
          <div style={{
            display:"flex", alignItems:"center", gap:"16px",
            padding:"16px 20px", background:"#FAFAF8",
            border:"1px solid #EBEBEB", borderRadius:"14px"
          }}>
            <div className="owl-bob"><OwlSVG size={52} /></div>
            <div>
              <p style={{fontSize:"14px", fontWeight:700, color:"#111", marginBottom:"3px"}}>Reads every page. Answers every question.</p>
              <p style={{fontSize:"11px", color:"#888", fontFamily:"system-ui", lineHeight:1.5}}>S32 · Contract · Planning · Schools · History · Overlays · Rates · OC Levy</p>
            </div>
          </div>
        </div>

        {/* RIGHT — floating callout cards */}
        <div style={{
          background:"#FAFAF8", position:"relative",
          overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center"
        }}>
          {/* Subtle grid pattern */}
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:"radial-gradient(circle, #E0DDD8 1px, transparent 1px)",
            backgroundSize:"28px 28px", opacity:0.4
          }}/>

          {/* Column 1 — info cards left */}
          <div style={{position:"absolute", left:"3%", bottom:"-20px", width:"180px"}}>
            {[CALLOUTS[0], CALLOUTS[2], CALLOUTS[6]].map((c, i) => (
              <div key={i} className="float-card" style={{
                animationDuration: c.dur, animationDelay: c.delay,
                position:"relative", top: `${i * 140}px`,
                background:c.bg, border:`1px solid ${c.bc}`,
                borderRadius:"12px", padding:"12px 14px",
                boxShadow:"0 2px 12px rgba(0,0,0,0.06)", width:"180px", marginBottom:"10px"
              }}>
                <p style={{fontSize:"9px", fontWeight:700, color:c.lc, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:"system-ui", marginBottom:"6px"}}>{c.label}</p>
                <p style={{fontSize:"13px", fontWeight:700, color:"#111", marginBottom:"3px"}}>{c.val}</p>
                <p style={{fontSize:"10px", color:"#666", fontFamily:"system-ui", lineHeight:1.4}}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Column 2 — app screenshots */}
          <div style={{position:"absolute", left:"50%", transform:"translateX(-50%)", bottom:"-60px", width:"220px"}}>
            {[
              "/screenshots/contract-risk.png",
              "/screenshots/s32-review.png",
              "/screenshots/online-scan.png",
              "/screenshots/negotiation.png",
              "/screenshots/pdf-pack.png",
            ].map((src, i) => (
              <div key={i} className="float-card" style={{
                animationDuration: `${15 + i * 2}s`,
                animationDelay: `${i * 3}s`,
                position:"relative", top: `${i * 200}px`,
                borderRadius:"12px", overflow:"hidden",
                boxShadow:"0 4px 20px rgba(0,0,0,0.12)",
                border:"1px solid rgba(0,0,0,0.08)",
                width:"220px", height:"160px", marginBottom:"10px"
              }}>
                <img src={src} alt="" style={{
                  width:"100%", height:"100%",
                  objectFit:"cover", objectPosition:"top left",
                  display:"block"
                }}
                onError={(e) => {
                  // Hide card if image doesn't exist
                  const el = e.currentTarget.parentElement
                  if (el) el.style.display = "none"
                }}
                />
              </div>
            ))}
          </div>

          {/* Column 3 — info cards right */}
          <div style={{position:"absolute", right:"3%", bottom:"-40px", width:"180px"}}>
            {[CALLOUTS[3], CALLOUTS[5], CALLOUTS[8]].map((c, i) => (
              <div key={i} className="float-card" style={{
                animationDuration: c.dur, animationDelay: c.delay,
                position:"relative", top: `${i * 155}px`,
                background:c.bg, border:`1px solid ${c.bc}`,
                borderRadius:"12px", padding:"12px 14px",
                boxShadow:"0 2px 12px rgba(0,0,0,0.06)", width:"180px", marginBottom:"10px"
              }}>
                <p style={{fontSize:"9px", fontWeight:700, color:c.lc, textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:"system-ui", marginBottom:"6px"}}>{c.label}</p>
                <p style={{fontSize:"13px", fontWeight:700, color:"#111", marginBottom:"3px"}}>{c.val}</p>
                <p style={{fontSize:"10px", color:"#666", fontFamily:"system-ui", lineHeight:1.4}}>{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{background:"#111"}}>
        <div style={{maxWidth:"1400px", margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)"}}>
        {[
          {n:"2 min", l:"Full S32 + contract review"},
          {n:"$25",   l:"Per property — not per hour"},
          {n:"60+",   l:"Data points extracted"},
          {n:"100%",  l:"Victorian law — VicPlan, OCA, SLA"},
        ].map(({n,l},i) => (
          <div key={l} style={{
            padding:"22px 24px", textAlign:"center",
            borderRight: i<3 ? "1px solid #1E1E1E" : "none"
          }}>
            <p style={{fontSize:"26px", fontWeight:700, color:"white", marginBottom:"4px"}}>{n}</p>
            <p style={{fontSize:"11px", color:"#555", fontFamily:"system-ui"}}>{l}</p>
          </div>
        ))}
        </div>
      </div>

      {/* ── FEATURE GRID ── */}
      <section style={{background:"#FAFAF8", padding:"80px 0"}}>
        <div style={{maxWidth:"1400px", margin:"0 auto", padding:"0 72px"}}>
        <div style={{textAlign:"center", marginBottom:"52px"}}>
          <p style={{fontSize:"11px", fontWeight:700, color:R, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"system-ui", marginBottom:"10px"}}>What we surface</p>
          <h2 style={{fontSize:"38px", fontWeight:700, color:"#111", letterSpacing:"-0.03em"}}>Everything a buyer needs to know</h2>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"20px", maxWidth:"1100px", margin:"0 auto"}}>
          {[
            {icon:"🏛", title:"Title & encumbrances",    body:"Mortgages, caveats, easements — surfaced with exact references and discharge requirements.",          tag:"CONTRACT SCAN", tc:"#991B1B", tb:"#FECACA"},
            {icon:"💰", title:"Outgoings to the dollar", body:"Rates, water, OC levies, land tax — every figure with due dates and arrears flagged.",               tag:"CONTRACT SCAN", tc:"#991B1B", tb:"#FECACA"},
            {icon:"🗺", title:"Planning & overlays",     body:"Zone, heritage, flood, bushfire and design overlays — checked against VicPlan automatically.",        tag:"ONLINE SCAN",   tc:"#5B21B6", tb:"#DDD6FE"},
            {icon:"🏫", title:"School zones & suburb",   body:"Zoned schools with distances. Median prices, growth, comparable sales, rental yield.",                tag:"ONLINE SCAN",   tc:"#5B21B6", tb:"#DDD6FE"},
            {icon:"📋", title:"Contract conditions",     body:"Price, deposit, settlement, cooling off, special conditions — every clause with risk level.",         tag:"CONTRACT SCAN", tc:"#991B1B", tb:"#FECACA"},
            {icon:"📄", title:"Conveyancer Pack PDF",    body:"8-page structured briefing your conveyancer can act on immediately — cuts their time and your bill.", tag:"BOTH SCANS",    tc:"#15803D", tb:"#BBF7D0"},
          ].map(({icon,title,body,tag,tc,tb}) => (
            <div key={title} style={{
              background:"white", border:"1px solid #EBEBEB",
              borderRadius:"16px", padding:"32px 28px"
            }}>
              <span style={{fontSize:"32px", display:"block", marginBottom:"16px"}}>{icon}</span>
              <span style={{
                fontSize:"9px", fontWeight:700, color:tc,
                background:tb, padding:"3px 10px", borderRadius:"100px",
                display:"inline-block", marginBottom:"12px", fontFamily:"system-ui", letterSpacing:"0.06em"
              }}>{tag}</span>
              <p style={{fontSize:"17px", fontWeight:700, color:"#111", letterSpacing:"-0.02em", marginBottom:"8px"}}>{title}</p>
              <p style={{fontSize:"13px", color:"#777", lineHeight:1.65, fontFamily:"system-ui"}}>{body}</p>
            </div>
          ))}
        </div>
        </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{background:"white", borderTop:"1px solid #F0F0F0", padding:"80px 0"}}>
        <div style={{maxWidth:"1400px", margin:"0 auto", padding:"0 72px"}}>
        <div style={{maxWidth:"860px", margin:"0 auto"}}>
          <div style={{textAlign:"center", marginBottom:"52px"}}>
            <p style={{fontSize:"11px", fontWeight:700, color:R, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"system-ui", marginBottom:"10px"}}>Process</p>
            <h2 style={{fontSize:"38px", fontWeight:700, color:"#111", letterSpacing:"-0.03em"}}>Under 5 minutes, start to finish</h2>
          </div>
          <div style={{display:"flex", alignItems:"flex-start"}}>
            <div style={{flex:1, textAlign:"center"}}>
              <div style={{position:"relative", display:"inline-block", marginBottom:"14px"}}>
                <div style={{width:"56px", height:"56px", borderRadius:"50%", border:"1.5px solid #EBEBEB", background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto", boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>🏠</div>
                <div style={{position:"absolute", top:"-5px", right:"-5px", width:"20px", height:"20px", background:R, borderRadius:"50%", fontSize:"9px", fontWeight:700, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui"}}>1</div>
              </div>
              <p style={{fontSize:"14px", fontWeight:700, color:"#111", marginBottom:"4px"}}>Add a property</p>
              <p style={{fontSize:"12px", color:"#888", lineHeight:1.5, fontFamily:"system-ui"}}>Enter address — file created instantly</p>
            </div>
            <svg width="80" height="160" viewBox="0 0 80 160" style={{flexShrink:0, marginTop:"6px"}}>
              <line x1="0" y1="28" x2="40" y2="28" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/>
              <line x1="40" y1="28" x2="40" y2="136" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/>
              <line x1="40" y1="28" x2="80" y2="28" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/>
              <line x1="40" y1="136" x2="80" y2="136" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/>
            </svg>
            <div style={{flex:2, display:"flex", flexDirection:"column", gap:"28px"}}>
              <div style={{textAlign:"center"}}>
                <div style={{position:"relative", display:"inline-block", marginBottom:"14px"}}>
                  <div style={{width:"56px", height:"56px", borderRadius:"50%", background:R, border:"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto"}}>📤</div>
                  <div style={{position:"absolute", top:"-5px", right:"-5px", width:"20px", height:"20px", background:"#111", borderRadius:"50%", fontSize:"9px", fontWeight:700, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui"}}>2a</div>
                </div>
                <p style={{fontSize:"14px", fontWeight:700, color:"#111", marginBottom:"4px"}}>Upload S32 + contract</p>
                <p style={{fontSize:"12px", color:"#888", lineHeight:1.5, fontFamily:"system-ui"}}>AI reads every page — title, outgoings, conditions</p>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{position:"relative", display:"inline-block", marginBottom:"14px"}}>
                  <div style={{width:"56px", height:"56px", borderRadius:"50%", background:"#EEF2FF", border:"1.5px solid #C7D2FE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto"}}>🌐</div>
                  <div style={{position:"absolute", top:"-5px", right:"-5px", width:"20px", height:"20px", background:"#7C3AED", borderRadius:"50%", fontSize:"9px", fontWeight:700, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui"}}>2b</div>
                </div>
                <p style={{fontSize:"14px", fontWeight:700, color:"#7C3AED", marginBottom:"4px"}}>Deep search internet</p>
                <p style={{fontSize:"12px", color:"#888", lineHeight:1.5, fontFamily:"system-ui"}}>Planning, schools, history, flood — simultaneous</p>
              </div>
            </div>
            <svg width="80" height="160" viewBox="0 0 80 160" style={{flexShrink:0, marginTop:"6px"}}>
              <line x1="0" y1="28" x2="40" y2="28" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/>
              <line x1="0" y1="136" x2="40" y2="136" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/>
              <line x1="40" y1="28" x2="40" y2="136" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/>
              <line x1="40" y1="82" x2="80" y2="82" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/>
            </svg>
            <div style={{flex:1, textAlign:"center", marginTop:"52px"}}>
              <div style={{position:"relative", display:"inline-block", marginBottom:"14px"}}>
                <div style={{width:"56px", height:"56px", borderRadius:"50%", border:"1.5px solid #EBEBEB", background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto", boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>🤖</div>
                <div style={{position:"absolute", top:"-5px", right:"-5px", width:"20px", height:"20px", background:R, borderRadius:"50%", fontSize:"9px", fontWeight:700, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui"}}>3</div>
              </div>
              <p style={{fontSize:"14px", fontWeight:700, color:"#111", marginBottom:"4px"}}>AI analyses all</p>
              <p style={{fontSize:"12px", color:"#888", lineHeight:1.5, fontFamily:"system-ui"}}>Both streams — under 2 min</p>
            </div>
            <div style={{flexShrink:0, display:"flex", alignItems:"center", marginTop:"78px"}}>
              <svg width="40" height="2"><line x1="0" y1="1" x2="40" y2="1" stroke="#E8E8E4" strokeWidth="1.5" strokeDasharray="5,4"/></svg>
            </div>
            <div style={{flex:1, textAlign:"center", marginTop:"52px"}}>
              <div style={{position:"relative", display:"inline-block", marginBottom:"14px"}}>
                <div style={{width:"56px", height:"56px", borderRadius:"50%", border:"1.5px solid #EBEBEB", background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto", boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>📋</div>
                <div style={{position:"absolute", top:"-5px", right:"-5px", width:"20px", height:"20px", background:R, borderRadius:"50%", fontSize:"9px", fontWeight:700, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui"}}>4</div>
              </div>
              <p style={{fontSize:"14px", fontWeight:700, color:"#111", marginBottom:"4px"}}>Get your answers</p>
              <p style={{fontSize:"12px", color:"#888", lineHeight:1.5, fontFamily:"system-ui"}}>Flags, risk score, PDF — before you bid</p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{background:"#FAFAF8", borderTop:"1px solid #F0F0F0", padding:"80px 0"}}>
        <div style={{maxWidth:"1400px", margin:"0 auto", padding:"0 72px"}}>
        <div style={{maxWidth:"800px", margin:"0 auto"}}>
          <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"36px", flexWrap:"wrap", gap:"16px"}}>
            <div>
              <p style={{fontSize:"11px", fontWeight:700, color:R, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"system-ui", marginBottom:"8px"}}>Pricing</p>
              <h2 style={{fontSize:"36px", fontWeight:700, color:"#111", letterSpacing:"-0.03em"}}>Simple. Transparent.</h2>
            </div>
            <div style={{display:"inline-flex", alignItems:"center", gap:"6px", background:"#F0FDF4", border:"1px solid #BBF7D0", color:"#15803D", fontSize:"12px", fontWeight:700, padding:"7px 16px", borderRadius:"100px", fontFamily:"system-ui"}}>
              ✓ One-time · No subscription · No lock-in
            </div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"24px"}}>
            {[
              {lbl:"Starter",    price:"$25",  note:"$25/property · 5 credits",        pop:false, val:false,
               feats:["1 online property scan","S32 + contract review","Risk flags + negotiation","Conveyancer Pack PDF"]},
              {lbl:"Popular",    price:"$70",  note:"$23/property · 15 credits · –$5", pop:true,  val:false,
               feats:["3 online property scans","3 S32 + contract reviews","Risk flags + negotiation","3 Conveyancer PDFs"]},
              {lbl:"Best value", price:"$100", note:"$20/property · 25 credits · –$25",pop:false, val:true,
               feats:["5 online property scans","5 S32 + contract reviews","Risk flags + negotiation","5 Conveyancer PDFs"]},
            ].map(({lbl,price,note,pop,val,feats}) => (
              <div key={lbl} style={{
                background: pop ? "#111" : "white",
                border: pop ? "none" : "1px solid #EBEBEB",
                borderRadius:"18px", padding:"28px 24px"
              }}>
                <p style={{fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color: pop ? R : val ? "#15803D" : "#AAA", marginBottom:"14px", fontFamily:"system-ui"}}>{lbl}</p>
                <p style={{fontSize:"42px", fontWeight:700, color: pop ? "white" : "#111", letterSpacing:"-0.04em", lineHeight:1, marginBottom:"4px"}}>{price}</p>
                <p style={{fontSize:"11px", color: pop ? "#555" : "#AAA", marginBottom:"20px", fontFamily:"system-ui"}}>{note}</p>
                <div style={{display:"flex", flexDirection:"column", gap:"8px", marginBottom:"24px"}}>
                  {feats.map(f => (
                    <p key={f} style={{fontSize:"12px", color: pop ? "rgba(255,255,255,0.5)" : "#666", display:"flex", gap:"8px", fontFamily:"system-ui"}}>
                      <span style={{color:R, fontWeight:900}}>✓</span>{f}
                    </p>
                  ))}
                </div>
                <Link href="/auth/signup" style={{
                  display:"block", textAlign:"center", padding:"12px",
                  borderRadius:"100px", fontSize:"13px", fontWeight:700,
                  textDecoration:"none", fontFamily:"system-ui",
                  background: pop ? "white" : "#111",
                  color: pop ? "#111" : "white"
                }}>Get started</Link>
              </div>
            ))}
          </div>
          <p style={{textAlign:"center", fontSize:"11px", color:"#AAA", fontFamily:"system-ui"}}>
            Not legal advice · Always engage a licensed Victorian conveyancer · Private & secure
          </p>
        </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{background:R, padding:"80px 72px", textAlign:"center"}}>
        <div style={{maxWidth:"600px", margin:"0 auto"}}>
        <div className="owl-bob" style={{display:"inline-block", marginBottom:"20px"}}><OwlSVG size={64} /></div>
        <h2 style={{fontSize:"42px", fontWeight:700, color:"white", letterSpacing:"-0.03em", marginBottom:"14px"}}>Stop signing blind.</h2>
        <p style={{fontSize:"16px", color:"rgba(255,255,255,0.75)", marginBottom:"32px", fontFamily:"system-ui", lineHeight:1.65}}>
          360° property intelligence — contract analysis + deep internet scan — before you bid, sign or commit.
        </p>
        <Link href="/auth/signup" style={{
          display:"inline-block", background:"white", color:R,
          fontSize:"16px", fontWeight:700, padding:"16px 40px",
          borderRadius:"100px", textDecoration:"none", fontFamily:"system-ui"
        }}>
          Join free — from $25 per property →
        </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:"#0A0A0A", padding:"64px 0 0"}}>
        <div style={{maxWidth:"1400px", margin:"0 auto", padding:"0 72px"}}>
        <div style={{display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:"48px", marginBottom:"56px"}}>
          {/* Brand column */}
          <div>
            <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px"}}>
              <OwlSVG size={32} />
              <span style={{fontSize:"17px", fontWeight:700, color:"white", letterSpacing:"-0.02em"}}>PropertyOwl<span style={{color:R}}> AI</span></span>
            </div>
            <p style={{fontSize:"13px", color:"#555", lineHeight:1.7, fontFamily:"system-ui", marginBottom:"20px", maxWidth:"260px"}}>
              AI-powered property review for Victorian buyers. Surface every risk before you sign anything.
            </p>
            <p style={{fontSize:"11px", color:"#333", fontFamily:"system-ui", lineHeight:1.6}}>
              Not legal advice. Always engage a licensed<br/>Victorian conveyancer before signing.
            </p>
          </div>
          {/* Product */}
          <div>
            <p style={{fontSize:"11px", fontWeight:700, color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"system-ui", marginBottom:"16px"}}>Product</p>
            {["How it works","Pricing","Sample report","Contract scan","Online scan","Conveyancer PDF"].map(t => (
              <p key={t} style={{marginBottom:"10px"}}><a href="#" style={{fontSize:"13px", color:"#666", textDecoration:"none", fontFamily:"system-ui"}}>{t}</a></p>
            ))}
          </div>
          {/* Company */}
          <div>
            <p style={{fontSize:"11px", fontWeight:700, color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"system-ui", marginBottom:"16px"}}>Company</p>
            {["About","Contact","Blog","Careers"].map(t => (
              <p key={t} style={{marginBottom:"10px"}}><a href="#" style={{fontSize:"13px", color:"#666", textDecoration:"none", fontFamily:"system-ui"}}>{t}</a></p>
            ))}
          </div>
          {/* Legal */}
          <div>
            <p style={{fontSize:"11px", fontWeight:700, color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"system-ui", marginBottom:"16px"}}>Legal</p>
            {["Privacy policy","Terms of service","Disclaimer","Cookie policy"].map(t => (
              <p key={t} style={{marginBottom:"10px"}}><a href="#" style={{fontSize:"13px", color:"#666", textDecoration:"none", fontFamily:"system-ui"}}>{t}</a></p>
            ))}
            <div style={{marginTop:"20px", padding:"12px", background:"#111", borderRadius:"10px"}}>
              <p style={{fontSize:"10px", color:"#333", fontFamily:"system-ui", lineHeight:1.5}}>
                🔒 Documents are private<br/>
                🦉 Victorian law only<br/>
                ⚖️ Not legal advice
              </p>
            </div>
          </div>
        </div>
        {/* Footer bottom */}
        <div style={{borderTop:"1px solid #111", padding:"20px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px"}}>
          <p style={{fontSize:"12px", color:"#333", fontFamily:"system-ui"}}>
            © 2025 PropertyOwl AI · propertyowlai.com · Victoria, Australia
          </p>
          <div style={{display:"flex", gap:"20px"}}>
            {["Privacy","Terms","Contact"].map(t => (
              <a key={t} href="#" style={{fontSize:"12px", color:"#333", textDecoration:"none", fontFamily:"system-ui"}}>{t}</a>
            ))}
          </div>
        </div>
        </div>
        </div>
      </footer>

    </div>
  )
}
