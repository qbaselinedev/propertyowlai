'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskItem {
  severity: 'high' | 'medium' | 'low'
  category: string
  issue: string
  context?: string
  recommendation?: string
  suggested_action?: string
}

interface ProReportProps {
  s32: any
  contract: any
  reportIds: { s32Id?: string; contractId?: string }
  propertyAddress: string
  userType: 'conveyancer' | 'lawyer'
  onDisclaimerNotAcknowledged: () => void
}

// ─── Colour maps ──────────────────────────────────────────────────────────────

const SEV = {
  high:   { bg: 'bg-red-50',   border: 'border-red-300',   badge: 'bg-red-100 text-red-700',   text: 'text-red-800',   strip: 'bg-red-500',   icon: '🔴', label: 'HIGH' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-800', strip: 'bg-amber-500', icon: '🟡', label: 'MEDIUM' },
  low:    { bg: 'bg-blue-50',  border: 'border-blue-300',  badge: 'bg-blue-100 text-blue-700',  text: 'text-blue-800',  strip: 'bg-blue-400',  icon: '🔵', label: 'LOW' },
} as const

// ─── Editable field ───────────────────────────────────────────────────────────

function EditableField({ value, onChange, multiline = false, placeholder = '' }: {
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    onChange(draft)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        onClick={() => { setDraft(value); setEditing(true) }}
        className="cursor-pointer hover:bg-yellow-50 hover:underline decoration-dashed decoration-yellow-400 underline-offset-2 rounded px-0.5 transition-colors group relative"
        title="Click to edit"
      >
        {value || <span className="text-gray-300 italic">{placeholder || 'Click to add...'}</span>}
        <span className="ml-1 opacity-0 group-hover:opacity-100 text-yellow-500 text-[10px]">✏️</span>
      </span>
    )
  }

  return multiline ? (
    <span className="block">
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        className="w-full border border-yellow-400 rounded-lg px-2 py-1 text-sm bg-yellow-50 focus:outline-none resize-y min-h-[60px]"
        rows={3}
      />
    </span>
  ) : (
    <input
      autoFocus
      type="text"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      className="border border-yellow-400 rounded-lg px-2 py-0.5 text-sm bg-yellow-50 focus:outline-none w-full"
    />
  )
}

// ─── Risk item card ───────────────────────────────────────────────────────────

