'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface RiskItem {
  severity: 'high' | 'medium' | 'low'; category: string; issue: string
  context?: string; recommendation?: string; suggested_action?: string
}

interface Props {
  s32: any; contract: any; propertyAddress: string; conveyancerName: string
  isFinalised: boolean
}

const SEV = {
  high:   { dot: '#EF4444', label: 'HIGH',   lBg: '#FEE2E2', lText: '#991B1B' },
  medium: { dot: '#F59E0B', label: 'MEDIUM', lBg: '#FEF3C7', lText: '#92400E' },
  low:    { dot: '#3B82F6', label: 'LOW',    lBg: '#DBEAFE', lText: '#1E40AF' },
} as const

export default function BuyerPropertyView({ s32, contract, propertyAddress, conveyancerName, isFinalised }: Props) {
  const [activeTab, setActiveTab] = useState<'risk' | 'sections'>(isFinalised ? 'risk' : 'risk')
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const allItems: RiskItem[] = [...(s32?.items_detected ?? []), ...(contract?.items_detected ?? [])]
  const high = allItems.filter(f => f.severity === 'high').length
  const med = allItems.filter(f => f.severity === 'medium').length
  const low = allItems.filter(f => f.severity === 'low').length
  const vis = filter === 'all' ? allItems : allItems.filter(f => f.severity === filter)

  const allSections = [
    ...Object.entries(s32?.sections ?? {}).map(([k, v]) => ({ key: k, sec: v, src: 's32' })),
    ...Object.entries(contract?.sections ?? {}).map(([k, v]) => ({ key: k, sec: v, src: 'contract' })),
  ]

  if (!isFinalised) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-2xl mb-2">⏳</p>
          <p className="text-base font-bold text-gray-800 mb-1">Review In Progress</p>
          <p className="text-sm text-gray-600">Your {conveyancerName ? conveyancerName : 'conveyancer'} is still reviewing the documents for this property. The detailed analysis will be available here once the review is complete.</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">The Online Scan data is available above. Document analysis will appear here after your conveyancer finalises the review.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
        <span className="text-sm">✅</span>
        <p className="text-xs text-emerald-800">
          <strong>Review Complete</strong> — This analysis has been professionally reviewed by {conveyancerName || 'your conveyancer'}. Contact them with any questions.
        </p>
      </div>

      {/* Tabs — read only, no Activity, no Email */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { k: 'risk', l: `Risk Analysis (${allItems.length})` },
          { k: 'sections', l: 'Document Sections' },
        ].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k as any)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === t.k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Risk Analysis — read only */}
      {activeTab === 'risk' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[
              { k: 'all', l: `All (${allItems.length})`, c: 'bg-gray-900 text-white' },
              { k: 'high', l: `High (${high})`, c: 'bg-red-600 text-white' },
              { k: 'medium', l: `Medium (${med})`, c: 'bg-amber-500 text-white' },
              { k: 'low', l: `Low (${low})`, c: 'bg-blue-500 text-white' },
            ].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${filter === f.k ? f.c : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'}`}>
                {f.l}
              </button>
            ))}
          </div>

          {vis.map((item, i) => {
            const sv = SEV[item.severity]
            return (
              <div key={i} className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sv.dot }} />
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: sv.lBg, color: sv.lText }}>{sv.label}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.category}</span>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Issue Identified</p>
                    <p className="text-sm font-semibold text-gray-900 leading-relaxed">{item.issue}</p>
                  </div>
                  {item.context && (
                    <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Context</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.context}</p>
                    </div>
                  )}
                  {item.recommendation && (
                    <div className="rounded-lg border border-gray-200 px-4 py-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">💡 Recommendation</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.recommendation}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Document Sections — read only */}
      {activeTab === 'sections' && (
        <div className="space-y-3">
          {allSections.map(({ key, sec, src }) => {
            if (!sec || typeof sec !== 'object') return null
            const lbl = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            const st = sec.status
            const sc = st === 'clear' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : st === 'issues' ? 'text-red-700 bg-red-50 border-red-200' : 'text-gray-500 bg-gray-50 border-gray-200'
            return (
              <div key={`${src}-${key}`} className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-800">{lbl}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc}`}>{st?.toUpperCase()}</span>
                </div>
                <div className="px-5 py-4">
                  {sec.summary && <p className="text-sm text-gray-700 leading-relaxed">{sec.summary}</p>}
                  {sec.findings?.length > 0 && <div className="mt-2 space-y-1">{sec.findings.map((f: string, i: number) => <p key={i} className="text-sm text-gray-600">• {f}</p>)}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
