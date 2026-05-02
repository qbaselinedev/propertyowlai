'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskItem {
  severity: 'high' | 'medium' | 'low'; category: string; issue: string
  context?: string; source_page?: number; recommendation?: string
  suggested_action?: string; include_in_email?: boolean
}

interface Activity {
  id?: string; type: 'task' | 'email' | 'phone'; title: string; description?: string
  priority?: 'high' | 'medium' | 'low'; status?: string; due_date?: string
  date: string; linked_risk_index?: number; property_address?: string
}

interface PageThumbnails { [page: number]: string }
interface ProReportProps {
  s32: any; contract: any; reportIds: { s32Id?: string; contractId?: string }
  propertyAddress: string; propertyId?: string; userType: 'conveyancer' | 'lawyer'
  customerId?: string; customerName?: string
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
  useEffect(() => { const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }; document.addEventListener('mousedown', c); return () => document.removeEventListener('mousedown', c) }, [])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-1.5">Actions <span className="text-[9px]">▾</span></button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-30 py-1" style={{ animation: 'ddF .12s ease-out' }}>
          <button onClick={() => { onToggleEmail(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3">{isIncluded ? '✅' : '✉️'} {isIncluded ? 'Remove from Client Email' : 'Add to Client Email'}</button>
          <button onClick={() => { onCreateTask(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3">📌 Create Task</button>
          <button onClick={() => { onEdit(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-3">{isEditing ? '✓' : '✏️'} {isEditing ? 'Done Editing' : 'Edit Item'}</button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => { onRestore(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-400 hover:bg-gray-50 hover:text-gray-600 flex items-center gap-3">↺ Restore AI Default</button>
        </div>
      )}
      <style jsx>{`@keyframes ddF{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function ThumbnailLightbox({ page, src, onClose }: { page: number; src: string; onClose: () => void }) {
  return (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}><div className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between px-4 py-2.5 bg-gray-800"><span className="text-sm font-semibold text-white">📄 Page {page}</span><button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button></div><div className="overflow-auto max-h-[80vh] p-2"><img src={`data:image/jpeg;base64,${src}`} alt={`Page ${page}`} className="w-full rounded" /></div></div></div>)
}

// ─── Finalise Modal ───────────────────────────────────────────────────────────

function FinaliseModal({ userType, propertyAddress, onConfirm, onCancel }: { userType: string; propertyAddress: string; onConfirm: () => void; onCancel: () => void }) {
  const [ok, setOk] = useState(false); const tl = userType === 'lawyer' ? 'Lawyer' : 'Conveyancer'
  return (<div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6" onClick={onCancel}><div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}><h3 className="text-lg font-bold text-gray-900 mb-3">Finalise Review</h3><p className="text-sm text-gray-600 mb-4">Finalising <strong>{propertyAddress}</strong> as a {tl}.</p><label className="flex items-start gap-2.5 cursor-pointer mb-5"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#E8001D]" /><span className="text-xs text-gray-600 leading-relaxed">I confirm this report reflects my professional assessment.</span></label><div className="flex gap-3"><button onClick={onConfirm} disabled={!ok} className="flex-1 bg-[#E8001D] hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40">Confirm</button><button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button></div></div></div>)
}

// ─── Create Activity Panel (slide-in) ─────────────────────────────────────────

function CreateActivityPanel({ item, itemIndex, propertyId, propertyAddress, onClose, onCreated }: {
  item?: RiskItem; itemIndex?: number; propertyId?: string; propertyAddress?: string; onClose: () => void; onCreated: (a: Activity) => void
}) {
  const supabase = createClient()
  const [actType, setActType] = useState<'task' | 'email' | 'phone'>(item ? 'task' : 'task')
  const [form, setForm] = useState({ title: item?.issue ?? '', description: item?.recommendation ?? '', priority: item?.severity ?? 'medium' as string, due_date: '', to: '', subject: '', body: '' })
  const [saving, setSaving] = useState(false)
  const pc: Record<string, string> = { high: 'border-red-300 bg-red-50 text-red-700', medium: 'border-amber-300 bg-amber-50 text-amber-700', low: 'border-blue-300 bg-blue-50 text-blue-700' }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return

    if (actType === 'task') {
      if (!form.title.trim()) { setSaving(false); return }
      const { data } = await supabase.from('crm_tasks').insert({
        conveyancer_id: user.id, property_id: propertyId || null, title: form.title.trim(),
        description: form.description.trim() || null, priority: form.priority, status: 'pending',
        due_date: form.due_date || null,
        linked_risk_item: item ? { index: itemIndex, severity: item.severity, category: item.category, issue: item.issue } : null,
      }).select().single()
      if (data) onCreated({ id: data.id, type: 'task', title: data.title, description: data.description, priority: data.priority, status: 'pending', date: data.created_at })
    } else if (actType === 'email') {
      // Just log it for now — actual send goes through /api/crm/send-email
      onCreated({ type: 'email', title: form.subject || 'Email', description: `To: ${form.to}`, date: new Date().toISOString() })
    } else {
      onCreated({ type: 'phone', title: form.title || 'Phone call', description: form.description, date: new Date().toISOString() })
    }
    setSaving(false); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto" style={{ animation: 'slideR .25s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-bold text-gray-900">New Activity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Activity type selector */}
          <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Activity Type</label>
            <div className="flex gap-1.5">{(['task', 'email', 'phone'] as const).map(t => (
              <button key={t} onClick={() => setActType(t)} className={`flex-1 text-xs font-bold py-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 ${actType === t ? 'border-[#E8001D] bg-red-50 text-[#E8001D]' : 'border-gray-200 bg-white text-gray-400'}`}>
                {t === 'task' ? '📌' : t === 'email' ? '✉️' : '📞'} {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}</div>
          </div>

          {item && <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Linked Risk Item</p><p className="text-xs font-semibold text-gray-700">{item.issue}</p></div>}

          {/* Task fields */}
          {actType === 'task' && (<>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Title *</label><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] focus:ring-2 focus:ring-red-100" /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Priority</label><div className="flex gap-1.5">{(['high','medium','low'] as const).map(p=>(<button key={p} onClick={()=>setForm(f=>({...f,priority:p}))} className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${form.priority===p?pc[p]:'border-gray-200 bg-white text-gray-400'}`}>{p[0].toUpperCase()+p.slice(1)}</button>))}</div></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label><input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
            </div>
          </>)}

          {/* Email fields */}
          {actType === 'email' && (<>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">To</label><input type="email" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Subject</label><input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Body</label><textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-y" /></div>
          </>)}

          {/* Phone fields */}
          {actType === 'phone' && (<>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Call Summary</label><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief summary…" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-none" /></div>
          </>)}

          <button onClick={save} disabled={saving} className="w-full bg-[#E8001D] hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-40 mt-2">{saving ? 'Creating…' : `+ Create ${actType.charAt(0).toUpperCase() + actType.slice(1)}`}</button>
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
  s32: initialS32, contract: initialContract, reportIds, propertyAddress, propertyId, userType, customerId, customerName,
}: ProReportProps) {
  const supabase = createClient()
  const [origS32] = useState<any>(JSON.parse(JSON.stringify(initialS32 ?? {})))
  const [origContract] = useState<any>(JSON.parse(JSON.stringify(initialContract ?? {})))
  const [s32, setS32] = useState<any>(initialS32)
  const [contract, setContract] = useState<any>(initialContract)
  const pageThumbs = getPageThumbnails(initialS32, initialContract)
  const [lightboxPage, setLightboxPage] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'risk' | 'sections' | 'activity' | 'email'>('risk')
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
  const [showActivityPanel, setShowActivityPanel] = useState(false)
  const [actPanelItem, setActPanelItem] = useState<{ item: RiskItem; idx: number } | undefined>()
  const [activities, setActivities] = useState<Activity[]>([])
  const [actFilter, setActFilter] = useState<'all' | 'task' | 'email' | 'phone'>('all')

  const typeLabel = userType === 'lawyer' ? 'Lawyer' : 'Conveyancer'
  const allItems: RiskItem[] = [...(s32?.items_detected ?? []), ...(contract?.items_detected ?? [])]
  const high = allItems.filter(f => f.severity === 'high').length
  const med = allItems.filter(f => f.severity === 'medium').length
  const low = allItems.filter(f => f.severity === 'low').length
  const vis = filter === 'all' ? allItems : allItems.filter(f => f.severity === filter)
  const emailItems = useMemo(() => allItems.filter(it => it.include_in_email !== false && (it.severity === 'high' || it.severity === 'medium' || it.include_in_email === true)), [allItems])

  function updateItem(gIdx: number, upd: RiskItem) {
    const c = (s32?.items_detected ?? []).length
    if (gIdx < c) { const a = [...(s32.items_detected ?? [])]; a[gIdx] = upd; setS32({ ...s32, items_detected: a }) }
    else { const a = [...(contract.items_detected ?? [])]; a[gIdx - c] = upd; setContract({ ...contract, items_detected: a }) }
    setPendingEdits(true)
  }
  function toggleEmail(g: number) { const it = allItems[g]; const cur = it.include_in_email ?? (it.severity === 'high' || it.severity === 'medium'); updateItem(g, { ...it, include_in_email: !cur }) }
  function restoreItem(g: number) { const c = (s32?.items_detected ?? []).length; const o = g < c ? origS32?.items_detected?.[g] : origContract?.items_detected?.[g - c]; if (o) updateItem(g, { ...o }) }

  async function handleSave() {
    setSaving(true); setSaveErr(null); const e: string[] = []
    if (reportIds.s32Id && s32) { const { error } = await supabase.from('reports').update({ raw_analysis: { ...s32, _professional_edited: true, _edited_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.s32Id); if (error) e.push(error.message) }
    if (reportIds.contractId && contract) { const { error } = await supabase.from('reports').update({ raw_analysis: { ...contract, _professional_edited: true, _edited_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.contractId); if (error) e.push(error.message) }
    setSaving(false); if (e.length) setSaveErr(e.join('. ')); else { setSaved(true); setPendingEdits(false); setTimeout(() => setSaved(false), 3000) }
  }

  async function confirmFinalise() {
    setShowFinalise(false); setEditingIdx(null); setFinalised(true); setSaving(true)
    if (reportIds.s32Id) await supabase.from('reports').update({ raw_analysis: { ...s32, _professional_finalised: true, _finalised_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.s32Id)
    if (reportIds.contractId) await supabase.from('reports').update({ raw_analysis: { ...contract, _professional_finalised: true, _finalised_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', reportIds.contractId)
    setSaving(false)
  }

  // Email builders (same as v3)
  function eRow(it: RiskItem, n: number, bg: string, col: string) { return `<tr><td style="padding:4px 0"><div style="background:${bg};border-radius:8px;padding:12px 14px;border-left:3px solid ${col}"><p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#111">${n}. ${it.issue}</p>${it.context?`<p style="margin:3px 0;font-size:12px;color:#555;line-height:1.5">${it.context}</p>`:''}${it.recommendation?`<p style="margin:5px 0 0;font-size:12px;color:${col};font-weight:600">→ ${it.recommendation}</p>`:''}</div></td></tr>` }
  function buildHTML() { const h=emailItems.filter(f=>f.severity==='high'),m=emailItems.filter(f=>f.severity==='medium'),l=emailItems.filter(f=>f.severity==='low');let s='';if(h.length){s+=`<tr><td style="padding:20px 0 6px"><p style="font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;letter-spacing:.08em;margin:0">● HIGH PRIORITY (${h.length})</p></td></tr>`;h.forEach((it,i)=>s+=eRow(it,i+1,'#FEF2F2','#DC2626'))}if(m.length){s+=`<tr><td style="padding:20px 0 6px"><p style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:.08em;margin:0">● ITEMS TO REVIEW (${m.length})</p></td></tr>`;m.forEach((it,i)=>s+=eRow(it,i+1,'#FFFBEB','#D97706'))}if(l.length){s+=`<tr><td style="padding:20px 0 6px"><p style="font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:.08em;margin:0">● NOTED (${l.length})</p></td></tr>`;l.forEach((it,i)=>s+=eRow(it,i+1,'#EFF6FF','#2563EB'))}return`<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#1A1A1A;padding:20px 32px;border-radius:12px 12px 0 0"><table width="100%"><tr><td><span style="font-size:20px">🦉</span> <span style="color:white;font-size:16px;font-weight:800">PropertyOwl AI</span></td><td style="text-align:right"><span style="color:rgba(255,255,255,.5);font-size:11px">Property Review</span></td></tr></table></td></tr><tr><td style="padding:28px 32px;background:white;border:1px solid #eee;border-top:none"><p style="margin:0 0 2px;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.1em;font-weight:600">Property</p><p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#111">${propertyAddress}</p><p style="margin:0;font-size:14px;color:#333;line-height:1.7">Dear Client,</p><p style="margin:10px 0 0;font-size:14px;color:#333;line-height:1.7">I have completed my review of the documentation for the above property. Below is a summary of key findings.</p>${s}<div style="margin:24px 0 0;padding:16px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB"><p style="margin:0;font-size:14px;color:#333;line-height:1.7">Please contact me if you have any questions.</p><p style="margin:12px 0 0;font-size:14px;color:#333">Kind regards,<br/><strong>[Your Name]</strong><br/>${typeLabel}</p></div></td></tr><tr><td style="padding:14px 32px;background:#F9FAFB;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;text-align:center"><p style="margin:0;font-size:10px;color:#999">Prepared using PropertyOwl AI · Not legal advice</p></td></tr></table></div>` }
  function buildPlain(){let b=`Dear Client,\n\nI have completed my review of ${propertyAddress}.\n\n`;const h=emailItems.filter(f=>f.severity==='high'),m=emailItems.filter(f=>f.severity==='medium'),l=emailItems.filter(f=>f.severity==='low');if(h.length){b+=`HIGH PRIORITY\n${'─'.repeat(40)}\n`;h.forEach((it,i)=>{b+=`${i+1}. ${it.issue}\n`;if(it.recommendation)b+=`   → ${it.recommendation}\n`;b+='\n'})}if(m.length){b+=`ITEMS TO REVIEW\n${'─'.repeat(40)}\n`;m.forEach((it,i)=>{b+=`${i+1}. ${it.issue}\n`;if(it.recommendation)b+=`   → ${it.recommendation}\n`;b+='\n'})}if(l.length){b+=`NOTED\n${'─'.repeat(40)}\n`;l.forEach((it,i)=>{b+=`${i+1}. ${it.issue}\n`});b+='\n'}b+=`Please contact me.\n\nKind regards,\n[Your Name]\n${typeLabel}`;return b}
  async function handleCopy(){await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${buildPlain()}`);setCopied(true);setTimeout(()=>setCopied(false),2500)}

  const allSections: { key: string; sec: any; src: string }[] = [...Object.entries(s32?.sections??{}).map(([k,v])=>({key:k,sec:v,src:'s32'})),...Object.entries(contract?.sections??{}).map(([k,v])=>({key:k,sec:v,src:'contract'}))]
  const filtActs = actFilter === 'all' ? activities : activities.filter(a => a.type === actFilter)

  return (
    <>
      {lightboxPage !== null && pageThumbs[lightboxPage] && <ThumbnailLightbox page={lightboxPage} src={pageThumbs[lightboxPage]} onClose={() => setLightboxPage(null)} />}
      {showFinalise && <FinaliseModal userType={userType} propertyAddress={propertyAddress} onConfirm={confirmFinalise} onCancel={() => setShowFinalise(false)} />}
      {showActivityPanel && <CreateActivityPanel item={actPanelItem?.item} itemIndex={actPanelItem?.idx} propertyId={propertyId} propertyAddress={propertyAddress} onClose={() => { setShowActivityPanel(false); setActPanelItem(undefined) }} onCreated={a => setActivities(p => [a, ...p])} />}

      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link href="/dashboard" className="hover:text-gray-700 transition-colors">Home</Link>
          {customerName && <><span>›</span><Link href="/dashboard/customers" className="hover:text-gray-700 transition-colors">Customers</Link></>}
          {customerName && customerId && <><span>›</span><Link href={`/dashboard/customers/${customerId}`} className="hover:text-gray-700 transition-colors">{customerName}</Link></>}
          <span>›</span><span className="text-gray-700 font-semibold">{propertyAddress}</span>
        </nav>

        {/* Disclaimer */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <span className="text-sm">⚠️</span><p className="text-xs text-amber-800"><strong>AI-Generated Analysis</strong> — Validate against source documents.</p>
          {finalised && <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Finalised</span>}
        </div>

        {/* Tab bar + save + finalise */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-sm px-1">
          <div className="flex">{([{k:'risk',l:`Risk Analysis (${allItems.length})`},{k:'sections',l:'Document Sections'},{k:'activity',l:`Activity (${activities.length})`},{k:'email',l:`Client Email (${emailItems.length})`}] as const).map(t=>(<button key={t.k} onClick={()=>setActiveTab(t.k as any)} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab===t.k?'border-[#E8001D] text-[#E8001D]':'border-transparent text-gray-400 hover:text-gray-700'}`}>{t.l}</button>))}</div>
          <div className="flex items-center gap-2 px-2 py-2">
            {saveErr && <span className="text-xs text-red-500 max-w-[120px] truncate">{saveErr}</span>}
            <button onClick={handleSave} disabled={saving||!pendingEdits} className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${saved?'bg-emerald-500 text-white border-emerald-500':pendingEdits?'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 shadow-sm':'border-gray-200 text-gray-300 bg-gray-50 cursor-default'}`}>
              {pendingEdits&&!saved&&<span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/>}{saved?'✓ Saved':saving?'Saving…':'💾 Save'}
            </button>
            {!finalised?<button onClick={()=>setShowFinalise(true)} className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#E8001D] hover:bg-red-700 text-white">Finalise</button>:<button onClick={()=>setFinalised(false)} className="text-xs font-bold px-4 py-1.5 rounded-lg bg-gray-800 text-white">Revise</button>}
          </div>
        </div>

        {/* ══ RISK ANALYSIS ══ */}
        {activeTab==='risk'&&(<div className="space-y-3"><div className="flex gap-2 flex-wrap">{([{k:'all',l:`All (${allItems.length})`,c:'bg-gray-900 text-white'},{k:'high',l:`High (${high})`,c:'bg-red-600 text-white'},{k:'medium',l:`Medium (${med})`,c:'bg-amber-500 text-white'},{k:'low',l:`Low (${low})`,c:'bg-blue-500 text-white'}] as const).map(f=>(<button key={f.k} onClick={()=>setFilter(f.k as any)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${filter===f.k?f.c:'bg-white border border-gray-200 text-gray-500 hover:text-gray-800'}`}>{f.l}</button>))}</div>
          {vis.map(item=>{const g=allItems.indexOf(item);const sv=SEV[item.severity];const ed=editingIdx===g;const inE=item.include_in_email!==false&&(item.severity==='high'||item.severity==='medium'||item.include_in_email===true);return(
            <div key={g} className={`bg-white rounded-xl border transition-all ${ed?'border-amber-300 shadow-lg ring-2 ring-amber-100':'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:sv.dot}}/><span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{background:sv.lBg,color:sv.lText}}>{sv.label}</span><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.category}</span>{inE&&<span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✉️ In Client Email</span>}</div>
                <div className="flex items-center gap-2">{item.source_page&&pageThumbs[item.source_page]&&<button onClick={()=>setLightboxPage(item.source_page!)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">View Document Page ({item.source_page})</button>}<ActionsMenu isIncluded={inE} isEditing={ed} onToggleEmail={()=>toggleEmail(g)} onEdit={()=>setEditingIdx(ed?null:g)} onCreateTask={()=>{setActPanelItem({item,idx:g});setShowActivityPanel(true)}} onRestore={()=>restoreItem(g)}/></div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Issue Identified</p>{ed?<input type="text" value={item.issue} onChange={e=>updateItem(g,{...item,issue:e.target.value})} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-semibold bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-200 text-gray-900"/>:<p className="text-sm font-semibold text-gray-900 leading-relaxed">{item.issue}</p>}</div>
                {(item.context||ed)&&<div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Context</p>{ed?<textarea value={item.context??''} onChange={e=>updateItem(g,{...item,context:e.target.value})} rows={2} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50/40 focus:outline-none resize-none text-gray-800"/>:<p className="text-sm text-gray-700 leading-relaxed">{item.context}</p>}</div>}
                {(item.recommendation||ed)&&<div className="rounded-lg border border-gray-200 px-4 py-3"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">💡 Recommendation</p>{ed?<textarea value={item.recommendation??''} onChange={e=>updateItem(g,{...item,recommendation:e.target.value})} rows={2} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50/40 focus:outline-none resize-none"/>:<p className="text-sm text-gray-700 leading-relaxed">{item.recommendation}</p>}</div>}
                {(item.suggested_action||ed)&&<div className="bg-indigo-50/60 rounded-lg border border-indigo-100 px-4 py-3"><p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">⚡ Suggested Action</p>{ed?<textarea value={item.suggested_action??''} onChange={e=>updateItem(g,{...item,suggested_action:e.target.value})} rows={2} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-amber-50/40 focus:outline-none resize-none"/>:<p className="text-sm text-indigo-800 leading-relaxed">{item.suggested_action}</p>}</div>}
              </div>
            </div>
          )})}
        </div>)}

        {/* ══ DOCUMENT SECTIONS ══ */}
        {activeTab==='sections'&&<div className="space-y-3">{allSections.map(({key,sec,src})=>{if(!sec||typeof sec!=='object')return null;const lbl=key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());const st=sec.status;const sc=st==='clear'?'text-emerald-700 bg-emerald-50 border-emerald-200':st==='issues'?'text-red-700 bg-red-50 border-red-200':'text-gray-500 bg-gray-50 border-gray-200';return(<div key={`${src}-${key}`} className="bg-white rounded-xl border border-gray-200"><div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100"><p className="text-sm font-bold text-gray-800">{lbl}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc}`}>{st?.toUpperCase()}</span><span className="text-[10px] text-gray-400 font-medium">{src.toUpperCase()}</span></div><div className="px-5 py-4">{sec.summary&&<p className="text-sm text-gray-700 leading-relaxed">{sec.summary}</p>}{sec.findings?.length>0&&<div className="mt-2 space-y-1">{sec.findings.map((f:string,i:number)=><p key={i} className="text-sm text-gray-600">• {f}</p>)}</div>}{sec.conditions?.length>0&&<div className="mt-2 space-y-1.5">{sec.conditions.map((c:any,i:number)=><div key={i} className="text-sm text-gray-700"><span className={`font-bold ${c.complexity==='unusual'?'text-red-600':c.complexity==='non-standard'?'text-amber-600':'text-gray-500'}`}>{c.number?`SC${c.number}: `:''}{c.complexity?.toUpperCase()}</span> {c.summary}</div>)}</div>}</div></div>)})}</div>}

        {/* ══ ACTIVITY (was Tasks) ══ */}
        {activeTab==='activity'&&<div className="space-y-4">
          <div className="flex items-center justify-between"><div className="flex gap-1.5">{[{k:'all',l:`All (${activities.length})`},{k:'task',l:'Tasks'},{k:'email',l:'Emails'},{k:'phone',l:'Phone'}].map(f=>(<button key={f.k} onClick={()=>setActFilter(f.k as any)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${actFilter===f.k?'bg-gray-900 text-white':'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'}`}>{f.l}</button>))}</div>
            <button onClick={()=>{setActPanelItem(undefined);setShowActivityPanel(true)}} className="text-xs font-bold px-4 py-1.5 rounded-lg bg-[#E8001D] hover:bg-red-700 text-white">+ New Activity</button>
          </div>
          {filtActs.length===0?<div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center"><p className="text-3xl mb-2">📋</p><p className="text-sm font-bold text-gray-700 mb-1">No activities yet</p><p className="text-xs text-gray-400 mb-4">Create tasks, log emails or phone calls</p><button onClick={()=>{setActPanelItem(undefined);setShowActivityPanel(true)}} className="bg-[#E8001D] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700">+ New Activity</button></div>
          :<div className="space-y-2">{filtActs.map((a,i)=>{const icon=a.type==='email'?'✉️':a.type==='task'?'📌':'📞';const tb=a.type==='email'?'bg-blue-50 text-blue-700 border-blue-200':a.type==='task'?'bg-amber-50 text-amber-700 border-amber-200':'bg-green-50 text-green-700 border-green-200';const bl=a.type==='task'&&a.priority==='high'?'border-l-red-500':a.type==='task'&&a.priority==='medium'?'border-l-amber-500':a.type==='task'?'border-l-blue-500':a.type==='email'?'border-l-blue-400':'border-l-green-400';return(
            <div key={a.id??i} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${bl} px-4 py-3 flex items-start justify-between gap-3`}>
              <div className="flex items-start gap-3 min-w-0"><span className="text-lg mt-0.5">{icon}</span><div className="min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tb}`}>{a.type.toUpperCase()}</span>{a.priority&&<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.priority==='high'?'bg-red-100 text-red-700':a.priority==='medium'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>{a.priority.toUpperCase()}</span>}{a.status==='completed'&&<span className="text-[10px] font-bold text-emerald-600">✓ Done</span>}</div><p className={`text-sm font-semibold ${a.status==='completed'?'line-through text-gray-400':'text-gray-900'}`}>{a.title}</p>{a.description&&<p className="text-xs text-gray-500 mt-0.5 truncate">{a.description}</p>}</div></div>
              <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{new Date(a.date).toLocaleDateString()}</span>
            </div>
          )})}</div>}
        </div>}

        {/* ══ CLIENT EMAIL ══ */}
        {activeTab==='email'&&<div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5"><p className="text-xs text-blue-800"><strong>Live preview</strong> — Auto-updates as you edit risk items or use "Add to Client Email". {emailItems.length} items included.</p></div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Subject</label><input type="text" value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]"/></div>
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm"><div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between"><span className="text-xs font-bold text-gray-500">Email Preview</span><span className="text-[10px] text-gray-400">Auto-updates</span></div><div className="p-5 bg-gray-100/50"><div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto" dangerouslySetInnerHTML={{__html:buildHTML()}}/></div></div>
          <div className="flex gap-3"><button onClick={handleCopy} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${copied?'bg-emerald-500 text-white':'bg-gray-900 hover:bg-gray-800 text-white'}`}>{copied?'✓ Copied':'📋 Copy Plain Text'}</button></div>
        </div>}
      </div>
    </>
  )
}