function RiskCard({ item, index, onChange, isProfessional }: {
  item: RiskItem
  index: number
  onChange: (updated: RiskItem) => void
  isProfessional: boolean
}) {
  const c = SEV[item.severity] ?? SEV.low

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      {/* Severity strip */}
      <div className={`h-1 ${c.strip}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${c.badge}`}>
              {c.icon} {c.label}
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isProfessional
                ? <EditableField value={item.category} onChange={v => onChange({ ...item, category: v })} placeholder="Category" />
                : item.category}
            </span>
          </div>
        </div>

        {/* Issue */}
        <div className="mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Issue Identified</p>
          <p className={`text-sm font-bold ${c.text} leading-snug`}>
            {isProfessional
              ? <EditableField value={item.issue} onChange={v => onChange({ ...item, issue: v })} multiline placeholder="Describe the issue" />
              : item.issue}
          </p>
        </div>

        {/* Context */}
        {(item.context || isProfessional) && (
          <div className="mb-3 bg-white/60 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Context from Document</p>
            <p className="text-xs text-gray-700 leading-relaxed">
              {isProfessional
                ? <EditableField value={item.context ?? ''} onChange={v => onChange({ ...item, context: v })} multiline placeholder="Add context from document..." />
                : item.context}
            </p>
          </div>
        )}

        {/* Recommendation — professionals only */}
        {isProfessional && (
          <div className="mb-3 bg-white rounded-lg border border-dashed border-gray-300 px-3 py-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">💡 AI Recommendation</p>
            <p className="text-xs text-gray-800 leading-relaxed">
              <EditableField value={item.recommendation ?? ''} onChange={v => onChange({ ...item, recommendation: v })} multiline placeholder="AI recommendation will appear here..." />
            </p>
          </div>
        )}

        {/* Suggested action — professionals only */}
        {isProfessional && (
          <div className="bg-white rounded-lg border border-dashed border-indigo-200 px-3 py-2">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">⚡ Suggested Action</p>
            <p className="text-xs text-indigo-800 leading-relaxed">
              <EditableField value={item.suggested_action ?? ''} onChange={v => onChange({ ...item, suggested_action: v })} multiline placeholder="What action should be taken..." />
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Risk summary bar ─────────────────────────────────────────────────────────

function RiskSummaryBar({ items, riskScore, riskSummary, isProfessional, onSummaryChange }: {
  items: RiskItem[]
  riskScore?: number
  riskSummary?: string
  isProfessional: boolean
  onSummaryChange?: (v: string) => void
}) {
  const high   = items.filter(f => f.severity === 'high').length
  const medium = items.filter(f => f.severity === 'medium').length
  const low    = items.filter(f => f.severity === 'low').length

  const scoreColor = !riskScore ? 'text-gray-400'
    : riskScore >= 8 ? 'text-red-600'
    : riskScore >= 5 ? 'text-amber-600'
    : 'text-emerald-600'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex items-center gap-6 flex-wrap">
        {riskScore !== undefined && (
          <div className="text-center">
            <p className={`text-3xl font-black ${scoreColor}`}>{riskScore}<span className="text-sm text-gray-400">/10</span></p>
            <p className="text-xs text-gray-500 mt-0.5">Risk Score</p>
          </div>
        )}
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-red-600">{high}</p>
            <p className="text-xs text-gray-500">High</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-amber-600">{medium}</p>
            <p className="text-xs text-gray-500">Medium</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-blue-600">{low}</p>
            <p className="text-xs text-gray-500">Low</p>
          </div>
        </div>
        {riskSummary && (
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">Risk Summary</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {isProfessional && onSummaryChange
                ? <EditableField value={riskSummary} onChange={onSummaryChange} multiline />
                : riskSummary}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main professional view ───────────────────────────────────────────────────

export default function ProfessionalReportView({
  s32: initialS32,
  contract: initialContract,
  reportIds,
  propertyAddress,
  userType,
}: ProReportProps) {
  const supabase = createClient()

  // Local editable state — starts from LLM output, user can edit
  const [s32, setS32]           = useState<any>(initialS32)
  const [contract, setContract] = useState<any>(initialContract)
  const [activeTab, setActiveTab] = useState<'risk' | 'sections' | 'email'>('risk')
  const [filter, setFilter]     = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [genEmail, setGenEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState<string>(
    initialS32?.email_draft?.body ?? initialContract?.email_draft?.body ?? ''
  )
  const [emailSubject, setEmailSubject] = useState<string>(
    initialS32?.email_draft?.subject ?? `Property Review — ${propertyAddress}`
  )
  const [copied, setCopied] = useState(false)

  const typeLabel = userType === 'conveyancer' ? 'Conveyancer' : 'Lawyer'

  // Merge items from both reports
  const allItems: RiskItem[] = [
    ...(s32?.items_detected ?? []),
    ...(contract?.items_detected ?? []),
  ]

  const filtered = filter === 'all' ? allItems : allItems.filter(f => f.severity === filter)

  // Update an item in S32 or contract by index
  function updateItem(globalIdx: number, updated: RiskItem) {
    const s32Count = (s32?.items_detected ?? []).length
    if (globalIdx < s32Count) {
      const newItems = [...(s32.items_detected ?? [])]
      newItems[globalIdx] = updated
      setS32({ ...s32, items_detected: newItems })
    } else {
      const localIdx = globalIdx - s32Count
      const newItems = [...(contract.items_detected ?? [])]
      newItems[localIdx] = updated
      setContract({ ...contract, items_detected: newItems })
    }
  }

  // Save changes back to the reports table
  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const errors: string[] = []

    if (reportIds.s32Id && s32) {
      const { error } = await supabase
        .from('reports')
        .update({
          raw_analysis: { ...s32, _professional_edited: true, _edited_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportIds.s32Id)
      if (error) errors.push('S32: ' + error.message)
    }

    if (reportIds.contractId && contract) {
      const { error } = await supabase
        .from('reports')
        .update({
          raw_analysis: { ...contract, _professional_edited: true, _edited_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportIds.contractId)
      if (error) errors.push('Contract: ' + error.message)
    }

    setSaving(false)
    if (errors.length > 0) {
      setSaveError(errors.join('. '))
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  // Generate email from current state
  function buildEmail(): string {
    const high   = allItems.filter(f => f.severity === 'high')
    const medium = allItems.filter(f => f.severity === 'medium')
    const low    = allItems.filter(f => f.severity === 'low')

    let body = `Dear [Client Name],\n\nI have completed my preliminary review of the property at ${propertyAddress}.\n\n`

    if (high.length > 0) {
      body += `HIGH PRIORITY ITEMS (${high.length})\n${'─'.repeat(40)}\n`
      high.forEach((item, i) => {
        body += `${i + 1}. ${item.issue}\n`
        if (item.recommendation) body += `   → ${item.recommendation}\n`
        if (item.suggested_action) body += `   Action: ${item.suggested_action}\n`
        body += '\n'
      })
    }

    if (medium.length > 0) {
      body += `ITEMS TO REVIEW (${medium.length})\n${'─'.repeat(40)}\n`
      medium.forEach((item, i) => {
        body += `${i + 1}. ${item.issue}\n`
        if (item.recommendation) body += `   → ${item.recommendation}\n`
        body += '\n'
      })
    }

    if (low.length > 0) {
      body += `NOTED ITEMS (${low.length})\n${'─'.repeat(40)}\n`
      low.forEach((item, i) => {
        body += `${i + 1}. ${item.issue}\n`
      })
      body += '\n'
    }

    if (allItems.length === 0) {
      body += 'No significant issues were identified in my preliminary review.\n\n'
    }

    body += `Please note that this is a preliminary AI-assisted review. I will provide my full professional advice after completing my review of the original documents.\n\n`
    body += `Please do not hesitate to contact me if you have any questions.\n\nKind regards,\n[Your Name]\n${typeLabel}`
    body += `\n\n---\nThis summary has been prepared with the assistance of PropertyOwl AI and is for the recipient's information only. It does not constitute legal advice. All findings must be independently verified by a licensed ${typeLabel.toLowerCase()} before being acted upon.`

    return body
  }

  async function handleCopy() {
    const text = `Subject: ${emailSubject}\n\n${emailDraft}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const high   = allItems.filter(f => f.severity === 'high').length
  const medium = allItems.filter(f => f.severity === 'medium').length
  const low    = allItems.filter(f => f.severity === 'low').length

  return (
    <div className="space-y-4">

      {/* ── Professional authority banner ── */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">⚖️</span>
        <div>
          <p className="text-sm font-black text-amber-800">
            {typeLabel} Validation Required
          </p>
          <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
            This AI analysis is a starting point for your professional review. You are the authority on all findings.
            Edit any item by clicking on it — your changes are saved to this report.
            Do not present this output directly to clients as legal advice.
          </p>
        </div>
      </div>

      {/* ── Risk summary ── */}
      <RiskSummaryBar
        items={allItems}
        riskScore={s32?.risk_score ?? contract?.risk_score}
        riskSummary={s32?.risk_summary ?? contract?.risk_summary}
        isProfessional
        onSummaryChange={v => setS32((prev: any) => ({ ...prev, risk_summary: v }))}
      />

      {/* ── Tabs ── */}
      <div className="flex items-center border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
        {[
          { key: 'risk',     label: `Risk Analysis (${allItems.length})` },
          { key: 'sections', label: 'Document Sections' },
          { key: 'email',    label: '✉️ Client Email' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === tab.key
                ? 'border-[#E8001D] text-[#E8001D]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Save button in tab bar */}
        <div className="ml-auto px-4 flex items-center gap-2">
          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-[#E8001D] hover:bg-red-700 text-white disabled:opacity-50'
            }`}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Tab: Risk Analysis ── */}
      {activeTab === 'risk' && (
        <div className="space-y-4">
          {/* Filter buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { k: 'all',    label: `All (${allItems.length})`,       active: 'bg-gray-800 text-white' },
              { k: 'high',   label: `🔴 High (${high})`,              active: 'bg-red-600 text-white' },
              { k: 'medium', label: `🟡 Medium (${medium})`,          active: 'bg-amber-500 text-white' },
              { k: 'low',    label: `🔵 Low (${low})`,                active: 'bg-blue-500 text-white' },
            ].map(({ k, label, active }) => (
              <button
                key={k}
                onClick={() => setFilter(k as any)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  filter === k
                    ? active
                    : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <span className="text-3xl">🎉</span>
              <p className="text-sm font-bold text-gray-700 mt-2">No items in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item, localIdx) => {
                // Find global index
                const globalIdx = allItems.indexOf(item)
                return (
                  <RiskCard
                    key={globalIdx}
                    item={item}
                    index={globalIdx}
                    onChange={updated => updateItem(globalIdx, updated)}
                    isProfessional
                  />
                )
              })}
            </div>
          )}

          {/* Questions to explore */}
          {((s32?.questions_to_explore ?? []).length > 0 || (contract?.questions_to_explore ?? []).length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
              <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-3">❓ Questions to Explore</p>
              <div className="space-y-2">
                {[...(s32?.questions_to_explore ?? []), ...(contract?.questions_to_explore ?? [])].map((q: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 flex-shrink-0 mt-0.5">→</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Document Sections ── */}
      {activeTab === 'sections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* S32 sections */}
          {s32?.sections && Object.entries(s32.sections).map(([key, section]: [string, any]) => {
            if (!section) return null
            const statusColor = ({
              clear: 'border-l-emerald-500 bg-emerald-50',
              issues: 'border-l-red-500 bg-red-50',
              issues_found: 'border-l-red-500 bg-red-50',
              not_provided: 'border-l-gray-300 bg-gray-50',
              not_applicable: 'border-l-gray-300 bg-gray-50',
              incomplete: 'border-l-amber-400 bg-amber-50',
            } as Record<string, string>)[section.status]?? 'border-l-gray-300 bg-gray-50'

            const sectionLabel: Record<string, string> = {
              title_and_ownership: '📋 Title & Ownership',
              planning_and_zoning: '🗺️ Planning & Zoning',
              easements_and_covenants: '⛓️ Easements & Covenants',
              building_permits: '🏗️ Building Permits',
              owners_corporation: '🏢 Owners Corporation',
              outgoings: '💰 Outgoings',
              vendor_disclosure: '📄 Vendor Disclosure',
            }

            return (
              <div key={key} className={`rounded-xl border-l-4 ${statusColor} p-4`}>
                <p className="text-sm font-black text-gray-800 mb-2">{sectionLabel[key] ?? key}</p>
                {/* Key extracted fields */}
                {section.council_rates && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Council rates:</span> {section.council_rates}</p>}
                {section.council_name && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Council:</span> {section.council_name}</p>}
                {section.water_charges && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Water charges:</span> {section.water_charges}</p>}
                {section.zone && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Zone:</span> {section.zone}</p>}
                {section.overlays?.length > 0 && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Overlays:</span> {section.overlays.join(', ')}</p>}
                {section.annual_fee && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">OC annual fee:</span> {section.annual_fee}</p>}
                {section.lot_plan && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Lot/Plan:</span> {section.lot_plan}</p>}
                {section.volume_folio && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Volume/Folio:</span> {section.volume_folio}</p>}
                {/* Summary */}
                {section.summary && (
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed italic border-t border-gray-200 pt-2">
                    <EditableField value={section.summary} onChange={v => setS32((prev: any) => ({
                      ...prev,
                      sections: { ...prev.sections, [key]: { ...section, summary: v } }
                    }))} multiline />
                  </p>
                )}
                {/* Findings */}
                {section.findings?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {section.findings.map((f: string, i: number) => (
                      <p key={i} className="text-xs text-gray-700">• {f}</p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Contract sections */}
          {contract?.sections && Object.entries(contract.sections).map(([key, section]: [string, any]) => {
            if (!section) return null
            const statusColor = ({
              clear: 'border-l-emerald-500 bg-emerald-50',
              issues: 'border-l-red-500 bg-red-50',
              not_provided: 'border-l-gray-300 bg-gray-50',
              not_applicable: 'border-l-gray-300 bg-gray-50',
              incomplete: 'border-l-amber-400 bg-amber-50',
            } as Record<string, string>)[section.status] ?? 'border-l-gray-300 bg-gray-50'

            const sectionLabel: Record<string, string> = {
              price_and_deposit: '💵 Price & Deposit',
              settlement: '📅 Settlement',
              special_conditions: '📝 Special Conditions',
              goods_and_chattels: '🛋️ Goods & Chattels',
              cooling_off: '❄️ Cooling Off',
              gst_and_tax: '🧾 GST & Tax',
              penalty_and_risk: '⚠️ Penalty & Risk',
            }

            return (
              <div key={key} className={`rounded-xl border-l-4 ${statusColor} p-4`}>
                <p className="text-sm font-black text-gray-800 mb-2">{sectionLabel[key] ?? key}</p>
                {section.purchase_price && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Purchase price:</span> {section.purchase_price}</p>}
                {section.deposit_amount && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Deposit:</span> {section.deposit_amount}</p>}
                {section.settlement_date && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Settlement:</span> {section.settlement_date}</p>}
                {section.period && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Cooling off:</span> {section.period} {section.waived ? '(WAIVED)' : ''}</p>}
                {section.penalty_interest_rate && <p className="text-xs text-gray-600 mb-1"><span className="font-semibold">Penalty rate:</span> {section.penalty_interest_rate}</p>}
                {section.conditions?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Special conditions:</p>
                    {section.conditions.map((c: any, i: number) => (
                      <div key={i} className="text-xs text-gray-600 mb-1 pl-2 border-l-2 border-gray-300">
                        <span className={`font-bold ${c.complexity === 'requires_review' ? 'text-red-600' : c.complexity === 'non-standard' ? 'text-amber-600' : 'text-gray-600'}`}>
                          {c.number ? `SC${c.number}:` : ''} {c.complexity?.toUpperCase()}
                        </span>
                        {' '}{c.summary}
                      </div>
                    ))}
                  </div>
                )}
                {section.summary && (
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed italic border-t border-gray-200 pt-2">
                    <EditableField value={section.summary} onChange={v => setContract((prev: any) => ({
                      ...prev,
                      sections: { ...prev.sections, [key]: { ...section, summary: v } }
                    }))} multiline />
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tab: Client Email ── */}
      {activeTab === 'email' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-800 mb-1">Review before sending</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              This draft is based on the AI analysis. Edit it to reflect your professional judgement before sending to your client.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Subject Line</label>
            <input
              type="text"
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Email Body</label>
              <button
                onClick={() => {
                  setEmailDraft(buildEmail())
                  setGenEmail(true)
                }}
                className="text-xs text-[#E8001D] font-bold hover:underline"
              >
                ↺ Regenerate from current analysis
              </button>
            </div>
            <textarea
              value={emailDraft || buildEmail()}
              onChange={e => setEmailDraft(e.target.value)}
              rows={16}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono leading-relaxed focus:outline-none focus:border-[#E8001D] resize-y"
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Disclaimer (always appended)</p>
            <p className="text-xs text-gray-400 leading-relaxed font-mono">
              This summary has been prepared with the assistance of PropertyOwl AI and is for professional reference only.
              It does not constitute legal advice. All findings must be independently verified by a licensed {typeLabel.toLowerCase()} before being acted upon or communicated to clients.
            </p>
          </div>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              copied ? 'bg-emerald-500 text-white' : 'bg-[#E8001D] hover:bg-red-700 text-white'
            }`}
          >
            {copied ? '✓ Copied to clipboard' : '📋 Copy full email'}
          </button>
        </div>
      )}
    </div>
  )
}
