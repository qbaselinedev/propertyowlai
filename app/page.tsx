'use client'

import Link from "next/link"

export default function HomePage() {
  return (
    <div style={{fontFamily:"system-ui, sans-serif", background:"#F5F4F0", minHeight:"100vh"}}>

      {/* ── NAV ── */}
      <nav style={{
        background:"white", borderBottom:"1px solid #E8E8E4",
        padding:"0 40px", height:"56px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:50
      }}>
        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
          <span style={{fontSize:"20px"}}>🦉</span>
          <span style={{fontSize:"17px", fontWeight:700, letterSpacing:"-0.02em", fontFamily:"Georgia, serif"}}>
            PropertyOwl<span style={{color:"#E8001D"}}> AI</span>
          </span>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"20px"}}>
          <Link href="/pricing" style={{fontSize:"13px", color:"#555", textDecoration:"none"}}>Pricing</Link>
          <Link href="/auth/login" style={{fontSize:"13px", color:"#555", textDecoration:"none"}}>Sign in</Link>
          <Link href="/auth/signup" style={{
            fontSize:"13px", fontWeight:600, color:"white",
            background:"#E8001D", padding:"8px 18px", borderRadius:"8px", textDecoration:"none"
          }}>Get started →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        maxWidth:"1100px", margin:"0 auto",
        padding:"48px 32px 32px",
        display:"grid", gridTemplateColumns:"420px 1fr",
        gap:"40px", alignItems:"center"
      }}>

        {/* Left: Headline + CTA */}
        <div>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:"8px",
            fontSize:"10px", fontWeight:700, color:"#E8001D",
            letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"16px"
          }}>
            <span style={{width:"20px", height:"2px", background:"#E8001D", display:"inline-block", flexShrink:0}}/>
            Victoria's only AI property analyser
          </div>
          <h1 style={{
            fontSize:"36px", fontWeight:700, lineHeight:1.15,
            letterSpacing:"-0.025em", color:"#1A1A1A",
            fontFamily:"Georgia, serif", marginBottom:"16px"
          }}>
            Know everything<br/>before you<br/><span style={{color:"#E8001D"}}>sign anything.</span>
          </h1>
          <p style={{fontSize:"15px", color:"#555", lineHeight:1.7, marginBottom:"24px", maxWidth:"380px"}}>
            Upload your S32 and Contract of Sale — get every flag, fee, risk and
            negotiation point in under 2 minutes. The smartest thing you can do before bidding.
          </p>
          <div style={{display:"flex", gap:"10px", marginBottom:"16px"}}>
            <Link href="/auth/signup" style={{
              display:"inline-flex", alignItems:"center", gap:"6px",
              background:"#E8001D", color:"white", fontWeight:700,
              fontSize:"14px", padding:"12px 24px", borderRadius:"10px", textDecoration:"none"
            }}>Start for free →</Link>
            <Link href="/auth/signup" style={{
              display:"inline-flex", alignItems:"center",
              fontSize:"14px", color:"#333", padding:"12px 18px",
              border:"1.5px solid #D0D0D0", borderRadius:"10px",
              textDecoration:"none", background:"white"
            }}>See a sample report</Link>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:"6px"}}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:"6px",
              background:"#F0FDF4", border:"1px solid #BBF7D0",
              color:"#15803D", fontSize:"12px", fontWeight:700,
              padding:"6px 14px", borderRadius:"20px", width:"fit-content"
            }}>
              ✓ One-time payment — no subscription
            </div>
            <p style={{fontSize:"11px", color:"#999", paddingLeft:"2px"}}>
              From $25 per property · Credits never expire · Not legal advice
            </p>
          </div>
        </div>

        {/* Right: Owl + static question boxes */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"center"}}>
          <div style={{position:"relative", width:"420px", height:"380px"}}>

            {/* ── Static question boxes — 8 arranged around owl ── */}

            {/* Top center */}
            <div style={{position:"absolute", top:"0", left:"50%", transform:"translateX(-50%)",
              background:"#FFF5F5", border:"1px solid #FCCACA", borderRadius:"8px",
              padding:"7px 10px", width:"130px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#B52020", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>🏛 Title</p>
              <p style={{fontSize:"10px", color:"#2D1010", lineHeight:1.3}}>Undischarged mortgage on title?</p>
            </div>

            {/* Top right */}
            <div style={{position:"absolute", top:"10px", right:"0",
              background:"#F2F7FF", border:"1px solid #C0D6F7", borderRadius:"8px",
              padding:"7px 10px", width:"125px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#1A4FA0", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>🏫 Schools</p>
              <p style={{fontSize:"10px", color:"#0D1E3A", lineHeight:1.3}}>Which school zones apply?</p>
            </div>

            {/* Right */}
            <div style={{position:"absolute", top:"50%", right:"0", transform:"translateY(-50%)",
              background:"#F2FAF4", border:"1px solid #B8E4C2", borderRadius:"8px",
              padding:"7px 10px", width:"125px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#1A6B32", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>🗺 Planning</p>
              <p style={{fontSize:"10px", color:"#0D2A14", lineHeight:1.3}}>Zone, overlays, GAIC?</p>
            </div>

            {/* Bottom right */}
            <div style={{position:"absolute", bottom:"10px", right:"0",
              background:"#FFFBF0", border:"1px solid #F5DFA0", borderRadius:"8px",
              padding:"7px 10px", width:"125px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#8A5C00", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>💰 Rates</p>
              <p style={{fontSize:"10px", color:"#2D1E00", lineHeight:1.3}}>Council rates overdue?</p>
            </div>

            {/* Bottom center */}
            <div style={{position:"absolute", bottom:"0", left:"50%", transform:"translateX(-50%)",
              background:"#F8F5FF", border:"1px solid #D8C8F5", borderRadius:"8px",
              padding:"7px 10px", width:"130px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#5A2FB5", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>📋 Contract</p>
              <p style={{fontSize:"10px", color:"#1E0D40", lineHeight:1.3}}>Cooling off waived?</p>
            </div>

            {/* Bottom left */}
            <div style={{position:"absolute", bottom:"10px", left:"0",
              background:"#F0FAFA", border:"1px solid #A8E0DC", borderRadius:"8px",
              padding:"7px 10px", width:"125px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#0D6B65", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>📜 Easements</p>
              <p style={{fontSize:"10px", color:"#042220", lineHeight:1.3}}>Covenants on title?</p>
            </div>

            {/* Left */}
            <div style={{position:"absolute", top:"50%", left:"0", transform:"translateY(-50%)",
              background:"#F5F7FA", border:"1px solid #C8D4E4", borderRadius:"8px",
              padding:"7px 10px", width:"125px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#3A4A60", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>🚂 Transport</p>
              <p style={{fontSize:"10px", color:"#1A2030", lineHeight:1.3}}>Nearest station distance?</p>
            </div>

            {/* Top left */}
            <div style={{position:"absolute", top:"10px", left:"0",
              background:"#FFF0F5", border:"1px solid #F5C0D5", borderRadius:"8px",
              padding:"7px 10px", width:"125px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#A0204A", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>🏢 OC Levy</p>
              <p style={{fontSize:"10px", color:"#2D0A14", lineHeight:1.3}}>Annual levy disclosed?</p>
            </div>

            {/* Extra: Water charges — inner left between top-left and left */}
            <div style={{position:"absolute", top:"28%", left:"0",
              background:"#F0FAFA", border:"1px solid #A8E0DC", borderRadius:"8px",
              padding:"7px 10px", width:"125px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#0D6B65", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>💧 Water</p>
              <p style={{fontSize:"10px", color:"#042220", lineHeight:1.3}}>Water charges & balance?</p>
            </div>

            {/* Extra: Property history — inner right between top-right and right */}
            <div style={{position:"absolute", top:"28%", right:"0",
              background:"#F2F7FF", border:"1px solid #C0D6F7", borderRadius:"8px",
              padding:"7px 10px", width:"125px"}}>
              <p style={{fontSize:"8px", fontWeight:700, color:"#1A4FA0", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"2px"}}>📅 History</p>
              <p style={{fontSize:"10px", color:"#0D1E3A", lineHeight:1.3}}>Last sale price & when?</p>
            </div>

            {/* ── Owl SVG — center ── */}
            <div style={{
              position:"absolute", top:"50%", left:"50%",
              transform:"translate(-50%, -50%)",
              textAlign:"center", zIndex:5
            }}>
              <style>{`
                @keyframes owl-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
                @keyframes owl-blink { 0%,92%,100%{transform:scaleY(1)} 95%,98%{transform:scaleY(0.05)} }
                @keyframes glint { 0%,85%,100%{opacity:0} 90%,96%{opacity:1} }
                .owl-bob { animation: owl-bob 4s ease-in-out infinite; display:inline-block; }
                .eye-l { transform-origin: 51px 48px; animation: owl-blink 5s ease-in-out infinite; }
                .eye-r { transform-origin: 79px 48px; animation: owl-blink 5s ease-in-out infinite; }
                .mglint { animation: glint 5s ease-in-out infinite; }
              `}</style>
              <div className="owl-bob">
                <svg width="100" height="100" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
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
                  <g className="eye-l">
                    <circle cx="51" cy="48" r="13" fill="#F5E8C0"/>
                    <circle cx="51" cy="48" r="7.5" fill="#1A0D02"/>
                    <circle cx="48" cy="45" r="2.5" fill="white" opacity="0.9"/>
                  </g>
                  <g className="eye-r">
                    <circle cx="79" cy="48" r="13" fill="#F5E8C0"/>
                    <circle cx="79" cy="48" r="7.5" fill="#1A0D02"/>
                    <circle cx="76" cy="45" r="2.5" fill="white" opacity="0.9"/>
                  </g>
                  <circle cx="79" cy="48" r="16" fill="none" stroke="#B8860B" strokeWidth="4"/>
                  <circle cx="79" cy="48" r="16" fill="none" stroke="#F0C030" strokeWidth="1.5" strokeDasharray="2,4" opacity="0.7"/>
                  <circle cx="72" cy="40" r="2.5" fill="white" className="mglint" opacity="0"/>
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
              </div>
              <p style={{fontSize:"11px", fontWeight:700, color:"#1A1A1A", fontFamily:"Georgia, serif", lineHeight:1.3, marginTop:"4px"}}>
                Answers before<br/>you sign anything
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — horizontal strip ── */}
      <section style={{maxWidth:"1100px", margin:"0 auto", padding:"0 32px 40px"}}>
        <div style={{
          background:"white", border:"1px solid #E8E8E4",
          borderRadius:"16px", padding:"28px 32px"
        }}>
          <div style={{
            display:"flex", alignItems:"center", gap:"8px",
            fontSize:"10px", fontWeight:700, color:"#E8001D",
            letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"24px"
          }}>
            <span style={{width:"16px", height:"2px", background:"#E8001D", display:"inline-block"}}/>
            How it works — under 5 minutes
          </div>

          {/* Fork/merge layout */}
          <div style={{display:"grid", gridTemplateColumns:"120px 80px 130px 80px 120px 80px 120px", alignItems:"start"}}>

            {/* Step 1 */}
            <div style={{textAlign:"center"}}>
              <div style={{position:"relative", display:"inline-block"}}>
                <div style={{width:"48px",height:"48px",borderRadius:"50%",border:"2px solid #E8E8E4",background:"white",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:"22px"}}>🏠</div>
                <div style={{position:"absolute",top:"-6px",right:"-6px",width:"18px",height:"18px",background:"#E8001D",borderRadius:"50%",fontSize:"9px",fontWeight:700,color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>1</div>
              </div>
              <p style={{fontSize:"13px",fontWeight:700,color:"#1A1A1A",marginBottom:"4px",textAlign:"center"}}>Add a property</p>
              <p style={{fontSize:"11px",color:"#888",lineHeight:1.4,textAlign:"center"}}>Enter the address — instant file created</p>
            </div>

            {/* Fork SVG */}
            <svg width="80" height="200" viewBox="0 0 80 200" style={{overflow:"visible"}}>
              <line x1="0"  y1="24"  x2="40" y2="24"  stroke="#E8E8E4" strokeWidth="2"/>
              <line x1="40" y1="24"  x2="40" y2="162" stroke="#E8E8E4" strokeWidth="2"/>
              <line x1="40" y1="24"  x2="80" y2="24"  stroke="#E8E8E4" strokeWidth="2"/>
              <line x1="40" y1="162" x2="80" y2="162" stroke="#E8E8E4" strokeWidth="2"/>
            </svg>

            {/* 2a + 2b stacked */}
            <div style={{display:"flex", flexDirection:"column", gap:"28px"}}>
              <div style={{textAlign:"center"}}>
                <div style={{position:"relative", display:"inline-block"}}>
                  <div style={{width:"48px",height:"48px",borderRadius:"50%",border:"2px solid #E8001D",background:"#E8001D",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:"22px"}}>📤</div>
                  <div style={{position:"absolute",top:"-6px",right:"-6px",width:"18px",height:"18px",background:"#E8001D",borderRadius:"50%",fontSize:"9px",fontWeight:700,color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>2a</div>
                </div>
                <p style={{fontSize:"13px",fontWeight:700,color:"#1A1A1A",marginBottom:"4px",textAlign:"center"}}>Upload S32 + contract</p>
                <p style={{fontSize:"11px",color:"#888",lineHeight:1.4,textAlign:"center"}}>Drop in your PDF — AI reads every page</p>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{position:"relative", display:"inline-block"}}>
                  <div style={{width:"48px",height:"48px",borderRadius:"50%",border:"2px solid #C7D2FE",background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:"22px"}}>🌐</div>
                  <div style={{position:"absolute",top:"-6px",right:"-6px",width:"18px",height:"18px",background:"#5A2FB5",borderRadius:"50%",fontSize:"9px",fontWeight:700,color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>2b</div>
                </div>
                <p style={{fontSize:"13px",fontWeight:700,color:"#5A2FB5",marginBottom:"4px",textAlign:"center"}}>Deep search internet</p>
                <p style={{fontSize:"11px",color:"#888",lineHeight:1.4,textAlign:"center"}}>Planning, schools, history, flood risk</p>
              </div>
            </div>

            {/* Merge SVG */}
            <svg width="80" height="200" viewBox="0 0 80 200" style={{overflow:"visible"}}>
              <line x1="0"  y1="24"  x2="40" y2="24"  stroke="#E8E8E4" strokeWidth="2"/>
              <line x1="0"  y1="162" x2="40" y2="162" stroke="#E8E8E4" strokeWidth="2"/>
              <line x1="40" y1="24"  x2="40" y2="162" stroke="#E8E8E4" strokeWidth="2"/>
              <line x1="40" y1="93"  x2="80" y2="93"  stroke="#E8E8E4" strokeWidth="2"/>
            </svg>

            {/* Step 3 */}
            <div style={{textAlign:"center", marginTop:"69px"}}>
              <div style={{position:"relative", display:"inline-block"}}>
                <div style={{width:"48px",height:"48px",borderRadius:"50%",border:"2px solid #E8E8E4",background:"white",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:"22px"}}>🤖</div>
                <div style={{position:"absolute",top:"-6px",right:"-6px",width:"18px",height:"18px",background:"#E8001D",borderRadius:"50%",fontSize:"9px",fontWeight:700,color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>3</div>
              </div>
              <p style={{fontSize:"13px",fontWeight:700,color:"#1A1A1A",marginBottom:"4px",textAlign:"center"}}>AI reads everything</p>
              <p style={{fontSize:"11px",color:"#888",lineHeight:1.4,textAlign:"center"}}>Every page reviewed, every figure extracted in 2 min</p>
            </div>

            {/* Connector */}
            <svg width="80" height="2" style={{marginTop:"93px", overflow:"visible"}}>
              <line x1="0" y1="1" x2="80" y2="1" stroke="#E8E8E4" strokeWidth="2"/>
            </svg>

            {/* Step 4 */}
            <div style={{textAlign:"center", marginTop:"69px"}}>
              <div style={{position:"relative", display:"inline-block"}}>
                <div style={{width:"48px",height:"48px",borderRadius:"50%",border:"2px solid #E8E8E4",background:"white",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:"22px"}}>📋</div>
                <div style={{position:"absolute",top:"-6px",right:"-6px",width:"18px",height:"18px",background:"#E8001D",borderRadius:"50%",fontSize:"9px",fontWeight:700,color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>4</div>
              </div>
              <p style={{fontSize:"13px",fontWeight:700,color:"#1A1A1A",marginBottom:"4px",textAlign:"center"}}>Get your answers</p>
              <p style={{fontSize:"11px",color:"#888",lineHeight:1.4,textAlign:"center"}}>Flags, risk score, negotiation points + Conveyancer PDF</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION + SAMPLE REPORT ── */}
      <section style={{maxWidth:"1100px", margin:"0 auto", padding:"0 32px 40px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px"}}>

        {/* Problem / Solution */}
        <div style={{background:"white", border:"1px solid #E8E8E4", borderRadius:"16px", overflow:"hidden"}}>
          <div style={{background:"#1A1A1A", padding:"24px 28px"}}>
            <p style={{fontSize:"14px", fontWeight:700, color:"white", fontFamily:"Georgia, serif", marginBottom:"16px", lineHeight:1.3}}>
              What buyers face without PropertyOwl
            </p>
            {[
              "60+ pages of legal text written for lawyers, not buyers",
              "Undischarged mortgage discovered days later by your conveyancer",
              "$4,200 OC special levy buried deep in small print",
              "Bidding at auction with zero visibility on what you're actually buying",
            ].map(t => (
              <div key={t} style={{display:"flex", gap:"10px", marginBottom:"10px"}}>
                <div style={{width:"5px", height:"5px", background:"#E8001D", borderRadius:"50%", marginTop:"6px", flexShrink:0}}/>
                <p style={{fontSize:"12px", color:"#BBBBBB", lineHeight:1.5}}>{t}</p>
              </div>
            ))}
          </div>
          <div style={{padding:"24px 28px"}}>
            <p style={{fontSize:"14px", fontWeight:700, color:"#1A1A1A", fontFamily:"Georgia, serif", marginBottom:"16px", lineHeight:1.3}}>
              PropertyOwl reads it for you. In 2 minutes.
            </p>
            {[
              "Every encumbrance, caveat and discharge status flagged automatically",
              "Every rate, water charge and OC fee extracted with exact figures",
              "Every special condition summarised with risk level and recommendation",
              "Conveyancer Pack PDF saves you time — and their bill",
            ].map(t => (
              <div key={t} style={{display:"flex", gap:"10px", marginBottom:"10px", alignItems:"flex-start"}}>
                <div style={{
                  width:"16px", height:"16px", background:"#E8001D", borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, marginTop:"1px", fontSize:"9px", color:"white", fontWeight:700
                }}>✓</div>
                <p style={{fontSize:"12px", color:"#444", lineHeight:1.5}}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Report */}
        <div style={{background:"white", border:"1px solid #E8E8E4", borderRadius:"16px", overflow:"hidden"}}>
          <div style={{padding:"14px 20px", borderBottom:"1px solid #F0F0F0", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <p style={{fontSize:"10px", fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:"0.08em"}}>Sample report output</p>
            <span style={{fontSize:"10px", background:"#FFF5F5", color:"#B52020", padding:"3px 10px", borderRadius:"20px", fontWeight:700}}>6 items to review</span>
          </div>
          {[
            {sev:"HIGH",  sc:"#B52020", bg:"#FFF5F5", bc:"#FCCACA", text:"Undischarged mortgage — CBA BK129045Z"},
            {sev:"HIGH",  sc:"#B52020", bg:"#FFF5F5", bc:"#FCCACA", text:"Council rates $1,842.50 overdue — due 28/02/2026"},
            {sev:"MED",   sc:"#8A5C00", bg:"#FFFBF0", bc:"#F5DFA0", text:"OC annual levy not disclosed in S32"},
            {sev:"MED",   sc:"#8A5C00", bg:"#FFFBF0", bc:"#F5DFA0", text:"Periodic tenancy — Sharon Lawson, $1,955/month"},
            {sev:"CLEAR", sc:"#1A6B32", bg:"#F2FAF4", bc:"#B8E4C2", text:"Land tax $0 · No building permits · Windfall NIL"},
          ].map(({sev,sc,bg,bc,text}) => (
            <div key={text} style={{padding:"10px 20px", background:bg, borderBottom:`1px solid ${bc}`, display:"flex", alignItems:"center", gap:"10px"}}>
              <span style={{fontSize:"9px", fontWeight:700, color:sc, background:"white", border:`1px solid ${bc}`, padding:"2px 7px", borderRadius:"10px", flexShrink:0}}>{sev}</span>
              <span style={{fontSize:"12px", color:sc, fontWeight:sev==="CLEAR"?400:600, lineHeight:1.4}}>{text}</span>
            </div>
          ))}
          <div style={{padding:"14px 20px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", borderTop:"1px solid #F0F0F0"}}>
            {[{n:"7/10",t:"Risk score"},{n:"4",t:"Negotiation points"},{n:"PDF",t:"Conveyancer pack"}].map(({n,t}) => (
              <div key={t} style={{textAlign:"center", padding:"8px", background:"#FAFAFA", borderRadius:"8px"}}>
                <p style={{fontSize:"18px", fontWeight:700, color:"#E8001D", fontFamily:"Georgia, serif", lineHeight:1}}>{n}</p>
                <p style={{fontSize:"9px", color:"#888", marginTop:"2px"}}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section style={{background:"white", borderTop:"1px solid #E8E8E4", borderBottom:"1px solid #E8E8E4", padding:"48px 32px"}}>
        <div style={{maxWidth:"1100px", margin:"0 auto"}}>
          <p style={{fontSize:"10px", fontWeight:700, color:"#999", letterSpacing:"0.12em", textTransform:"uppercase", textAlign:"center", marginBottom:"36px"}}>
            What's included with every property review
          </p>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"32px"}}>
            {[
              {icon:"🏛", label:"Planning zone & overlays",   sub:"Heritage, flood, bushfire, design"},
              {icon:"📜", label:"Title & encumbrances",       sub:"Mortgages, caveats, easements"},
              {icon:"💰", label:"Outgoings & fees",           sub:"Rates, water, OC levies, land tax"},
              {icon:"📋", label:"Contract terms",             sub:"Price, deposit, cooling off, conditions"},
              {icon:"🏫", label:"School zones",               sub:"Zoned primary & secondary + distances"},
              {icon:"📈", label:"Suburb intelligence",        sub:"Median prices, growth, yield"},
              {icon:"📅", label:"Property history",           sub:"Past sales, rentals, year built"},
              {icon:"📄", label:"Conveyancer Pack PDF",       sub:"Structured 8-page briefing doc"},
            ].map(({icon,label,sub}) => (
              <div key={label} style={{textAlign:"center"}}>
                <span style={{fontSize:"28px"}}>{icon}</span>
                <p style={{fontSize:"13px", fontWeight:700, color:"#1A1A1A", marginTop:"10px", marginBottom:"4px"}}>{label}</p>
                <p style={{fontSize:"12px", color:"#888"}}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{maxWidth:"1100px", margin:"0 auto", padding:"48px 32px"}}>
        <div style={{textAlign:"center", marginBottom:"32px"}}>
          <p style={{fontSize:"10px", fontWeight:700, color:"#E8001D", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"8px"}}>Pricing</p>
          <h2 style={{fontSize:"28px", fontWeight:700, color:"#1A1A1A", fontFamily:"Georgia, serif", letterSpacing:"-0.02em", marginBottom:"10px"}}>
            Simple. Transparent. No surprises.
          </h2>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:"6px",
            background:"#F0FDF4", border:"1px solid #BBF7D0",
            color:"#15803D", fontSize:"12px", fontWeight:700,
            padding:"6px 16px", borderRadius:"20px"
          }}>✓ One-time payment — credits never expire</div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", maxWidth:"700px", margin:"0 auto 24px"}}>
          {[
            {name:"1 Property",   price:"$25",  note:"$25 per property · 5 credits",       popular:false, saving:null},
            {name:"3 Properties", price:"$70",  note:"$23 per property · 15 credits",      popular:true,  saving:"Save $5"},
            {name:"5 Properties", price:"$100", note:"$20 per property · 25 credits",      popular:false, saving:"Save $25"},
          ].map(({name,price,note,popular,saving}) => (
            <div key={name} style={{
              background:"white",
              border: popular ? "2px solid #E8001D" : "1px solid #E8E8E4",
              borderRadius:"14px", padding:"22px 18px", textAlign:"center"
            }}>
              {popular && <p style={{fontSize:"9px", fontWeight:700, color:"#E8001D", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px"}}>Most popular</p>}
              {saving && !popular && <p style={{fontSize:"9px", fontWeight:700, color:"#15803D", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px"}}>{saving}</p>}
              {!popular && !saving && <div style={{height:"17px", marginBottom:"6px"}}/>}
              <p style={{fontSize:"13px", fontWeight:700, color:"#1A1A1A", marginBottom:"6px"}}>{name}</p>
              <p style={{fontSize:"32px", fontWeight:700, color:"#1A1A1A", fontFamily:"Georgia, serif", lineHeight:1, marginBottom:"4px"}}>{price}</p>
              <p style={{fontSize:"10px", color:"#888", marginBottom:"16px"}}>{note}</p>
              <Link href="/auth/signup" style={{
                display:"block", fontSize:"12px", fontWeight:700,
                padding:"9px", borderRadius:"8px", textDecoration:"none",
                background: popular ? "#E8001D" : "#F5F5F5",
                color: popular ? "white" : "#1A1A1A"
              }}>Get started</Link>
            </div>
          ))}
        </div>

        <div style={{display:"flex", justifyContent:"center", gap:"24px", flexWrap:"wrap"}}>
          {["✓ Credits never expire","✓ No recurring charges","✓ Conveyancer Pack PDF always free","✓ Cancel anytime (nothing to cancel)"].map(t => (
            <span key={t} style={{fontSize:"11px", color:"#666"}}>{t}</span>
          ))}
        </div>
      </section>

      {/* ── BUILT FOR VIC ── */}
      <section style={{background:"white", borderTop:"1px solid #E8E8E4", padding:"56px 32px", textAlign:"center"}}>
        <div style={{maxWidth:"700px", margin:"0 auto"}}>
          <h2 style={{fontSize:"28px", fontWeight:700, color:"#1A1A1A", fontFamily:"Georgia, serif", letterSpacing:"-0.02em", marginBottom:"12px"}}>
            Built for Victorian property buyers
          </h2>
          <p style={{fontSize:"14px", color:"#555", lineHeight:1.7, marginBottom:"28px"}}>
            PropertyOwl is purpose-built for Victoria's property market — Sale of Land Act 1962,
            Owners Corporation Act, VicPlan planning zones and Victorian conveyancing practice.
          </p>
          <div style={{display:"flex", justifyContent:"center", gap:"28px", marginBottom:"32px", flexWrap:"wrap"}}>
            {["🦉 AI trained on Victorian property law","⚖️ Not legal advice — always use a conveyancer","🔒 Your documents are private"].map(t => (
              <span key={t} style={{fontSize:"12px", color:"#555"}}>{t}</span>
            ))}
          </div>
          <Link href="/auth/signup" style={{
            display:"inline-flex", alignItems:"center", gap:"8px",
            background:"#E8001D", color:"white", fontWeight:700,
            fontSize:"15px", padding:"14px 32px", borderRadius:"12px", textDecoration:"none"
          }}>
            Get started — from $25 per property →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:"#F5F4F0", borderTop:"1px solid #E8E8E4", padding:"20px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"8px"}}>
        <span style={{fontSize:"12px", color:"#999"}}>🦉 PropertyOwl AI · propertyowlai.com · Victoria, Australia</span>
        <span style={{fontSize:"11px", color:"#BBB"}}>AI-assisted review only. Not legal advice. Always engage a licensed Victorian conveyancer.</span>
      </footer>

    </div>
  )
}
