import Link from "next/link";

export default function PricingPage() {
  return (
    <div style={{fontFamily:"'Georgia', 'Times New Roman', serif"}} className="min-h-screen bg-[#FAFAF8]">

      {/* NAV */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-[#E8E8E4] bg-[#FAFAF8]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🦉</span>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]" style={{letterSpacing:'-0.02em'}}>
            PropertyOwl<span className="text-[#E8001D]"> AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/auth/login" className="text-sm text-[#555] hover:text-[#1A1A1A] transition-colors" style={{fontFamily:"system-ui"}}>Sign in</Link>
          <Link href="/auth/signup"
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-all"
            style={{background:'#E8001D', fontFamily:"system-ui"}}>
            Get started →
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-[#1A1A1A] mb-3" style={{letterSpacing:'-0.03em'}}>
            Simple pricing, per property
          </h1>
          <p className="text-lg text-[#666] max-w-lg mx-auto" style={{fontFamily:"system-ui"}}>
            Each property gets a full online scan, document review and a re-run.
            No subscription. Credits never expire.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {[
            {
              id: 'single',
              name: '1 Property',
              price: 25,
              priceNote: '$25 per property',
              credits: 5,
              popular: false,
              saving: null,
              features: [
                '1 online property scan',
                '1 S32 + contract review',
                'Risk analysis & flags',
                'Negotiation brief',
                'Conveyancer Pack PDF',
                '1 re-run included',
              ],
            },
            {
              id: 'three',
              name: '3 Properties',
              price: 70,
              priceNote: '$23 per property',
              credits: 15,
              popular: true,
              saving: 'Save $5',
              features: [
                '3 online property scans',
                '3 S32 + contract reviews',
                'Risk analysis & flags',
                'Negotiation briefs',
                '3 Conveyancer Pack PDFs',
                '3 re-runs included',
              ],
            },
            {
              id: 'five',
              name: '5 Properties',
              price: 100,
              priceNote: '$20 per property',
              credits: 25,
              popular: false,
              saving: 'Save $25',
              features: [
                '5 online property scans',
                '5 S32 + contract reviews',
                'Risk analysis & flags',
                'Negotiation briefs',
                '5 Conveyancer Pack PDFs',
                '5 re-runs included',
              ],
            },
          ].map((pkg) => (
            <div key={pkg.id}
              className={`bg-white rounded-2xl border overflow-hidden flex flex-col ${
                pkg.popular ? 'border-[#E8001D] shadow-lg shadow-red-50' : 'border-[#E8E8E4]'
              }`}>
              {pkg.popular ? (
                <div className="bg-[#E8001D] text-white text-xs font-semibold text-center py-2 tracking-wider uppercase" style={{fontFamily:"system-ui"}}>
                  Most popular
                </div>
              ) : pkg.saving ? (
                <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold text-center py-2" style={{fontFamily:"system-ui"}}>
                  {pkg.saving}
                </div>
              ) : <div className="py-2" />}

              <div className="p-6 flex-1">
                <p className="text-sm text-[#999] font-semibold mb-1" style={{fontFamily:"system-ui"}}>{pkg.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-[#1A1A1A]" style={{letterSpacing:'-0.03em'}}>${pkg.price}</span>
                  <span className="text-[#999] text-sm" style={{fontFamily:"system-ui"}}>AUD</span>
                </div>
                <p className="text-xs text-[#999] mb-5" style={{fontFamily:"system-ui"}}>{pkg.priceNote}</p>

                {/* Credit breakdown visual */}
                <div className="bg-[#F5F5F2] rounded-xl p-4 mb-5">
                  <p className="text-xs text-[#999] font-semibold uppercase tracking-wider mb-3" style={{fontFamily:"system-ui"}}>Per property breakdown</p>
                  {[
                    {label:'Online scan',       cost:'1 credit', pct:20, color:'#3B82F6'},
                    {label:'Document review',   cost:'2 credits',pct:40, color:'#E8001D'},
                    {label:'Re-run buffer',     cost:'2 credits',pct:40, color:'#D1D5DB'},
                  ].map(({label,cost,pct,color}) => (
                    <div key={label} className="mb-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-[#555]" style={{fontFamily:"system-ui"}}>{label}</span>
                        <span className="text-xs text-[#999]" style={{fontFamily:"system-ui"}}>{cost}</span>
                      </div>
                      <div className="h-1.5 bg-[#E8E8E4] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`, background:color}} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between mt-3 pt-3 border-t border-[#E8E8E4]">
                    <span className="text-xs font-semibold text-[#1A1A1A]" style={{fontFamily:"system-ui"}}>Total</span>
                    <span className="text-xs font-bold text-[#1A1A1A]" style={{fontFamily:"system-ui"}}>5 credits</span>
                  </div>
                </div>

                <ul className="space-y-2">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#444]" style={{fontFamily:"system-ui"}}>
                      <span className="text-emerald-500 flex-shrink-0 mt-0.5 font-bold">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 pt-0">
                <Link href="/auth/signup"
                  className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 ${
                    pkg.popular ? 'text-white' : 'text-[#1A1A1A] border border-[#E8E8E4] hover:border-[#1A1A1A] bg-white'
                  }`}
                  style={{...(pkg.popular ? {background:'#E8001D'} : {}), fontFamily:"system-ui"}}>
                  Get started →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* What's always free */}
        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-6 mb-10">
          <p className="text-sm font-bold text-[#1A1A1A] mb-4" style={{fontFamily:"system-ui"}}>Always free — no credits needed</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {icon:'📥', label:'Conveyancer Pack PDF', sub:'Download anytime after review'},
              {icon:'🔄', label:'Property dashboard', sub:'Track all your searches'},
              {icon:'💾', label:'Saved reports', sub:'Access previous analyses'},
              {icon:'📊', label:'Risk summaries', sub:'Overview of all findings'},
            ].map(({icon,label,sub}) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]" style={{fontFamily:"system-ui"}}>{label}</p>
                  <p className="text-xs text-[#999]" style={{fontFamily:"system-ui"}}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4 mb-14">
          <p className="text-sm font-bold text-[#1A1A1A] mb-4" style={{fontFamily:"system-ui"}}>Common questions</p>
          {[
            {q:'Do credits expire?', a:'No. Credits never expire — use them across as many properties as you like, at your own pace.'},
            {q:'Can I use credits across different properties?', a:'Yes. Your credit balance applies to all properties on your account. Add a property, run a scan or upload documents — credits deduct automatically.'},
            {q:'Is this a subscription?', a:'No subscription. You buy credits and use them when you need them. There are no recurring charges.'},
            {q:'Is the Conveyancer Pack PDF free?', a:'Yes, always. Downloading the PDF never costs credits — it\'s generated from analysis you\'ve already run.'},
            {q:'When will payments be available?', a:'We\'re integrating Stripe now. Sign up to reserve your account and we\'ll notify you the moment payments go live. Contact support@propertyowlai.com to purchase manually in the meantime.'},
          ].map(({q,a}) => (
            <div key={q} className="border-b border-[#E8E8E4] pb-4">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-1" style={{fontFamily:"system-ui"}}>{q}</p>
              <p className="text-sm text-[#666] leading-relaxed" style={{fontFamily:"system-ui"}}>{a}</p>
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-amber-900" style={{fontFamily:"system-ui"}}>💳 Payments launching soon</p>
            <p className="text-xs text-amber-700 mt-1" style={{fontFamily:"system-ui"}}>
              Sign up now to reserve your account. Contact <strong>support@propertyowlai.com</strong> to purchase credits manually today.
            </p>
          </div>
          <Link href="/auth/signup"
            className="flex-shrink-0 text-sm font-semibold text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-all"
            style={{background:'#E8001D', fontFamily:"system-ui"}}>
            Sign up free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E8E8E4] px-8 py-8 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🦉</span>
            <span className="text-sm text-[#999]" style={{fontFamily:"system-ui"}}>PropertyOwl AI · propertyowlai.com · Victoria, Australia</span>
          </div>
          <p className="text-xs text-[#BBB] max-w-xs text-right" style={{fontFamily:"system-ui"}}>
            AI-assisted review tool only. Not legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
