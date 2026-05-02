'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
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
  id?: string; title: string; description: string; priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed'; due_date: string; linked_risk_index?: number
}

interface PageThumbnails { [page: number]: string }

interface ProReportProps {
  s32: any; contract: any; reportIds: { s32Id?: string; contractId?: string }
  propertyAddress: string; propertyId?: string; userType: 'conveyancer' | 'lawyer'
  onDisclaimerNotAcknowledged?: () => void
}

function getPageThumbnails(s32: any, contract: any): PageThumbnails {
  return { ...(s32?.page_thumbnails ?? {}), ...(contract?.page_thumbnails ?? {}) }
}

const SEV = {
  high:   { dot: '#EF4444', label: 'HIGH',   lBg: '#FEE2E2', lText: '#991B1B' },
  medium: { dot: '#F59E0B', label: 'MEDIUM', lBg: '#FEF3C7', lText: '#92400E' },
  low:    { dot: '#3B82F6', label: 'LOW',    lBg: '#DBEAFE', lText: '#1E40AF' },
} as const

// ─── Actions Dropdown ─────────────────────────────────────────────────────────

function ActionsMenu({ isIncluded, isEditing, onToggleEmail, onEdit, onCreateTask, onRestore }: {
  isIncluded: boolean; isEditing: boolean
  onToggleEmail: () => void; onEdit: () => void; onCreateTask: () => void; onRestore: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-1.5">
        Actions <span className="text-[9px] leading-none">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-30 py-1" style={{ animation: 'ddFade .12s ease-out' }}>
          <button onClick={() => { onToggleEmail(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
            <span>{isIncluded ? '✅' : '✉️'}</span>{isIncluded ? 'Remove from Client Email' : 'Add to Client Email'}
          </button>
          <button onClick={() => { onCreateTask(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
            <span>📌</span>Create Task
          </button>
          <button onClick={() => { onEdit(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
            <span>{isEditing ? '✓' : '✏️'}</span>{isEditing ? 'Done Editing' : 'Edit Item'}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => { onRestore(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-400 hover:bg-gray-50 hover:text-gray-600 flex items-center gap-3 transition-colors">
            <span>↺</span>Restore AI Default
          </button>
        </div>
      )}
      <style jsx>{`@keyframes ddFade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function ThumbnailLightbox({ page, src, onClose }: { page: number; src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800">
          <span className="text-sm font-semibold text-white">📄 Document — Page {page}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="overflow-auto max-h-[80vh] p-2"><img src={`data:image/jpeg;base64,${src}`} alt={`Page ${page}`} className="w-full rounded" /></div>
      </div>
    </div>
  )
}

// ─── Finalise Modal ───────────────────────────────────────────────────────────

function FinaliseModal({ userType, propertyAddress, onConfirm, onCancel }: { userType: string; propertyAddress: string; onConfirm: () => void; onCancel: () => void }) {
  const [accepted, setAccepted] = useState(false)
  const tl = userType === 'lawyer' ? 'Lawyer' : 'Conveyancer'
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Finalise Review</h3>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">Finalising the review for <strong>{propertyAddress}</strong> as a {tl}.</p>
        <label className="flex items-start gap-2.5 cursor-pointer mb-5">
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#E8001D] focus:ring-[#E8001D]" />
          <span className="text-xs text-gray-600 leading-relaxed">I confirm I have reviewed the AI analysis and this report reflects my professional assessment.</span>
        </label>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={!accepted} className="flex-1 bg-[#E8001D] hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors">Confirm</button>
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Task Panel ────────────────────────────────────────────────────────

function CreateTaskPanel({ item, itemIndex, propertyId, onClose, onCreated }: {
  item?: RiskItem; itemIndex?: number; propertyId?: string; onClose: () => void; onCreated: (t: Task) => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState<Task>({ title: item?.issue ?? '', description: item?.recommendation ?? '', priority: item?.severity ?? 'medium', status: 'pending', due_date: '', linked_risk_index: itemIndex })
  const [saving, setSaving] = useState(false)
  const pc: Record<string, string> = { high: 'border-red-300 bg-red-50 text-red-700', medium: 'border-amber-300 bg-amber-50 text-amber-700', low: 'border-blue-300 bg-blue-50 text-blue-700' }

  async function save() {
    if (!form.title.trim()) return; setSaving(true)
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data, error } = await supabase.from('crm_tasks').insert({
      conveyancer_id: user.id, property_id: propertyId || null, title: form.title.trim(),
      description: form.description.trim() || null, priority: form.priority, status: form.status,
      due_date: form.due_date || null,
      linked_risk_item: item ? { index: itemIndex, severity: item.severity, category: item.category, issue: item.issue } : null,
    }).select().single()
    setSaving(false); if (!error && data) { onCreated(data); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto" style={{ animation: 'slideR .25s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-bold text-gray-900">Create Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {item && <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Linked Risk Item</p><p className="text-xs font-semibold text-gray-700">{item.issue}</p></div>}
          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Title *</label><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] focus:ring-2 focus:ring-red-100" /></div>
          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Priority</label><div className="flex gap-1.5">{(['high','medium','low'] as const).map(p=>(<button key={p} onClick={()=>setForm(f=>({...f,priority:p}))} className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${form.priority===p?pc[p]:'border-gray-200 bg-white text-gray-400'}`}>{p[0].toUpperCase()+p.slice(1)}</button>))}</div></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label><input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
          </div>
          <button onClick={save} disabled={saving||!form.title.trim()} className="w-full bg-[#E8001D] hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-40 mt-2">{saving?'Creating…':'+ Create Task'}</button>
        </div>
      </div>
      <style jsx>{`@keyframes slideR{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProfessionalReportView({
  s32: initialS32, contract: initialContract, reportIds, propertyAddress, propertyId, userType,
}: ProReportProps) {
  const supabase = createClient()

  // Store originals for restore
  const [origS32] = useState<any>(JSON.parse(JSON.stringify(initialS32 ?? {})))
  const [origContract] = useState<any>(JSON.parse(JSON.stringify(initialContract ?? {})))

  const [s32, setS32] = useState<any>(initialS32)
  const [contract, setContract] = useState<any>(initialContract)
  const pageThumbs = getPageThumbnails(initialS32, initialContract)
  const [lightboxPage, setLightboxPage] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'risk' | 'sections' | 'tasks' | 'email'>('risk')
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [pendingEdits, setPendingEdits] = useState(false)
  const [finalised, setFinalised] = useState(false)
  const [showFinalise, setShowFinalise] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState(initialS32?.email_draft?.subject ?? `Property Review — ${propertyAddress}`)
  const [copied, setCopied] = useState(false)
  const [showTaskPanel, setShowTaskPanel] = useState(false)
  const [taskItem, setTaskItem] = useState<{ item: RiskItem; idx: number } | undefined>()
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'high'>('all')

  const typeLabel = userType === 'lawyer' ? 'Lawyer' : 'Conveyancer'
  const allItems: RiskItem[] = [...(s32?.items_detected ?? []), ...(contract?.items_detected ?? [])]
  const high = allItems.filter(f => f.severity === 'high').length
  const med = allItems.filter(f => f.severity === 'medium').length
  const low = allItems.filter(f => f.severity === 'low').length
  const vis = filter === 'all' ? allItems : allItems.filter(f => f.severity === filter)

  const emailItems = useMemo(() =>
    allItems.filter(it => it.include_in_email !== false && (it.severity === 'high' || it.severity === 'medium' || it.include_in_email === true))
  , [allItems])

  // ─── State mutators ──────────────────────────────────────────────────────────

  function updateItem(gIdx: number, updated: RiskItem) {
    const s32c = (s32?.items_detected ?? []).length
    if (gIdx < s32c) { const a = [...(s32.items_detected ?? [])]; a[gIdx] = updated; setS32({ ...s32, items_detected: a }) }
    else { const a = [...(contract.items_detected ?? [])]; a[gIdx - s32c] = updated; setContract({ ...contract, items_detected: a }) }
    setPendingEdits(true)
  }

  function toggleEmail(gIdx: number) {
    const it = allItems[gIdx]; const cur = it.include_in_email ?? (it.severity === 'high' || it.severity === 'medium')
    updateItem(gIdx, { ...it, include_in_email: !cur })
  }

  function restoreItem(gIdx: number) {
    const s32c = (s32?.items_detected ?? []).length
    const orig = gIdx < s32c ? origS32?.items_detected?.[gIdx] : origContract?.items_detected?.[gIdx - s32c]
    if (orig) updateItem(gIdx, { ...orig })
  }

  // ─── Save / Finalise ─────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true); setSaveErr(null); const errs: string[] = []
    if (reportIds.s32Id && s32) {
      const { error } = await supabase.from('reports').update({ raw_analysis: { ...s32, _professional_edited: true, _edited_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.s32Id)
      if (error) errs.push('S32: ' + error.message)
    }
    if (reportIds.contractId && contract) {
      const { error } = await supabase.from('reports').update({ raw_analysis: { ...contract, _professional_edited: true, _edited_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.contractId)
      if (error) errs.push('Contract: ' + error.message)
    }
    setSaving(false)
    if (errs.length) setSaveErr(errs.join('. '))
    else { setSaved(true); setPendingEdits(false); setTimeout(() => setSaved(false), 3000) }
  }

  async function confirmFinalise() {
    setShowFinalise(false); setEditingIdx(null); setFinalised(true); setSaving(true)
    if (reportIds.s32Id && s32) await supabase.from('reports').update({ raw_analysis: { ...s32, _professional_finalised: true, _finalised_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.s32Id)
    if (reportIds.contractId && contract) await supabase.from('reports').update({ raw_analysis: { ...contract, _professional_finalised: true, _finalised_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.contractId)
    setSaving(false)
  }

  // ─── Email builders ───────────────────────────────────────────────────────────

  function eRow(it: RiskItem, n: number, bg: string, col: string) {
    return `<tr><td style="padding:4px 0"><div style="background:${bg};border-radius:8px;padding:12px 14px;border-left:3px solid ${col}"><p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#111">${n}. ${it.issue}</p>${it.context ? `<p style="margin:3px 0;font-size:12px;color:#555;line-height:1.5">${it.context}</p>` : ''}${it.recommendation ? `<p style="margin:5px 0 0;font-size:12px;color:${col};font-weight:600">→ ${it.recommendation}</p>` : ''}</div></td></tr>`
  }

  function buildHTML() {
    const h = emailItems.filter(f => f.severity === 'high'), m = emailItems.filter(f => f.severity === 'medium'), l = emailItems.filter(f => f.severity === 'low')
    let s = ''
    if (h.length) { s += `<tr><td style="padding:20px 0 6px"><p style="font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;letter-spacing:.08em;margin:0">● HIGH PRIORITY (${h.length})</p></td></tr>`; h.forEach((it, i) => s += eRow(it, i + 1, '#FEF2F2', '#DC2626')) }
    if (m.length) { s += `<tr><td style="padding:20px 0 6px"><p style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:.08em;margin:0">● ITEMS TO REVIEW (${m.length})</p></td></tr>`; m.forEach((it, i) => s += eRow(it, i + 1, '#FFFBEB', '#D97706')) }
    if (l.length) { s += `<tr><td style="padding:20px 0 6px"><p style="font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:.08em;margin:0">● NOTED (${l.length})</p></td></tr>`; l.forEach((it, i) => s += eRow(it, i + 1, '#EFF6FF', '#2563EB')) }
    return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#1A1A1A;padding:20px 32px;border-radius:12px 12px 0 0"><table width="100%"><tr><td><span style="font-size:20px">🦉</span> <span style="color:white;font-size:16px;font-weight:800">PropertyOwl AI</span></td><td style="text-align:right"><span style="color:rgba(255,255,255,.5);font-size:11px">Property Review</span></td></tr></table></td></tr><tr><td style="padding:28px 32px;background:white;border:1px solid #eee;border-top:none"><p style="margin:0 0 2px;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.1em;font-weight:600">Property</p><p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#111">${propertyAddress}</p><p style="margin:0;font-size:14px;color:#333;line-height:1.7">Dear Client,</p><p style="margin:10px 0 0;font-size:14px;color:#333;line-height:1.7">I have completed my review of the documentation for the above property. Below is a summary of key findings and recommended actions.</p>${s}<div style="margin:24px 0 0;padding:16px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB"><p style="margin:0;font-size:14px;color:#333;line-height:1.7">Please contact me if you have any questions.</p><p style="margin:12px 0 0;font-size:14px;color:#333">Kind regards,<br/><strong>[Your Name]</strong><br/>${typeLabel}</p></div></td></tr><tr><td style="padding:14px 32px;background:#F9FAFB;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;text-align:center"><p style="margin:0;font-size:10px;color:#999;line-height:1.5">Prepared using PropertyOwl AI · AI-assisted · Not legal advice</p></td></tr></table></div>`
  }

  function buildPlain() {
    let b = `Dear Client,\n\nI have completed my review of the property at ${propertyAddress}.\n\n`
    const h = emailItems.filter(f => f.severity === 'high'), m = emailItems.filter(f => f.severity === 'medium'), l = emailItems.filter(f => f.severity === 'low')
    if (h.length) { b += `HIGH PRIORITY (${h.length})\n${'─'.repeat(40)}\n`; h.forEach((it, i) => { b += `${i+1}. ${it.issue}\n`; if (it.recommendation) b += `   → ${it.recommendation}\n`; b += '\n' }) }
    if (m.length) { b += `ITEMS TO REVIEW (${m.length})\n${'─'.repeat(40)}\n`; m.forEach((it, i) => { b += `${i+1}. ${it.issue}\n`; if (it.recommendation) b += `   → ${it.recommendation}\n`; b += '\n' }) }
    if (l.length) { b += `NOTED (${l.length})\n${'─'.repeat(40)}\n`; l.forEach((it, i) => { b += `${i+1}. ${it.issue}\n` }); b += '\n' }
    b += `Please contact me if you have any questions.\n\nKind regards,\n[Your Name]\n${typeLabel}`; return b
  }

  async function handleCopy() { await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${buildPlain()}`); setCopied(true); setTimeout(() => setCopied(false), 2500) }

  const allSections: { key: string; sec: any; src: string }[] = [
    ...Object.entries(s32?.sections ?? {}).map(([k, v]) => ({ key: k, sec: v, src: 's32' })),
    ...Object.entries(contract?.sections ?? {}).map(([k, v]) => ({ key: k, sec: v, src: 'contract' })),
  ]

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {lightboxPage !== null && pageThumbs[lightboxPage] && <ThumbnailLightbox page={lightboxPage} src={pageThumbs[lightboxPage]} onClose={() => setLightboxPage(null)} />}
      {showFinalise && <FinaliseModal userType={userType} propertyAddress={propertyAddress} onConfirm={confirmFinalise} onCancel={() => setShowFinalise(false)} />}
      {showTaskPanel && <CreateTaskPanel item={taskItem?.item} itemIndex={taskItem?.idx} propertyId={propertyId} onClose={() => { setShowTaskPanel(false); setTaskItem(undefined) }} onCreated={t => setTasks(p => [...p, t])} />}

      <div className="space-y-4">

        {/* Disclaimer */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <span className="text-sm">⚠️</span>
          <p className="text-xs text-amber-800"><strong>AI-Generated Analysis</strong> — Validate against source documents before acting or advising clients.</p>
          {finalised && <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Finalised</span>}
        </div>

        {/* ── Tab bar + global save + finalise ── */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-sm px-1">
          <div className="flex">
            {([
              { k: 'risk', l: `Risk Analysis (${allItems.length})` },
              { k: 'sections', l: 'Document Sections' },
              { k: 'tasks', l: `Tasks (${tasks.length})` },
              { k: 'email', l: `Client Email (${emailItems.length})` },
            ] as const).map(t => (
              <button key={t.k} onClick={() => setActiveTab(t.k as any)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === t.k ? 'border-[#E8001D] text-[#E8001D]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                {t.l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-2 py-2">
            {saveErr && <span className="text-xs text-red-500 max-w-[120px] truncate">{saveErr}</span>}
            {/* GLOBAL SAVE — always visible */}
            <button onClick={handleSave} disabled={saving || !pendingEdits}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                saved ? 'bg-emerald-500 text-white border-emerald-500'
                : pendingEdits ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 shadow-sm'
                : 'border-gray-200 text-gray-300 bg-gray-50 cursor-default'
              }`}>
              {pendingEdits && !saved && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              {saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save'}
            </button>
            {!finalised
              ? <button onClick={() => setShowFinalise(true)} className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#E8001D] hover:bg-red-700 text-white transition-colors">Finalise</button>
              : <button onClick={() => setFinalised(false)} className="text-xs font-bold px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-900 text-white transition-colors">Revise</button>
            }
          </div>
        </div>

        {/* ════════ RISK ANALYSIS ════════ */}
        {activeTab === 'risk' && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {([
                { k: 'all', l: `All (${allItems.length})`, c: 'bg-gray-900 text-white' },
                { k: 'high', l: `High (${high})`, c: 'bg-red-600 text-white' },
                { k: 'medium', l: `Medium (${med})`, c: 'bg-amber-500 text-white' },
                { k: 'low', l: `Low (${low})`, c: 'bg-blue-500 text-white' },
              ] as const).map(f => (
                <button key={f.k} onClick={() => setFilter(f.k as any)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${filter === f.k ? f.c : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'}`}>{f.l}</button>
              ))}
            </div>

            {vis.length === 0 && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><span className="text-3xl">🎉</span><p className="text-sm font-bold text-gray-700 mt-2">No items in this category</p></div>}

            {vis.map(item => {
              const gIdx = allItems.indexOf(item)
              const sv = SEV[item.severity]
              const editing = editingIdx === gIdx
              const inEmail = item.include_in_email !== false && (item.severity === 'high' || item.severity === 'medium' || item.include_in_email === true)

              return (
                <div key={gIdx} className={`bg-white rounded-xl border transition-all ${editing ? 'border-amber-300 shadow-lg ring-2 ring-amber-100' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>

                  {/* ── Header ── */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sv.dot }} />
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: sv.lBg, color: sv.lText }}>{sv.label}</span>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.category}</span>
                      {inEmail && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✉️ In Client Email</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.source_page && pageThumbs[item.source_page] && (
                        <button onClick={() => setLightboxPage(item.source_page!)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                          View Document Page ({item.source_page})
                        </button>
                      )}
                      <ActionsMenu isIncluded={inEmail} isEditing={editing}
                        onToggleEmail={() => toggleEmail(gIdx)}
                        onEdit={() => setEditingIdx(editing ? null : gIdx)}
                        onCreateTask={() => { setTaskItem({ item, idx: gIdx }); setShowTaskPanel(true) }}
                        onRestore={() => restoreItem(gIdx)} />
                    </div>
                  </div>

                  {/* ── Body ── */}
                  <div className="px-5 py-4 space-y-3">
                    {/* Issue */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Issue Identified</p>
                      {editing
                        ? <input type="text" value={item.issue} onChange={e => updateItem(gIdx, { ...item, issue: e.target.value })} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-semibold bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-200 text-gray-900" />
                        : <p className="text-sm font-semibold text-gray-900 leading-relaxed">{item.issue}</p>
                      }
                    </div>

                    {/* Context */}
                    {(item.context || editing) && (
                      <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Context from Document</p>
                        {editing
                          ? <textarea value={item.context ?? ''} onChange={e => updateItem(gIdx, { ...item, context: e.target.value })} rows={2} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50/40 focus:outline-none resize-none text-gray-800" />
                          : <p className="text-sm text-gray-700 leading-relaxed">{item.context}</p>
                        }
                      </div>
                    )}

                    {/* Recommendation */}
                    {(item.recommendation || editing) && (
                      <div className="rounded-lg border border-gray-200 px-4 py-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">💡 Recommendation</p>
                        {editing
                          ? <textarea value={item.recommendation ?? ''} onChange={e => updateItem(gIdx, { ...item, recommendation: e.target.value })} rows={2} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50/40 focus:outline-none resize-none text-gray-800" />
                          : <p className="text-sm text-gray-700 leading-relaxed">{item.recommendation}</p>
                        }
                      </div>
                    )}

                    {/* Suggested Action */}
                    {(item.suggested_action || editing) && (
                      <div className="bg-indigo-50/60 rounded-lg border border-indigo-100 px-4 py-3">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">⚡ Suggested Action</p>
                        {editing
                          ? <textarea value={item.suggested_action ?? ''} onChange={e => updateItem(gIdx, { ...item, suggested_action: e.target.value })} rows={2} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50/40 focus:outline-none resize-none text-indigo-900" />
                          : <p className="text-sm text-indigo-800 leading-relaxed">{item.suggested_action}</p>
                        }
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ════════ DOCUMENT SECTIONS ════════ */}
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
                    <span className="text-[10px] text-gray-400 font-medium">{src.toUpperCase()}</span>
                  </div>
                  <div className="px-5 py-4">
                    {sec.summary && <p className="text-sm text-gray-700 leading-relaxed">{sec.summary}</p>}
                    {sec.findings?.length > 0 && <div className="mt-2 space-y-1">{sec.findings.map((f: string, i: number) => <p key={i} className="text-sm text-gray-600">• {f}</p>)}</div>}
                    {sec.conditions?.length > 0 && <div className="mt-2 space-y-1.5">{sec.conditions.map((c: any, i: number) => <div key={i} className="text-sm text-gray-700"><span className={`font-bold ${c.complexity === 'unusual' ? 'text-red-600' : c.complexity === 'non-standard' ? 'text-amber-600' : 'text-gray-500'}`}>{c.number ? `SC${c.number}: ` : ''}{c.complexity?.toUpperCase()}</span> {c.summary}</div>)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ════════ TASKS ════════ */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">{[{k:'all',l:`All (${tasks.length})`},{k:'pending',l:'Pending'},{k:'completed',l:'Completed'},{k:'high',l:'High Priority'}].map(f=>(
                <button key={f.k} onClick={()=>setTaskFilter(f.k as any)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${taskFilter===f.k?'bg-gray-900 text-white':'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'}`}>{f.l}</button>
              ))}</div>
              <button onClick={()=>{setTaskItem(undefined);setShowTaskPanel(true)}} className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#E8001D] hover:bg-red-700 text-white">+ New Task</button>
            </div>
            {tasks.length===0?(
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                <p className="text-3xl mb-2">📌</p><p className="text-sm font-bold text-gray-700 mb-1">No tasks yet</p><p className="text-xs text-gray-400 mb-4">Create tasks from risk items or add manually</p>
                <button onClick={()=>{setTaskItem(undefined);setShowTaskPanel(true)}} className="bg-[#E8001D] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700">+ Create Task</button>
              </div>
            ):(
              <div className="space-y-2">{tasks.filter(t=>{if(taskFilter==='pending')return t.status!=='completed';if(taskFilter==='completed')return t.status==='completed';if(taskFilter==='high')return t.priority==='high';return true}).map((t,i)=>{
                const bl=t.priority==='high'?'border-l-red-500':t.priority==='medium'?'border-l-amber-500':'border-l-blue-500'
                return(
                  <div key={t.id??i} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${bl} px-4 py-3 flex items-center justify-between`}>
                    <div>
                      <p className={`text-sm font-semibold ${t.status==='completed'?'line-through text-gray-400':'text-gray-900'}`}>{t.title}</p>
                      {t.description&&<p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{t.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.priority==='high'?'bg-red-100 text-red-700':t.priority==='medium'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>{t.priority.toUpperCase()}</span>
                        {t.due_date&&<span className="text-[10px] text-gray-400">Due: {t.due_date}</span>}
                      </div>
                    </div>
                    <button onClick={async()=>{const ns=t.status==='completed'?'pending':'completed';setTasks(p=>p.map((x,xi)=>xi===i?{...x,status:ns as any}:x));if(t.id)await supabase.from('crm_tasks').update({status:ns,completed_at:ns==='completed'?new Date().toISOString():null}).eq('id',t.id)}}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${t.status==='completed'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-white text-gray-500 border-gray-200 hover:text-emerald-600 hover:border-emerald-300'} transition-all`}>
                      {t.status==='completed'?'✓ Done':'Complete'}
                    </button>
                  </div>
                )})}</div>
            )}
          </div>
        )}

        {/* ════════ CLIENT EMAIL ════════ */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
              <p className="text-xs text-blue-800"><strong>Live preview</strong> — Auto-updates as you edit risk items or use "Add to Client Email" from the Actions menu. Currently {emailItems.length} item{emailItems.length !== 1 ? 's' : ''} included.</p>
            </div>
            <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Subject</label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between"><span className="text-xs font-bold text-gray-500">Email Preview</span><span className="text-[10px] text-gray-400">Auto-updates from your edits</span></div>
              <div className="p-5 bg-gray-100/50"><div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: buildHTML() }} /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCopy} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${copied?'bg-emerald-500 text-white':'bg-gray-900 hover:bg-gray-800 text-white'}`}>{copied?'✓ Copied':'📋 Copy Plain Text'}</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
