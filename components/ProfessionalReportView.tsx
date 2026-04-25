'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskItem {
  severity: 'high' | 'medium' | 'low'
  category: string
  issue: string
  context?: string
  source_page?: number
  recommendation?: string
  suggested_action?: string
  include_in_email?: boolean
}

interface Task {
  id?: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string
  linked_risk_index?: number
}

interface PageThumbnails { [page: number]: string }

interface ProReportProps {
  s32: any
  contract: any
  reportIds: { s32Id?: string; contractId?: string }
  propertyAddress: string
  propertyId?: string
  userType: 'conveyancer' | 'lawyer'
  onDisclaimerNotAcknowledged?: () => void
}

function getPageThumbnails(s32: any, contract: any): PageThumbnails {
  return { ...(s32?.page_thumbnails ?? {}), ...(contract?.page_thumbnails ?? {}) }
}

const SEV = {
  high:   { bg: 'bg-red-50/60',   border: 'border-red-100', dot: 'bg-red-500',   text: 'text-red-700',   label: 'HIGH',   badgeBg: 'bg-red-100' },
  medium: { bg: 'bg-amber-50/60', border: 'border-amber-100', dot: 'bg-amber-500', text: 'text-amber-700', label: 'MEDIUM', badgeBg: 'bg-amber-100' },
  low:    { bg: 'bg-sky-50/60',   border: 'border-sky-100',  dot: 'bg-sky-500',   text: 'text-sky-700',   label: 'LOW',    badgeBg: 'bg-sky-100' },
} as const

// ─── Thumbnail Lightbox ───────────────────────────────────────────────────────

function ThumbnailLightbox({ page, src, onClose }: { page: number; src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-bold text-gray-600">Page {page}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-lg">×</button>
        </div>
        <div className="overflow-auto max-h-[80vh] p-2">
          <img src={`data:image/jpeg;base64,${src}`} alt={`Page ${page}`} className="w-full rounded" />
        </div>
      </div>
    </div>
  )
}

// ─── Finalise Modal ───────────────────────────────────────────────────────────

