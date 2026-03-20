'use client'

import Link from "next/link"
import { useState, useEffect } from "react"

const R = "#E8001D"

function Slider() {
  const [images, setImages] = useState<string[]>([])
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/screenshots')
      .then(r => r.json())
      .then(d => { setImages(d.images || []); setReady(true) })
      .catch(() => setReady(true))
  }, [])

  useEffect(() => {
    if (images.length < 2) return
    const t = setInterval(() => setActive(a => (a + 1) % images.length), 3500)
    return () => clearInterval(t)
  }, [images.length])

  if (!ready) return (
     <div style={{background:"#111", borderRadius:"16px", height:"100%", minHeight:"520px", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <span style={{color:"#333", fontSize:"13px"}}>Loading…</span>
    </div>
  )

  if (images.length === 0) return <FallbackCard />

  return (
     <div style={{background:"#111", borderRadius:"16px", overflow:"hidden", display:"flex", flexDirection:"column", height:"100%", minHeight:"520px"}}>
      {/* Browser chrome */}
      <div style={{padding:"10px 14px 0", background:"#0A0A0A", flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", gap:"5px", marginBottom:"8px"}}>
          <div style={{width:"9px", height:"9px", borderRadius:"50%", background:"#FF5F57"}}/>
          <div style={{width:"9px", height:"9px", borderRadius:"50%", background:"#FEBC2E"}}/>
          <div style={{width:"9px", height:"9px", borderRadius:"50%", background:"#28C840"}}/>
          <div style={{flex:1, background:"#1A1A1A", borderRadius:"4px", height:"20px", display:"flex", alignItems:"center", padding:"0 8px"}}>
            <span style={{fontSize:"9px", color:"#444"}}>propertyowlai.com/dashboard</span>
          </div>
        </div>
      </div>
      {/* Images */}
      <div style={{flex:1, position:"relative", overflow:"hidden"}}>
        {images.map((src, i) => (
          <img key={src} src={src} alt=""
            style={{
              position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", objectPosition:"top left",
              opacity: i === active ? 1 : 0,
              transition:"opacity 0.6s ease",
              display:"block"
            }}
          />
        ))}
      </div>
      {/* Dots */}
      {images.length > 1 && (
        <div style={{background:"#0A0A0A", padding:"10px", display:"flex", justifyContent:"center", gap:"6px", flexShrink:0}}>
          {images.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              width: i === active ? "18px" : "6px", height:"6px",
              borderRadius:"10px", border:"none", cursor:"pointer",
              background: i === active ? R : "#2A2A2A",
              transition:"all 0.3s", padding:0
            }}/>
          ))}
        </div>
      )}
    </div>
  )
}

