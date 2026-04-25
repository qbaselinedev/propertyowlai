import Link from 'next/link'

export default function PricingPage() {
  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }} className="min-h-screen bg-[#FAFAF8]">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-[#E8E8E4] bg-[#FAFAF8]">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <span className="text-2xl">🦉</span>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]" style={{ letterSpacing: '-0.02em' }}>
            PropertyOwl<span className="text-[#E8001D]"> AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/auth/login" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors" style={{ fontFamily: 'system-ui' }}>Sign in</Link>
          <Link href="/auth/signup" className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg hover:opacity-90" style={{ background: '#E8001D', fontFamily: 'system-ui' }}>Get started →</Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-8 py-32 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 border-2 border-red-100 mb-8">
          <span className="text-4xl">💰</span>
        </div>
        <h1 className="text-4xl font-bold text-[#1A1A1A] mb-4" style={{ letterSpacing: '-0.03em' }}>
          Pricing <span className="text-[#E8001D]">Coming Soon</span>
        </h1>
        <p className="text-lg text-[#666] leading-relaxed mb-8 max-w-md mx-auto" style={{ fontFamily: 'system-ui' }}>
          We're finalising our pricing plans for conveyancers and lawyers. Sign up now to get early access and be the first to know when pricing is announced.
        </p>
        <div className="bg-white border border-[#EBEBEB] rounded-2xl p-8 mb-8 text-left max-w-md mx-auto">
          <p className="text-sm font-bold text-[#111] mb-4" style={{ fontFamily: 'system-ui' }}>What's included in every plan:</p>
          {[
            'Full S32 & Contract of Sale analysis',
            'Risk scoring with recommendations',
            'Client advisory email drafting',
            'Task management per property',
            'Customer CRM with communication tracking',
            'Professional PDF reports',
            'Online property intelligence scan',
          ].map(f => (
            <div key={f} className="flex items-center gap-2.5 py-1.5">
              <span className="text-emerald-500 font-bold text-sm">✓</span>
              <span className="text-sm text-[#444]" style={{ fontFamily: 'system-ui' }}>{f}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/auth/signup" className="inline-flex items-center gap-2 text-sm font-semibold text-white px-7 py-3 rounded-xl hover:opacity-90" style={{ background: '#E8001D', fontFamily: 'system-ui' }}>
            Sign up for early access →
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#555] px-7 py-3 rounded-xl border border-[#DDD] hover:text-[#111]" style={{ fontFamily: 'system-ui' }}>
            ← Back home
          </Link>
        </div>
      </div>
    </div>
  )
}