function FinaliseModal({ userType, propertyAddress, onConfirm, onCancel }: { userType: string; propertyAddress: string; onConfirm: () => void; onCancel: () => void }) {
  const [accepted, setAccepted] = useState(false)
  const typeLabel = userType === 'lawyer' ? 'Lawyer' : 'Conveyancer'
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Finalise Review</h3>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">You are finalising the property review for <strong>{propertyAddress}</strong>. This marks the analysis as professionally reviewed by you as a {typeLabel}.</p>
        <label className="flex items-start gap-2.5 cursor-pointer mb-5">
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#E8001D] focus:ring-[#E8001D]" />
          <span className="text-xs text-gray-600 leading-relaxed">I confirm I have reviewed the AI-generated analysis, made any necessary corrections, and this report reflects my professional assessment.</span>
        </label>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={!accepted} className="flex-1 bg-[#E8001D] hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors">Confirm Finalise</button>
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Task Slide-in Panel ───────────────────────────────────────────────

function CreateTaskPanel({ item, itemIndex, propertyId, onClose, onCreated }: {
  item?: RiskItem; itemIndex?: number; propertyId?: string; onClose: () => void; onCreated: (task: Task) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState<Task>({
    title: item?.issue ?? '',
    description: item?.recommendation ?? '',
    priority: item?.severity ?? 'medium',
    status: 'pending',
    due_date: '',
    linked_risk_index: itemIndex,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('crm_tasks').insert({
      conveyancer_id: user.id,
      property_id: propertyId || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      linked_risk_item: item ? { index: itemIndex, severity: item.severity, category: item.category, issue: item.issue } : null,
    }).select().single()

    setSaving(false)
    if (!error && data) {
      onCreated(data)
      onClose()
    }
  }

  const priColors = { high: 'border-red-300 bg-red-50 text-red-700', medium: 'border-amber-300 bg-amber-50 text-amber-700', low: 'border-sky-300 bg-sky-50 text-sky-700' }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-bold text-gray-900">Create Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {item && (
            <div className={`rounded-lg border px-3 py-2.5 ${SEV[item.severity].bg} ${SEV[item.severity].border}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Linked Risk Item</p>
              <p className={`text-xs font-semibold ${SEV[item.severity].text}`}>{item.issue}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Task Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] focus:ring-2 focus:ring-[#E8001D]/10" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Priority</label>
              <div className="flex gap-1.5">
                {(['high', 'medium', 'low'] as const).map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                    className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${form.priority === p ? priColors[p] : 'border-gray-200 bg-white text-gray-400'}`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !form.title.trim()}
            className="w-full bg-[#E8001D] hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-40 mt-2">
            {saving ? 'Creating…' : '+ Create Task'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.25s ease-out; }
      `}</style>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfessionalReportView({
  s32: initialS32, contract: initialContract, reportIds, propertyAddress, propertyId, userType,
}: ProReportProps) {
  const supabase = createClient()

  const [s32, setS32] = useState<any>(initialS32)
  const [contract, setContract] = useState<any>(initialContract)
  const pageThumbnails = getPageThumbnails(initialS32, initialContract)
  const [lightboxPage, setLightboxPage] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'risk' | 'sections' | 'tasks' | 'email'>('risk')
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  // Per-item edit
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [hasPendingEdits, setHasPendingEdits] = useState(false)

  // Finalise
  const [finalised, setFinalised] = useState(false)
  const [showFinaliseModal, setShowFinaliseModal] = useState(false)

  // Save
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Email
  const [emailSubject, setEmailSubject] = useState(initialS32?.email_draft?.subject ?? `Property Review — ${propertyAddress}`)
  const [copied, setCopied] = useState(false)

  // Tasks
  const [showTaskPanel, setShowTaskPanel] = useState(false)
  const [taskPanelItem, setTaskPanelItem] = useState<{ item: RiskItem; index: number } | undefined>()
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'high'>('all')

  const typeLabel = userType === 'lawyer' ? 'Lawyer' : 'Conveyancer'

  // All risk items merged
  const allItems: RiskItem[] = [...(s32?.items_detected ?? []), ...(contract?.items_detected ?? [])]
  const high = allItems.filter(f => f.severity === 'high').length
  const medium = allItems.filter(f => f.severity === 'medium').length
  const low = allItems.filter(f => f.severity === 'low').length
  const filtered = filter === 'all' ? allItems : allItems.filter(f => f.severity === filter)

  // Items included in email (default: all high + medium)
  const emailItems = useMemo(() =>
    allItems.filter(item => item.include_in_email !== false && (item.severity === 'high' || item.severity === 'medium' || item.include_in_email === true))
  , [allItems])

  function updateItem(globalIdx: number, updated: RiskItem) {
    const s32Count = (s32?.items_detected ?? []).length
    if (globalIdx < s32Count) {
      const items = [...(s32.items_detected ?? [])]; items[globalIdx] = updated
      setS32({ ...s32, items_detected: items })
    } else {
      const items = [...(contract.items_detected ?? [])]; items[globalIdx - s32Count] = updated
      setContract({ ...contract, items_detected: items })
    }
    setHasPendingEdits(true)
  }

  function toggleEmailInclusion(globalIdx: number) {
    const item = allItems[globalIdx]
    const current = item.include_in_email ?? (item.severity === 'high' || item.severity === 'medium')
    updateItem(globalIdx, { ...item, include_in_email: !current })
  }

  async function handleSave() {
    setSaving(true); setSaveError(null)
    const errors: string[] = []
    if (reportIds.s32Id && s32) {
      const { error } = await supabase.from('reports').update({
        raw_analysis: { ...s32, _professional_edited: true, _edited_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }).eq('id', reportIds.s32Id)
      if (error) errors.push('S32: ' + error.message)
    }
    if (reportIds.contractId && contract) {
      const { error } = await supabase.from('reports').update({
        raw_analysis: { ...contract, _professional_edited: true, _edited_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }).eq('id', reportIds.contractId)
      if (error) errors.push('Contract: ' + error.message)
    }
    setSaving(false)
    if (errors.length > 0) { setSaveError(errors.join('. ')) }
    else { setSaved(true); setHasPendingEdits(false); setTimeout(() => setSaved(false), 3000) }
  }

  async function handleFinaliseConfirmed() {
    setShowFinaliseModal(false); setEditingIdx(null); setFinalised(true)
    setSaving(true)
    if (reportIds.s32Id && s32) {
      await supabase.from('reports').update({ raw_analysis: { ...s32, _professional_finalised: true, _finalised_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.s32Id)
    }
    if (reportIds.contractId && contract) {
      await supabase.from('reports').update({ raw_analysis: { ...contract, _professional_finalised: true, _finalised_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.contractId)
    }
    setSaving(false)
  }

  // ─── Build professional email (live) ────────────────────────────────────────

  function buildEmailHTML() {
    const h = emailItems.filter(f => f.severity === 'high')
    const m = emailItems.filter(f => f.severity === 'medium')
    const l = emailItems.filter(f => f.severity === 'low')

    let sections = ''

    if (h.length > 0) {
      sections += `<tr><td style="padding:24px 0 8px"><p style="font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;letter-spacing:0.08em;margin:0">🔴 High Priority (${h.length})</p></td></tr>`
      h.forEach((item, i) => { sections += emailItemRow(item, i + 1, '#FEF2F2', '#DC2626') })
    }
    if (m.length > 0) {
      sections += `<tr><td style="padding:24px 0 8px"><p style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:0.08em;margin:0">🟡 Items to Review (${m.length})</p></td></tr>`
      m.forEach((item, i) => { sections += emailItemRow(item, i + 1, '#FFFBEB', '#D97706') })
    }
    if (l.length > 0) {
      sections += `<tr><td style="padding:24px 0 8px"><p style="font-size:11px;font-weight:700;color:#0284C7;text-transform:uppercase;letter-spacing:0.08em;margin:0">🔵 Noted (${l.length})</p></td></tr>`
      l.forEach((item, i) => { sections += emailItemRow(item, i + 1, '#F0F9FF', '#0284C7') })
    }

    return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
<tr><td style="background:#E8001D;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
  <p style="margin:0;color:white;font-size:20px;font-weight:800">🦉 PropertyOwl AI</p>
  <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:12px">Property Review Report</p>
</td></tr>
<tr><td style="padding:28px 32px;background:white;border:1px solid #eee;border-top:none">
  <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Property</p>
  <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#111">${propertyAddress}</p>
  <p style="margin:0;font-size:14px;color:#333;line-height:1.7">Dear Client,</p>
  <p style="margin:12px 0 0;font-size:14px;color:#333;line-height:1.7">I have completed my review of the documentation for the above property. Below is a summary of the key findings and recommended actions.</p>
  ${sections}
  <div style="margin:28px 0 0;padding:20px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB">
    <p style="margin:0;font-size:14px;color:#333;line-height:1.7">Please don't hesitate to contact me if you have any questions about the above items or would like to discuss further.</p>
    <p style="margin:16px 0 0;font-size:14px;color:#333">Kind regards,<br/><strong>[Your Name]</strong><br/>${typeLabel}</p>
  </div>
</td></tr>
<tr><td style="padding:16px 32px;background:#F9FAFB;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;text-align:center">
  <p style="margin:0;font-size:10px;color:#999;line-height:1.6">This email was prepared using PropertyOwl AI. The analysis is AI-assisted and should be validated against source documents. This is not legal advice.</p>
</td></tr>
</table></div>`
  }

  function emailItemRow(item: RiskItem, num: number, bg: string, color: string) {
    return `<tr><td style="padding:6px 0"><div style="background:${bg};border-radius:8px;padding:14px 16px;border-left:3px solid ${color}">
  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111">${num}. ${item.issue}</p>
  ${item.context ? `<p style="margin:4px 0;font-size:12px;color:#666;line-height:1.6">${item.context}</p>` : ''}
  ${item.recommendation ? `<p style="margin:6px 0 0;font-size:12px;color:${color};font-weight:600">→ ${item.recommendation}</p>` : ''}
</div></td></tr>`
  }

  function buildPlainText() {
    const items = emailItems
    let body = `Dear Client,\n\nI have completed my review of the property at ${propertyAddress}.\n\n`
    const h = items.filter(f => f.severity === 'high')
    const m = items.filter(f => f.severity === 'medium')
    const l = items.filter(f => f.severity === 'low')
    if (h.length > 0) { body += `HIGH PRIORITY (${h.length})\n${'─'.repeat(40)}\n`; h.forEach((item, i) => { body += `${i + 1}. ${item.issue}\n`; if (item.recommendation) body += `   → ${item.recommendation}\n`; body += '\n' }) }
    if (m.length > 0) { body += `ITEMS TO REVIEW (${m.length})\n${'─'.repeat(40)}\n`; m.forEach((item, i) => { body += `${i + 1}. ${item.issue}\n`; if (item.recommendation) body += `   → ${item.recommendation}\n`; body += '\n' }) }
    if (l.length > 0) { body += `NOTED (${l.length})\n${'─'.repeat(40)}\n`; l.forEach((item, i) => { body += `${i + 1}. ${item.issue}\n` }); body += '\n' }
    body += `Please contact me if you have any questions.\n\nKind regards,\n[Your Name]\n${typeLabel}`
    return body
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${buildPlainText()}`)
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  // ─── Document Sections helper ───────────────────────────────────────────────

  const allSections: { key: string; section: any; source: string }[] = [
    ...Object.entries(s32?.sections ?? {}).map(([k, v]) => ({ key: k, section: v, source: 's32' })),
    ...Object.entries(contract?.sections ?? {}).map(([k, v]) => ({ key: k, section: v, source: 'contract' })),
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {lightboxPage !== null && pageThumbnails[lightboxPage] && (
        <ThumbnailLightbox page={lightboxPage} src={pageThumbnails[lightboxPage]} onClose={() => setLightboxPage(null)} />
      )}
      {showFinaliseModal && (
        <FinaliseModal userType={userType} propertyAddress={propertyAddress} onConfirm={handleFinaliseConfirmed} onCancel={() => setShowFinaliseModal(false)} />
      )}
      {showTaskPanel && (
        <CreateTaskPanel item={taskPanelItem?.item} itemIndex={taskPanelItem?.index} propertyId={propertyId}
          onClose={() => { setShowTaskPanel(false); setTaskPanelItem(undefined) }}
          onCreated={(task) => setTasks(prev => [...prev, task])} />
      )}

      <div className="space-y-4">

        {/* AI disclaimer */}
        <div className="flex items-center gap-3 bg-amber-50/70 border border-amber-200/80 rounded-lg px-4 py-2.5">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>AI-Generated Analysis</strong> — Validate against source documents before acting or advising clients.
          </p>
          {finalised && <span className="ml-auto flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Finalised</span>}
        </div>

        {/* Tab bar + actions */}
        <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex flex-1 border-r border-gray-100">
            {[
              { key: 'risk', label: `Risk Analysis (${allItems.length})` },
              { key: 'sections', label: 'Document Sections' },
              { key: 'tasks', label: `Tasks (${tasks.length})` },
              { key: 'email', label: `✉️ Client Email (${emailItems.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-[#E8001D] text-[#E8001D]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
            {saveError && <span className="text-xs text-red-500 max-w-[140px] truncate">{saveError}</span>}
            {/* Fallback Save — always visible when pending edits */}
            {hasPendingEdits && (
              <button onClick={handleSave} disabled={saving}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${saved ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                {saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save'}
              </button>
            )}
            {!finalised ? (
              <button onClick={() => setShowFinaliseModal(true)} className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#E8001D] hover:bg-red-700 text-white transition-colors">Finalise</button>
            ) : (
              <button onClick={() => { setFinalised(false) }} className="text-xs font-bold px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white transition-colors">Revise</button>
            )}
          </div>
        </div>

        {/* ── Risk Analysis ── */}
        {activeTab === 'risk' && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {[
                { k: 'all', label: `All (${allItems.length})`, cls: 'bg-gray-800 text-white' },
                { k: 'high', label: `High (${high})`, cls: 'bg-red-500 text-white' },
                { k: 'medium', label: `Medium (${medium})`, cls: 'bg-amber-500 text-white' },
                { k: 'low', label: `Low (${low})`, cls: 'bg-sky-500 text-white' },
              ].map(({ k, label, cls }) => (
                <button key={k} onClick={() => setFilter(k as any)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${filter === k ? cls : 'bg-white border border-gray-200 text-gray-400 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            {filtered.map((item, i) => {
              const globalIdx = allItems.indexOf(item)
              const s = SEV[item.severity]
              const isEditing = editingIdx === globalIdx
              const isIncluded = item.include_in_email !== false && (item.severity === 'high' || item.severity === 'medium' || item.include_in_email === true)

              return (
                <div key={globalIdx} className={`rounded-xl border ${s.border} overflow-hidden transition-all ${isEditing ? 'ring-2 ring-amber-300 shadow-md' : 'hover:shadow-sm'}`}>
                  {/* Header */}
                  <div className={`flex items-center justify-between px-4 py-2.5 ${s.bg}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <span className={`text-[10px] font-bold ${s.text}`}>{s.label}</span>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Include in email toggle */}
                      <button onClick={() => toggleEmailInclusion(globalIdx)} title={isIncluded ? 'Included in client email' : 'Click to include in client email'}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${isIncluded ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200 hover:text-gray-600'}`}>
                        {isIncluded ? '✉️ In email' : '✉️ Add'}
                      </button>
                      {/* Page ref */}
                      {item.source_page && pageThumbnails[item.source_page] && (
                        <button onClick={() => setLightboxPage(item.source_page!)} className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-2 py-1 rounded hover:bg-sky-100 transition-all">
                          📄 Page {item.source_page}
                        </button>
                      )}
                      {/* Edit button */}
                      {!finalised && (
                        <button onClick={() => setEditingIdx(isEditing ? null : globalIdx)}
                          className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${isEditing ? 'bg-amber-200 text-amber-800 border border-amber-300' : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-700'}`}>
                          {isEditing ? '✓ Done' : '✏️ Edit'}
                        </button>
                      )}
                      {/* Create task */}
                      <button onClick={() => { setTaskPanelItem({ item, index: globalIdx }); setShowTaskPanel(true) }}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-white text-gray-500 border border-gray-200 hover:text-[#E8001D] hover:border-red-200 transition-all">
                        📌 Task
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="bg-white px-4 py-3 space-y-2.5">
                    {/* Issue */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Issue</p>
                      {isEditing ? (
                        <input type="text" value={item.issue} onChange={e => updateItem(globalIdx, { ...item, issue: e.target.value })}
                          className="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-sm bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      ) : (
                        <p className={`text-sm font-semibold ${s.text}`}>{item.issue}</p>
                      )}
                    </div>

                    {/* Context */}
                    {(item.context || isEditing) && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Context</p>
                        {isEditing ? (
                          <textarea value={item.context ?? ''} onChange={e => updateItem(globalIdx, { ...item, context: e.target.value })}
                            rows={2} className="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs bg-amber-50/50 focus:outline-none resize-none" />
                        ) : (
                          <p className="text-xs text-gray-600 leading-relaxed">{item.context}</p>
                        )}
                      </div>
                    )}

                    {/* Recommendation */}
                    {(item.recommendation || isEditing) && (
                      <div className="bg-white rounded-lg border border-dashed border-gray-200 px-3 py-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">💡 Recommendation</p>
                        {isEditing ? (
                          <textarea value={item.recommendation ?? ''} onChange={e => updateItem(globalIdx, { ...item, recommendation: e.target.value })}
                            rows={2} className="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs bg-amber-50/50 focus:outline-none resize-none" />
                        ) : (
                          <p className="text-xs text-gray-700 leading-relaxed">{item.recommendation}</p>
                        )}
                      </div>
                    )}

                    {/* Suggested action */}
                    {(item.suggested_action || isEditing) && (
                      <div className="bg-indigo-50/50 rounded-lg border border-indigo-100 px-3 py-2">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">⚡ Suggested Action</p>
                        {isEditing ? (
                          <textarea value={item.suggested_action ?? ''} onChange={e => updateItem(globalIdx, { ...item, suggested_action: e.target.value })}
                            rows={2} className="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs bg-amber-50/50 focus:outline-none resize-none" />
                        ) : (
                          <p className="text-xs text-indigo-700 leading-relaxed">{item.suggested_action}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Document Sections ── */}
        {activeTab === 'sections' && (
          <div className="space-y-3">
            {allSections.map(({ key, section, source }) => {
              if (!section || typeof section !== 'object') return null
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              const stat = section.status
              const statusColor = stat === 'clear' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : stat === 'issues' ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-500 bg-gray-50 border-gray-200'
              return (
                <div key={`${source}-${key}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800">{label}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{stat?.toUpperCase()}</span>
                      <span className="text-[10px] text-gray-400">{source.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    {section.summary && <p className="text-xs text-gray-600 leading-relaxed">{section.summary}</p>}
                    {section.findings && section.findings.length > 0 && (
                      <div className="mt-2 space-y-1">{section.findings.map((f: string, i: number) => <p key={i} className="text-xs text-gray-500">• {f}</p>)}</div>
                    )}
                    {section.conditions && section.conditions.length > 0 && (
                      <div className="mt-2 space-y-1.5">{section.conditions.map((c: any, i: number) => (
                        <div key={i} className="text-xs text-gray-600">{c.number ? `SC${c.number}: ` : ''}<span className={`font-bold ${c.complexity === 'unusual' ? 'text-red-600' : c.complexity === 'non-standard' ? 'text-amber-600' : 'text-gray-500'}`}>{c.complexity?.toUpperCase()}</span> {c.summary}</div>
                      ))}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Tasks Tab ── */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {[
                  { k: 'all', label: `All (${tasks.length})` },
                  { k: 'pending', label: `Pending` },
                  { k: 'completed', label: `Completed` },
                  { k: 'high', label: `High Priority` },
                ].map(f => (
                  <button key={f.k} onClick={() => setTaskFilter(f.k as any)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${taskFilter === f.k ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-400 hover:text-gray-700'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={() => { setTaskPanelItem(undefined); setShowTaskPanel(true) }}
                className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#E8001D] hover:bg-red-700 text-white transition-colors">
                + New Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                <p className="text-3xl mb-2">📌</p>
                <p className="text-sm font-bold text-gray-700 mb-1">No tasks yet</p>
                <p className="text-xs text-gray-400 mb-4">Create tasks from risk items or add them manually</p>
                <button onClick={() => { setTaskPanelItem(undefined); setShowTaskPanel(true) }}
                  className="inline-flex items-center gap-2 bg-[#E8001D] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors">
                  + Create Task
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.filter(t => {
                  if (taskFilter === 'pending') return t.status !== 'completed'
                  if (taskFilter === 'completed') return t.status === 'completed'
                  if (taskFilter === 'high') return t.priority === 'high'
                  return true
                }).map((task, i) => {
                  const pCol = task.priority === 'high' ? 'border-l-red-500 bg-red-50/30' : task.priority === 'medium' ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-sky-500 bg-sky-50/30'
                  return (
                    <div key={task.id ?? i} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${pCol} px-4 py-3 flex items-center justify-between`}>
                      <div>
                        <p className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                            {task.priority.toUpperCase()}
                          </span>
                          {task.due_date && <span className="text-[10px] text-gray-400">Due: {task.due_date}</span>}
                        </div>
                      </div>
                      <button onClick={async () => {
                        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
                        setTasks(prev => prev.map((t, ti) => ti === i ? { ...t, status: newStatus } : t))
                        if (task.id) await supabase.from('crm_tasks').update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }).eq('id', task.id)
                      }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:text-emerald-600 hover:border-emerald-300'}`}>
                        {task.status === 'completed' ? '✓ Done' : 'Complete'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Client Email (live-updating) ── */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-2.5">
              <p className="text-xs text-sky-700 leading-relaxed">
                <strong>Live preview</strong> — This email updates automatically when you edit risk items or toggle "Include in email". {emailItems.length} item{emailItems.length !== 1 ? 's' : ''} currently included.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Subject Line</label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>

            {/* Email preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Email Preview</span>
                <span className="text-[10px] text-gray-400">Updates live from your edits</span>
              </div>
              <div className="p-4 bg-gray-100/50">
                <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: buildEmailHTML() }} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleCopy}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-[#E8001D] hover:bg-red-700 text-white'}`}>
                {copied ? '✓ Copied' : '📋 Copy plain text'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