function FallbackCard() {
  return (
    <div style={{background:"#FAFAF8", border:"1px solid #EBEBEB", borderRadius:"16px", overflow:"hidden"}}>
      <div style={{background:"#111", padding:"12px 16px", display:"flex", alignItems:"center", gap:"8px"}}>
        <div style={{display:"flex", gap:"5px"}}>
          <div style={{width:"10px", height:"10px", borderRadius:"50%", background:"#FF5F57"}}/>
          <div style={{width:"10px", height:"10px", borderRadius:"50%", background:"#FEBC2E"}}/>
          <div style={{width:"10px", height:"10px", borderRadius:"50%", background:"#28C840"}}/>
        </div>
        <span style={{fontSize:"10px", color:"#555"}}>propertyowlai.com · 42 Wellington St, Carlton</span>
      </div>
      <div style={{padding:"16px"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px"}}>
          <span style={{fontSize:"12px", fontWeight:700, color:"#111"}}>Contract Scan · S32 Review</span>
          <span style={{fontSize:"10px", background:"#FEE2E2", color:"#991B1B", padding:"2px 8px", borderRadius:"20px", fontWeight:700}}>6 items</span>
        </div>
        {[
          {sev:"HIGH",  t:"Undischarged mortgage — CBA BK129045Z", bg:"#FFF5F5", bc:"#FECACA", tc:"#991B1B"},
          {sev:"HIGH",  t:"Council rates $1,842.50 overdue",        bg:"#FFF5F5", bc:"#FECACA", tc:"#991B1B"},
          {sev:"MED",   t:"OC annual levy not disclosed in S32",     bg:"#FFFBEB", bc:"#FDE68A", tc:"#92400E"},
          {sev:"CLEAR", t:"Land tax $0 · No permits · Windfall NIL", bg:"#F0FDF4", bc:"#BBF7D0", tc:"#15803D"},
        ].map(({sev,t,bg,bc,tc}) => (
          <div key={t} style={{background:bg, border:`1px solid ${bc}`, borderRadius:"8px", padding:"9px 12px", marginBottom:"6px", display:"flex", alignItems:"center", gap:"8px"}}>
            <span style={{fontSize:"8px", fontWeight:800, color:tc, background:"white", border:`1px solid ${bc}`, padding:"2px 6px", borderRadius:"4px", flexShrink:0}}>{sev}</span>
            <span style={{fontSize:"11px", fontWeight:600, color:tc}}>{t}</span>
          </div>
        ))}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", marginTop:"12px"}}>
          {[{n:"7.2",l:"Risk score",c:R},{n:"4",l:"Negotiation pts",c:"#111"},{n:"PDF",l:"Pack ready",c:"#5B21B6"}].map(({n,l,c})=>(
            <div key={l} style={{background:"white", border:"1px solid #EBEBEB", borderRadius:"8px", padding:"10px", textAlign:"center"}}>
              <div style={{fontSize:"18px", fontWeight:800, color:c, fontFamily:"Georgia,serif"}}>{n}</div>
              <div style={{fontSize:"9px", color:"#888", marginTop:"2px"}}>{l}</div>
            </div>
          ))}
        </div>
        <p style={{fontSize:"10px", color:"#CCC", textAlign:"center", marginTop:"12px"}}>
          Add screenshots to <code style={{background:"#F5F5F5", padding:"1px 4px", borderRadius:"3px"}}>public/screenshots/</code> to show your app here
        </p>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div style={{fontFamily:"system-ui,sans-serif", background:"#fff", color:"#111"}}>

      {/* NAV */}
      <nav style={{borderBottom:"1px solid #F0F0F0", padding:"0 48px", height:"60px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"white", zIndex:50}}>
        <div style={{display:"flex", alignItems:"center", gap:"10px", fontWeight:700, fontSize:"17px", letterSpacing:"-0.02em"}}>
          <span style={{fontSize:"22px"}}>🦉</span>
          PropertyOwl<span style={{color:R}}> AI</span>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
          <Link href="/pricing" style={{color:"#666", fontSize:"13px", textDecoration:"none", padding:"8px 12px"}}>Pricing</Link>
          <Link href="/auth/login" style={{color:"#111", fontSize:"13px", fontWeight:600, textDecoration:"none", padding:"8px 16px", border:"1.5px solid #DDD", borderRadius:"8px"}}>Sign in</Link>
          <Link href="/auth/signup" style={{color:"white", background:R, fontSize:"13px", fontWeight:700, textDecoration:"none", padding:"9px 18px", borderRadius:"8px"}}>Get started →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{maxWidth:"1280px", margin:"0 auto", padding:"80px 48px 72px", display:"grid", gridTemplateColumns:"0.9fr 1.1fr", gap:"64px", alignItems:"center"}}>
        <div>
          <div style={{display:"inline-flex", alignItems:"center", gap:"6px", background:"#FFF0F0", border:"1px solid #FECACA", borderRadius:"6px", padding:"4px 12px", marginBottom:"20px"}}>
            <div style={{width:"6px", height:"6px", background:R, borderRadius:"50%"}}/>
            <span style={{fontSize:"11px", fontWeight:700, color:"#B52020", letterSpacing:"0.06em", textTransform:"uppercase"}}>Victoria's only AI property analyser</span>
          </div>
          <h1 style={{fontSize:"44px", fontWeight:800, lineHeight:1.08, letterSpacing:"-0.04em", marginBottom:"18px", fontFamily:"Georgia,serif"}}>
            Property 360 - Contract Review & Deep Online Scan<span style={{color:R}}>in 2 minutes using AI.</span>
          </h1>
          <p style={{fontSize:"16px", color:"#555", lineHeight:1.7, marginBottom:"32px", maxWidth:"420px"}}>
            Upload your Section 32 and Contract of Sale. PropertyOwl surfaces every risk, fee and detail — so you walk into every conversation with your conveyancer already knowing the right questions to ask.
          </p>
          <div style={{display:"flex", gap:"12px", marginBottom:"20px"}}>
            <Link href="/dashboard" style={{background:R, color:"white", fontWeight:700, fontSize:"14px", padding:"13px 28px", borderRadius:"8px", textDecoration:"none"}}>Try with demo property →</Link>
            <Link href="/auth/signup" style={{color:"#111", fontWeight:600, fontSize:"14px", padding:"13px 20px", borderRadius:"8px", textDecoration:"none", border:"1.5px solid #DDD"}}>Join free</Link>
          </div>
          <p style={{fontSize:"12px", color:"#AAA"}}>From $25 · One-time payment · No subscription · Not legal advice</p>
        </div>

        {/* Right — screenshot slider */}
        <div style={{minHeight:"560px"}}>
          <Slider />
        </div>
      </section>

      {/* STATS */}
      <div style={{background:"#111", display:"grid", gridTemplateColumns:"repeat(4,1fr)"}}>
        {[["2 min","Full S32 + contract review"],["$25","Per property — not per hour"],["60+","Data points extracted"],["100%","Victorian law — VicPlan, OCA, SLA"]].map(([n,l],i)=>(
          <div key={l} style={{padding:"22px 24px", textAlign:"center", borderRight:i<3?"1px solid #1E1E1E":"none"}}>
            <div style={{fontSize:"24px", fontWeight:800, color:"white", fontFamily:"Georgia,serif", marginBottom:"4px"}}>{n}</div>
            <div style={{fontSize:"11px", color:"#555"}}>{l}</div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <section style={{maxWidth:"1100px", margin:"0 auto", padding:"72px 48px"}}>
        <p style={{fontSize:"11px", fontWeight:700, color:R, letterSpacing:"0.12em", textTransform:"uppercase", textAlign:"center", marginBottom:"8px"}}>How it works</p>
        <h2 style={{fontSize:"32px", fontWeight:800, letterSpacing:"-0.03em", textAlign:"center", marginBottom:"48px", fontFamily:"Georgia,serif"}}>Under 5 minutes, start to finish</h2>
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"32px"}}>
          {[
            {n:"1", icon:"🏠", t:"Add a property",       d:"Enter the address — file created instantly with background online scan"},
            {n:"2", icon:"📤", t:"Upload S32 + contract", d:"Drop in your PDF — AI reads every page, title, outgoings, all conditions", red:true},
            {n:"3", icon:"🤖", t:"AI reads everything",   d:"Both document scan and internet search run simultaneously — under 2 min"},
            {n:"4", icon:"📋", t:"Get your answers",      d:"Risk score, flags, negotiation brief and Conveyancer Pack PDF — done"},
          ].map(({n,icon,t,d,red})=>(
            <div key={n} style={{textAlign:"center"}}>
              <div style={{position:"relative", display:"inline-block", marginBottom:"14px"}}>
                <div style={{width:"52px", height:"52px", borderRadius:"50%", background:red?R:"#F5F5F5", border:red?`2px solid ${R}`:"2px solid #EBEBEB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", margin:"0 auto"}}>
                  {icon}
                </div>
                <div style={{position:"absolute", top:"-4px", right:"-4px", width:"18px", height:"18px", background:red?"#111":R, borderRadius:"50%", fontSize:"9px", fontWeight:800, color:"white", display:"flex", alignItems:"center", justifyContent:"center"}}>{n}</div>
              </div>
              <p style={{fontSize:"13px", fontWeight:700, color:"#111", marginBottom:"6px"}}>{t}</p>
              <p style={{fontSize:"12px", color:"#888", lineHeight:1.6}}>{d}</p>
            </div>
          ))}
        </div>
        {/* 2b note */}
        <div style={{marginTop:"24px", background:"#F5F3FF", border:"1px solid #DDD6FE", borderRadius:"10px", padding:"12px 20px", display:"flex", alignItems:"center", gap:"10px", maxWidth:"500px", margin:"24px auto 0"}}>
          <span style={{fontSize:"18px"}}>🌐</span>
          <div>
            <p style={{fontSize:"12px", fontWeight:700, color:"#5B21B6", marginBottom:"2px"}}>Also runs automatically: Deep internet search</p>
            <p style={{fontSize:"11px", color:"#7C3AED"}}>Planning zones, school catchments, sold history, flood & bushfire risk — no upload needed</p>
          </div>
        </div>
      </section>

      {/* WHAT WE SURFACE */}
      <section style={{background:"#FAFAF8", borderTop:"1px solid #F0F0F0", padding:"72px 48px"}}>
        <div style={{maxWidth:"1100px", margin:"0 auto"}}>
          <p style={{fontSize:"11px", fontWeight:700, color:R, letterSpacing:"0.12em", textTransform:"uppercase", textAlign:"center", marginBottom:"8px"}}>What we surface</p>
          <h2 style={{fontSize:"32px", fontWeight:800, letterSpacing:"-0.03em", textAlign:"center", marginBottom:"48px", fontFamily:"Georgia,serif"}}>Everything a buyer needs to know</h2>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px"}}>
            {[
              {icon:"🏛", tag:"Contract scan", tc:"#991B1B", tb:"#FEE2E2", t:"Title & encumbrances",    d:"Mortgages, caveats, easements — surfaced with exact references and discharge requirements."},
              {icon:"💰", tag:"Contract scan", tc:"#991B1B", tb:"#FEE2E2", t:"Outgoings to the dollar", d:"Rates, water, OC levies, land tax — every figure with due dates and arrears flagged."},
              {icon:"🗺", tag:"Online scan",   tc:"#5B21B6", tb:"#EDE9FE", t:"Planning & overlays",     d:"Zone, heritage, flood, bushfire and design overlays — checked against VicPlan automatically."},
              {icon:"🏫", tag:"Online scan",   tc:"#5B21B6", tb:"#EDE9FE", t:"School zones & suburb",   d:"Zoned schools with distances. Median prices, growth, comparable sales, rental yield."},
              {icon:"📋", tag:"Contract scan", tc:"#991B1B", tb:"#FEE2E2", t:"Contract conditions",     d:"Price, deposit, settlement, cooling off, special conditions — every clause with risk level."},
              {icon:"📄", tag:"Both scans",    tc:"#15803D", tb:"#DCFCE7", t:"Conveyancer Pack PDF",    d:"8-page structured briefing your conveyancer can act on immediately — cuts their time and your bill."},
            ].map(({icon,tag,tc,tb,t,d})=>(
              <div key={t} style={{background:"white", border:"1px solid #EBEBEB", borderRadius:"12px", padding:"24px"}}>
                <span style={{fontSize:"28px", display:"block", marginBottom:"14px"}}>{icon}</span>
                <span style={{fontSize:"9px", fontWeight:700, color:tc, background:tb, padding:"2px 8px", borderRadius:"4px", display:"inline-block", marginBottom:"10px", letterSpacing:"0.06em", textTransform:"uppercase"}}>{tag}</span>
                <p style={{fontSize:"15px", fontWeight:700, color:"#111", marginBottom:"6px"}}>{t}</p>
                <p style={{fontSize:"12px", color:"#777", lineHeight:1.65}}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{maxWidth:"1100px", margin:"0 auto", padding:"72px 48px"}}>
        <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"36px", flexWrap:"wrap", gap:"12px"}}>
          <div>
            <p style={{fontSize:"11px", fontWeight:700, color:R, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"8px"}}>Pricing</p>
            <h2 style={{fontSize:"32px", fontWeight:800, letterSpacing:"-0.03em", fontFamily:"Georgia,serif"}}>Simple. Transparent.</h2>
          </div>
          <div style={{background:"#F0FDF4", border:"1px solid #BBF7D0", color:"#15803D", fontSize:"12px", fontWeight:700, padding:"7px 14px", borderRadius:"8px"}}>
            ✓ One-time payment · No subscription · Credits never expire
          </div>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", maxWidth:"760px"}}>
          {[
            {lbl:"Starter",    p:"$25",  note:"$25/property · 5 credits",        dark:false, best:""},
            {lbl:"Popular",    p:"$70",  note:"$23/property · 15 credits",        dark:true,  best:"MOST POPULAR"},
            {lbl:"Best value", p:"$100", note:"$20/property · 25 credits · –$25", dark:false, best:"BEST VALUE"},
          ].map(({lbl,p,note,dark,best})=>(
            <div key={lbl} style={{background:dark?"#111":"white", border:dark?"none":"1px solid #EBEBEB", borderRadius:"14px", padding:"24px"}}>
              <p style={{fontSize:"9px", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:dark?R:best?"#15803D":"#AAA", marginBottom:"12px"}}>{best||lbl}</p>
              <p style={{fontSize:"38px", fontWeight:800, color:dark?"white":"#111", fontFamily:"Georgia,serif", letterSpacing:"-0.04em", lineHeight:1, marginBottom:"4px"}}>{p}</p>
              <p style={{fontSize:"11px", color:dark?"#555":"#AAA", marginBottom:"20px"}}>{note}</p>
              {["Online scan","S32 + contract review","Risk flags + negotiation","Conveyancer Pack PDF"].map(f=>(
                <p key={f} style={{fontSize:"12px", color:dark?"rgba(255,255,255,0.5)":"#555", display:"flex", gap:"8px", marginBottom:"8px"}}>
                  <span style={{color:R, fontWeight:900}}>✓</span>{f}
                </p>
              ))}
              <Link href="/auth/signup" style={{display:"block", textAlign:"center", padding:"11px", borderRadius:"8px", fontSize:"13px", fontWeight:700, textDecoration:"none", marginTop:"20px", background:dark?"white":"#111", color:dark?"#111":"white"}}>Get started</Link>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{background:"#111", padding:"72px 48px", textAlign:"center"}}>
        <div style={{maxWidth:"560px", margin:"0 auto"}}>
          <span style={{fontSize:"40px", display:"block", marginBottom:"16px"}}>🦉</span>
          <h2 style={{fontSize:"36px", fontWeight:800, color:"white", letterSpacing:"-0.03em", marginBottom:"12px", fontFamily:"Georgia,serif"}}>Stop signing blind.</h2>
          <p style={{fontSize:"15px", color:"#555", lineHeight:1.7, marginBottom:"28px"}}>360° property intelligence — contract analysis + deep internet scan — before you bid, sign or commit.</p>
          <Link href="/auth/signup" style={{display:"inline-block", background:R, color:"white", fontSize:"15px", fontWeight:700, padding:"14px 36px", borderRadius:"8px", textDecoration:"none"}}>
            Join free — from $25 per property →
          </Link>
          <div style={{display:"flex", justifyContent:"center", gap:"24px", marginTop:"20px", flexWrap:"wrap"}}>
            {["🦉 Victorian law only","⚖️ Not legal advice","🔒 Private & secure"].map(t=>(
              <span key={t} style={{fontSize:"11px", color:"#444"}}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:"#0A0A0A", padding:"56px 48px 0"}}>
        <div style={{maxWidth:"1100px", margin:"0 auto"}}>
          <div style={{display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:"48px", paddingBottom:"48px", borderBottom:"1px solid #1A1A1A"}}>
            <div>
              <div style={{display:"flex", alignItems:"center", gap:"8px", fontWeight:700, fontSize:"16px", color:"white", marginBottom:"14px"}}>
                🦉 PropertyOwl<span style={{color:R}}> AI</span>
              </div>
              <p style={{fontSize:"13px", color:"#555", lineHeight:1.7, maxWidth:"240px", marginBottom:"16px"}}>AI-powered property review for Victorian buyers. Surface every risk before you sign anything.</p>
              <p style={{fontSize:"11px", color:"#333", lineHeight:1.6}}>Not legal advice. Always engage a licensed<br/>Victorian conveyancer before signing.</p>
            </div>
            {[
              {h:"Product", links:["How it works","Pricing","Sample report","Contract scan","Online scan","PDF pack"]},
              {h:"Company", links:["About","Contact","Blog","Careers"]},
              {h:"Legal",   links:["Privacy policy","Terms of service","Disclaimer","Cookie policy"]},
            ].map(({h,links})=>(
              <div key={h}>
                <p style={{fontSize:"11px", fontWeight:700, color:"#444", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"16px"}}>{h}</p>
                {links.map(l=>(
                  <p key={l} style={{marginBottom:"10px"}}>
                    <a href="#" style={{fontSize:"13px", color:"#555", textDecoration:"none"}}>{l}</a>
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div style={{padding:"20px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px"}}>
            <p style={{fontSize:"12px", color:"#333"}}>© 2025 PropertyOwl AI · propertyowlai.com · Victoria, Australia</p>
            <div style={{display:"flex", gap:"20px"}}>
              {["Privacy","Terms","Contact"].map(t=>(
                <a key={t} href="#" style={{fontSize:"12px", color:"#333", textDecoration:"none"}}>{t}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
