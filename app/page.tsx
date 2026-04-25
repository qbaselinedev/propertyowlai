'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const R = '#E8001D'

/* ── Animated counter ── */
function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let t = 0
    const step = Math.ceil(end / 40)
    const id = setInterval(() => { t = Math.min(t + step, end); setV(t); if (t >= end) clearInterval(id) }, 30)
    return () => clearInterval(id)
  }, [end])
  return <>{v}{suffix}</>
}

export default function HomePage() {
  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }} className="min-h-screen bg-[#FAFAF8]">

      {/* ── NAV ── */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-[#E8E8E4] bg-[#FAFAF8] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦉</span>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]" style={{ letterSpacing: '-0.02em' }}>
            PropertyOwl<span className="text-[#E8001D]"> AI</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors" style={{ fontFamily: 'system-ui' }}>Pricing</Link>
          <Link href="/auth/login" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors" style={{ fontFamily: 'system-ui' }}>Sign in</Link>
          <Link href="/auth/signup"
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: R, fontFamily: 'system-ui' }}>
            Get started →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E8001D] uppercase tracking-widest mb-6 pb-2 border-b border-[#E8001D]/30"
              style={{ fontFamily: 'system-ui' }}>
              Built for Victorian Conveyancers & Lawyers
            </div>
            <h1 className="text-[3.2rem] font-bold text-[#1A1A1A] leading-[1.08]" style={{ letterSpacing: '-0.03em' }}>
              Review every S32<br />
              in <span className="text-[#E8001D]">2 minutes,</span><br />
              not 2 hours.
            </h1>
            <p className="text-lg text-[#555] leading-relaxed mt-6 mb-8 max-w-[440px]" style={{ fontFamily: 'system-ui' }}>
              PropertyOwl AI reads your client's Section 32 and Contract of Sale, extracts every risk, and drafts a client advisory email — so you can focus on the advice, not the admin.
            </p>
            <div className="flex gap-3 mb-5">
              <Link href="/auth/signup" style={{ background: R, color: 'white', fontWeight: 700, fontSize: '14px', padding: '13px 28px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'system-ui' }}>
                Start free trial →
              </Link>
              <Link href="/auth/login" style={{ color: '#111', fontWeight: 600, fontSize: '14px', padding: '13px 20px', borderRadius: '8px', textDecoration: 'none', border: '1.5px solid #DDD', fontFamily: 'system-ui' }}>
                Sign in
              </Link>
            </div>
            <p className="text-xs text-[#999]" style={{ fontFamily: 'system-ui' }}>
              Victorian property law · Not legal advice · AI-assisted analysis
            </p>
          </div>

          {/* Right — benefit cards */}
          <div className="space-y-3">
            {[
              { icon: '⚡', title: 'Instant S32 & Contract extraction', body: 'Upload a PDF. Get 60+ data points extracted, risk-scored and categorised by severity in under 2 minutes. No manual reading required.' },
              { icon: '🔍', title: 'Every risk flagged with recommendations', body: 'AI surfaces undischarged mortgages, missing OC certs, unusual special conditions, overdue rates — with specific Victorian law references.' },
              { icon: '✉️', title: 'Client email drafted automatically', body: 'A professional advisory email is generated from your review. Edit, finalise and send — directly from the platform.' },
              { icon: '📋', title: 'Task management built in', body: 'Create tasks from risk items, track pending actions per property, and manage your workflow without leaving PropertyOwl.' },
            ].map(card => (
              <div key={card.title} className="bg-white border border-[#EBEBEB] rounded-xl p-5 hover:shadow-md transition-shadow">
                <span className="text-2xl block mb-3">{card.icon}</span>
                <p className="text-[15px] font-bold text-[#111] mb-1.5">{card.title}</p>
                <p className="text-[12px] text-[#777] leading-[1.65]" style={{ fontFamily: 'system-ui' }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{ background: '#111', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          ['2 min', 'Full S32 + contract review'],
          ['60+', 'Data points extracted per document'],
          ['100%', 'Victorian law — VicPlan, OCA, SLA'],
          ['0', 'Manual reading required'],
        ].map(([n, l], i) => (
          <div key={l as string} style={{ padding: '22px 24px', textAlign: 'center', borderRight: i < 3 ? '1px solid #333' : 'none' }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>{n}</p>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '4px', fontFamily: 'system-ui' }}>{l}</p>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-5xl mx-auto px-8 py-20">
        <p className="text-xs font-bold text-[#E8001D] uppercase tracking-widest mb-3" style={{ fontFamily: 'system-ui' }}>How it works</p>
        <h2 className="text-3xl font-bold text-[#1A1A1A] mb-12" style={{ letterSpacing: '-0.03em' }}>
          Three steps. Full property intelligence.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Upload documents', desc: 'Drop the S32, Contract of Sale, or both. PropertyOwl processes every page — title, OC, planning, outgoings, special conditions.' },
            { step: '02', title: 'Review AI analysis', desc: 'Risk items are categorised by severity with specific recommendations. Edit any finding, add your professional notes, toggle what goes to the client.' },
            { step: '03', title: 'Finalise & communicate', desc: 'Send the polished client advisory email, create follow-up tasks, and mark the property review as complete — all from one screen.' },
          ].map(s => (
            <div key={s.step} className="relative">
              <p className="text-5xl font-black text-[#F0F0F0] mb-4" style={{ fontFamily: 'Georgia' }}>{s.step}</p>
              <p className="text-base font-bold text-[#111] mb-2">{s.title}</p>
              <p className="text-sm text-[#777] leading-relaxed" style={{ fontFamily: 'system-ui' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="bg-white border-y border-[#EBEBEB]">
        <div className="max-w-5xl mx-auto px-8 py-20">
          <p className="text-xs font-bold text-[#E8001D] uppercase tracking-widest mb-3" style={{ fontFamily: 'system-ui' }}>Platform Features</p>
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-12" style={{ letterSpacing: '-0.03em' }}>
            Everything you need to review properties faster.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '📄', tag: 'S32 scan', tc: '#1E40AF', tb: '#DBEAFE', t: 'Section 32 analysis', d: 'Title, encumbrances, planning, easements, OC, outgoings, vendor disclosure — every section extracted and assessed.' },
              { icon: '📋', tag: 'Contract scan', tc: '#991B1B', tb: '#FEE2E2', t: 'Contract of Sale review', d: 'Price, deposit, settlement, cooling off, special conditions — every clause flagged with risk level and recommendation.' },
              { icon: '🌐', tag: 'Online scan', tc: '#065F46', tb: '#D1FAE5', t: 'Deep online intelligence', d: 'VicPlan overlays, flood maps, school zones, comparable sales, suburb profiles — all without leaving the platform.' },
              { icon: '✉️', tag: 'Communication', tc: '#7C3AED', tb: '#EDE9FE', t: 'Client email & CRM', d: 'Professional advisory emails drafted from your review. Full customer management with communication tracking.' },
              { icon: '✅', tag: 'Workflow', tc: '#0F766E', tb: '#CCFBF1', t: 'Tasks & follow-ups', d: 'Create tasks from risk items, set priorities, track completion — built-in task management per property.' },
              { icon: '📊', tag: 'Reports', tc: '#C2410C', tb: '#FFF7ED', t: 'Professional PDF reports', d: 'Download structured briefing documents. Professional formatting your clients and partners can act on immediately.' },
            ].map(({ icon, tag, tc, tb, t, d }) => (
              <div key={t} className="bg-[#FAFAF8] border border-[#EBEBEB] rounded-xl p-5 hover:shadow-sm transition-shadow">
                <span className="text-2xl block mb-3">{icon}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ color: tc, background: tb, fontFamily: 'system-ui' }}>{tag}</span>
                <p className="text-[15px] font-bold text-[#111] mt-3 mb-1.5">{t}</p>
                <p className="text-[12px] text-[#777] leading-[1.65]" style={{ fontFamily: 'system-ui' }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-3xl mx-auto px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4" style={{ letterSpacing: '-0.03em' }}>
          Ready to review properties faster?
        </h2>
        <p className="text-base text-[#777] mb-8 max-w-lg mx-auto" style={{ fontFamily: 'system-ui' }}>
          Join Victorian conveyancers and lawyers who are using AI to extract risks, draft client communications, and manage property reviews — all in one platform.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/auth/signup" style={{ background: R, color: 'white', fontWeight: 700, fontSize: '14px', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontFamily: 'system-ui' }}>
            Get started free →
          </Link>
          <Link href="/auth/login" style={{ color: '#111', fontWeight: 600, fontSize: '14px', padding: '14px 24px', borderRadius: '8px', textDecoration: 'none', border: '1.5px solid #DDD', fontFamily: 'system-ui' }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E8E8E4] py-8 px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🦉</span>
            <span className="text-sm font-bold text-[#1A1A1A]">PropertyOwl<span className="text-[#E8001D]"> AI</span></span>
          </div>
          <p className="text-xs text-[#999]" style={{ fontFamily: 'system-ui' }}>
            © {new Date().getFullYear()} PropertyOwl AI · Information display only — not legal advice · Victoria, Australia
          </p>
        </div>
      </footer>
    </div>
  )
}
