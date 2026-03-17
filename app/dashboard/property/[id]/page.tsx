'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: string; address: string; suburb: string; postcode: string | null
  property_type: string; price: number | null; auction_date: string | null
  agent_name: string | null; notes: string | null; risk_score: number | null
  s32_reviewed: boolean; s32_file_path: string | null; contract_file_path: string | null
  created_at: string
}
interface RedFlag { severity: 'high' | 'medium' | 'low'; category: string; issue: string; recommendation: string }
interface S32Analysis {
  document_type: 's32'; property_address?: string; risk_score: number; risk_summary: string
  red_flags: RedFlag[]; disclaimer: string
  negotiation_points: string[]; conveyancer_questions: string[]; positive_findings: string[]
  sections: {
    title_and_ownership?: { status: string; ct_number?: string; lot_plan?: string; volume_folio?: string; registered_proprietors?: string; encumbrances?: any[]; findings?: string[]; summary?: string }
    planning_and_zoning?: { status: string; zone?: string; overlays?: string[]; gaic_applicable?: boolean; gaic_amount?: string; findings?: string[]; summary?: string }
    easements_and_covenants?: { status: string; items?: any[]; findings?: string[]; summary?: string }
    building_permits?: { status: string; permits?: any[]; findings?: string[]; summary?: string }
    owners_corporation?: { applicable?: boolean; status: string; oc_number?: string; annual_fee?: string; special_levies?: string; lot_liability?: string; findings?: string[]; summary?: string }
    outgoings?: { status: string; council_name?: string; council_rates?: string; civ?: string; water_authority?: string; water_charges?: string; unpaid_water_balance?: string; land_tax?: string; windfall_gains_tax?: string; findings?: string[]; summary?: string }
    vendor_disclosure?: { status: string; road_access?: boolean; services_connected?: string[]; findings?: string[]; summary?: string }
  }
}
interface ContractAnalysis {
  document_type: 'contract'; risk_score: number; risk_summary: string
  red_flags: RedFlag[]; disclaimer: string; negotiation_points: string[]; conveyancer_questions: string[]
  sections: {
    price_and_deposit?: { status: string; purchase_price?: string; deposit_amount?: string; deposit_due?: string; deposit_holder?: string; summary?: string }
    settlement?: { status: string; settlement_date?: string; settlement_type?: string; summary?: string }
    special_conditions?: { status: string; conditions?: any[]; summary?: string }
    goods_and_chattels?: { status: string; included?: string[]; excluded?: string[]; summary?: string }
    cooling_off?: { status: string; period?: string; waived?: boolean; summary?: string }
    penalty_and_risk?: { status: string; summary?: string }
    gst_and_tax?: { status: string; gst_applicable?: boolean; summary?: string }
  }
}

const REA = '#E8001D'
const TABS = ['Contract Scan', 'Online Scan']
const CONTRACT_SUBTABS = ['Overview', 'S32 Review', 'Risk Analysis', 'Negotiation Brief', 'Contract Brief', 'Confirmed Clear']

const sev = {
  high:   { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-100 text-red-700',   strip: '#DC2626', icon: '🔴' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', strip: '#D97706', icon: '🟡' },
  low:    { bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-700',  badge: 'bg-blue-100 text-blue-700',  strip: '#3B82F6', icon: '🔵' },
}
const stc = {
  clear:          { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✓' },
  issues:         { color: 'text-red-600',     bg: 'bg-red-50',     icon: '!' },
  issues_found:   { color: 'text-red-600',     bg: 'bg-red-50',     icon: '!' },
  not_provided:   { color: 'text-amber-600',   bg: 'bg-amber-50',   icon: '?' },
  not_applicable: { color: 'text-gray-400',    bg: 'bg-gray-50',    icon: '—' },
  incomplete:     { color: 'text-amber-600',   bg: 'bg-amber-50',   icon: '?' },
} as Record<string, { color: string; bg: string; icon: string }>

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const supabase = createClient()

  const [property, setProperty] = useState<Property | null>(null)
  const [s32, setS32] = useState<S32Analysis | null>(null)
  const [contract, setContract] = useState<ContractAnalysis | null>(null)
  const [scan, setScan] = useState<any | null>(null)
  const [scanning, setScanning] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('Contract Scan')
  const [contractSubTab, setContractSubTab] = useState('Overview')
  const [uploading, setUploading] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [credits, setCredits] = useState(0)
  const [fileInput] = useState(() => typeof window !== 'undefined' ? document.createElement('input') : null)

  useEffect(() => {
    if (!id) return
    load()
  }, [id])

  async function load() {
    setLoading(true); setError(null)
    try {
      const { data: prop, error: pe } = await supabase.from('properties').select('*').eq('id', id).single()
      if (pe || !prop) { setError('Property not found.'); return }
      setProperty(prop)
      if (prop?.is_demo) setIsDemo(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
        if (prof) setCredits(prof.credits ?? 0)
      }

      const { data: reports } = await supabase.from('reports').select('*').eq('property_id', id).order('created_at', { ascending: false })
      if (reports) {
        const s32r  = reports.find((r: any) => r.document_type === 's32') ?? reports.find((r: any) => r.raw_analysis?.document_type === 's32')
        const conr  = reports.find((r: any) => r.document_type === 'contract') ?? reports.find((r: any) => r.raw_analysis?.document_type === 'contract')
        const scanr = reports.find((r: any) => r.document_type === 'online_scan')
        if (s32r?.raw_analysis) setS32(s32r.raw_analysis)
        if (conr?.raw_analysis) setContract(conr.raw_analysis)
        if (scanr?.raw_analysis) setScan(scanr.raw_analysis)
      }
    } catch (e: any) { setError(e?.message ?? 'Failed to load.') }
    finally { setLoading(false) }
  }

  async function handleDownloadPack() {
    if (!property) return
    setDownloading(true)
    try {
      // For demo property, use pre-generated PDF from public folder
      if (property.is_demo) {
        const a = document.createElement('a')
        a.href = '/demo-conveyancer-pack.pdf'
        a.download = 'PropertyOwl_Demo_ConveyancerPack.pdf'
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setDownloading(false)
        return
      }
      const res = await fetch('/api/conveyancer-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        const msg = (err.error ?? 'Unknown error') + (err.detail ? '\n\nDetail: ' + err.detail.substring(0, 300) : '')
        alert('Download failed: ' + msg)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PropertyOwl_ConveyancerPack_${property.address.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Download failed: ' + e.message)
    } finally {
      setDownloading(false)
    }
  }

  async function handleRunScan() {
    if (!property) return
    setScanning(true)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Scan failed: ' + (err.error ?? 'Unknown error'))
        return
      }
      const data = await res.json()
      if (res.status === 402) {
        // Insufficient credits
        window.location.href = '/dashboard/buy-credits'
        return
      }
      if (data.data) {
        setScan(data.data)
        setActiveTab('Online Scan')
        // Refresh credits in page state and fire event for header
        load()
        window.dispatchEvent(new Event('credits-updated'))
      } else if (!res.ok) {
        alert('Scan failed: ' + (data.error ?? 'Unknown error'))
      }
    } catch (e: any) {
      alert('Scan failed: ' + e.message)
    } finally {
      setScanning(false)
    }
  }

  function triggerUpload() {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'application/pdf'
    inp.onchange = (e: any) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }
    inp.click()
  }

  async function handleUpload(file: File) {
    if (!property) return
    if (credits < 2) { alert('You need at least 2 credits.'); return }
    setUploading('Uploading PDF…')
    const path = `${property.id}/combined_${Date.now()}.pdf`
    const { error: ue } = await supabase.storage.from('property-documents').upload(path, file, { upsert: true })
    if (ue) { alert('Upload failed: ' + ue.message); setUploading(null); return }
    await supabase.from('properties').update({ s32_file_path: path }).eq('id', property.id)
    setUploading('Analysing with AI — this takes 1–2 minutes…')
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId: property.id, filePath: path }) })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e: any) { alert('Analysis failed: ' + e.message) }
    setUploading(null)
  }

  if (loading) return <div className="flex items-center justify-center py-32"><div className="text-center"><span className="text-5xl animate-pulse">🦉</span><p className="text-gray-500 text-sm mt-3">Loading property…</p></div></div>
  if (error || !property) return <div className="flex items-center justify-center py-32"><div className="text-center"><span className="text-4xl">🔍</span><p className="text-gray-700 font-semibold mt-3">{error ?? 'Property not found.'}</p><Link href="/dashboard" className="text-sm font-semibold mt-3 block" style={{ color: REA }}>← Back to dashboard</Link></div></div>

  const riskScore = property.risk_score
  const riskLabel = !riskScore ? 'Not reviewed' : riskScore >= 8 ? 'Needs attention' : riskScore >= 5 ? 'Review carefully' : 'Looking good'
  const riskColor = !riskScore ? 'text-gray-400' : riskScore >= 8 ? 'text-red-700' : riskScore >= 5 ? 'text-amber-700' : 'text-emerald-700'
  const allFlags = [...(s32?.red_flags ?? []), ...(contract?.red_flags ?? [])]
  const issueCount = allFlags.filter(f => f.severity === 'high' || f.severity === 'medium').length

  return (
    <div className="space-y-5 pb-10">

      {/* ── Property Header ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div style={{ height: 4, background: REA }} />
        <div className="p-5 lg:p-6">
          <div className="flex flex-col xl:flex-row xl:items-start gap-6">

            {/* Left */}
            <div className="flex-shrink-0 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: REA }}>Prospective Property</p>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">{property.address}</h1>
              <p className="text-gray-500 text-sm mt-1">{property.suburb}{property.postcode ? `, Victoria ${property.postcode}` : ''}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(property.s32_reviewed || !!s32) && <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full">✓ S32 Reviewed</span>}
                {!!contract ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full">✓ Contract Reviewed</span>
                  : <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2.5 py-1 rounded-full">⏳ Contract Pending</span>}
                {issueCount > 0 && <button onClick={() => setActiveTab('Risk Analysis')} className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-full hover:bg-red-200 transition-colors">⚠ {issueCount} item{issueCount !== 1 ? 's' : ''} to review</button>}
              </div>
              <div className="flex flex-wrap gap-5 mt-4">
                {property.price && <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Asking</p><p className="text-base font-bold text-gray-900">${property.price.toLocaleString()}</p></div>}
                {property.property_type && <div><p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Type</p><p className="text-base font-bold text-gray-900 capitalize">{property.property_type}</p></div>}
                {riskScore != null && (
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Review Status</p>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mt-0.5 ${
                      riskScore >= 8 ? 'bg-red-50' : riskScore >= 5 ? 'bg-amber-50' : 'bg-emerald-50'
                    }`}>
                      <span className={`w-2 h-2 rounded-full inline-block ${
                        riskScore >= 8 ? 'bg-red-400' : riskScore >= 5 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <p className={`text-sm font-semibold ${riskColor}`}>{riskLabel}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right — rich checklist */}
            <div className="flex-1">
              <ChecklistPanel s32={s32} contract={contract} onNavigate={setActiveTab} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Demo banner — fixed under header ── */}
      {isDemo && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-[#1A1A1A] flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            <span className="text-base">🦉</span>
            <span className="text-xs font-bold text-white">Demo property</span>
            <span className="text-xs text-gray-400">— sample data, not a real listing</span>
          </div>
          <a href="/dashboard/buy-credits"
            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90"
            style={{background:'#E8001D'}}>
            Get started →
          </a>
        </div>
      )}
      {/* Spacer so demo banner doesn't overlap content */}
      {isDemo && <div className="h-8" />}

      {/* ── Sticky disclaimer banner ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
        <span className="text-amber-600 text-sm flex-shrink-0">⚖️</span>
        <p className="text-xs text-amber-700">
          <strong>Not legal advice.</strong> PropertyOwl AI is an AI-assisted review tool only. Always engage a licensed Victorian conveyancer before signing any documents or paying any deposit.
        </p>
      </div>



      {/* ── ONE unified tab box ── */}
      <div className="bg-white rounded-xl border-2 overflow-hidden"
           style={{borderColor: activeTab === 'Contract Scan' ? '#E8001D' : '#334155'}}>

        {/* Row 1: main parent tabs + action buttons */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-3 pt-0">
          <div className="flex">
            {TABS.map(tab => {
              const isActive = activeTab === tab
              const tabColor = tab === 'Contract Scan' ? '#E8001D' : '#334155'
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all whitespace-nowrap border-b-2 -mb-px ${
                    isActive ? '' : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                  style={isActive ? {color: tabColor, borderBottomColor: tabColor} : {}}>
                  <span>{tab === 'Contract Scan' ? '📄' : '🔍'}</span>
                  <span>{tab}</span>
                  {tab === 'Contract Scan' && (s32 || contract) && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold ml-1 bg-emerald-100 text-emerald-700">✓</span>
                  )}
                  {tab === 'Online Scan' && scan && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold ml-1 bg-gray-100 text-gray-500">✓</span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            {(s32 || contract) && (
              <button onClick={handleDownloadPack} disabled={downloading}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                {downloading ? '…' : '↓ Conveyancer Pack'}
              </button>
            )}
            <button onClick={triggerUpload} className="text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{background: REA}}>
              {uploading ? '…' : '↑ Upload / Re-analyse'}
            </button>
          </div>
        </div>

        {/* Row 2: Contract Scan sub-tabs (only when contract scan active + has data) */}
        {activeTab === 'Contract Scan' && (s32 || contract) && (
          <div className="flex border-b border-gray-100 bg-gray-50 px-3 overflow-x-auto">
            {CONTRACT_SUBTABS.map(sub => (
              <button key={sub} onClick={() => setContractSubTab(sub)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
                  contractSubTab === sub
                    ? 'border-[#E8001D] text-[#E8001D]'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}>
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Row 3: uploading notice */}
        {uploading && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-base animate-spin inline-block">⟳</span>
            <div><p className="text-sm font-bold text-amber-800">{uploading}</p><p className="text-xs text-amber-600">Do not close this page.</p></div>
          </div>
        )}

        {/* Row 4: tab content — inside the same box */}
        <div className="bg-gray-50 p-5 space-y-4">
          {activeTab === 'Contract Scan' && !(s32 || contract) && (
            <ContractScanEmptyState credits={credits} onUpload={triggerUpload} />
          )}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Overview'          && <OverviewTab s32={s32} contract={contract} property={property} credits={credits} onUpload={triggerUpload} onNavigate={(t) => setContractSubTab(t)} onDownload={handleDownloadPack} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'S32 Review'        && <S32ReviewTab s32={s32} onUpload={triggerUpload} credits={credits} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Risk Analysis'     && <RiskAnalysisTab s32={s32} contract={contract} property={property} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Negotiation Brief' && <NegotiationBriefTab s32={s32} contract={contract} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Contract Brief'    && <ContractTab contract={contract} credits={credits} onUpload={triggerUpload} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Confirmed Clear'   && <ConfirmedClearTab s32={s32} contract={contract} />}
          {activeTab === 'Online Scan'   && <PropertyScanTab scan={scan} scanning={scanning} onRunScan={handleRunScan} property={property} credits={credits} />}
        </div>
      </div>
    </div>
  )
}

// ─── Checklist Panel ──────────────────────────────────────────────────────────

function ChecklistPanel({ s32, contract, onNavigate }: { s32: S32Analysis | null; contract: ContractAnalysis | null; onNavigate: (t: string) => void }) {
  const o = s32?.sections?.outgoings
  const t = s32?.sections?.title_and_ownership
  const p = s32?.sections?.planning_and_zoning
  const bp = s32?.sections?.building_permits
  const oc = s32?.sections?.owners_corporation
  const ec = s32?.sections?.easements_and_covenants
  const pd = contract?.sections?.price_and_deposit
  const st = contract?.sections?.settlement
  const sc = contract?.sections?.special_conditions
  const co = contract?.sections?.cooling_off

  // Mortgage: look for mortgage encumbrance in title
  const mortgageEnc = t?.encumbrances?.find(e => e.type === 'mortgage')
  const mortgageStatus = !s32 ? 'pending' : mortgageEnc ? 'fail' : 'pass'
  const mortgageVal = mortgageEnc ? mortgageEnc.detail ?? mortgageEnc.reference ?? 'Undischarged' : s32 ? 'Clear' : null

  // Rates: overdue check
  const ratesOverdue = s32?.red_flags?.some(f => f.issue?.toLowerCase().includes('rates') || f.issue?.toLowerCase().includes('council'))
  const ratesStatus = !s32 ? 'pending' : ratesOverdue ? 'fail' : o?.council_rates ? 'pass' : 'pending'
  const ratesVal = o?.council_rates ?? null

  // OC
  const ocStatus = !s32 ? 'pending' : !oc?.applicable ? 'pass' : oc.status === 'clear' ? 'pass' : oc.status === 'issues' ? 'fail' : 'warn'
  const ocVal = !oc?.applicable ? (s32 ? 'Not applicable' : null) : oc?.annual_fee ? oc.annual_fee : oc?.oc_number ?? null

  // Land tax
  const landTaxFlag = s32?.red_flags?.some(f => f.issue?.toLowerCase().includes('land tax'))
  const landTaxStatus = !s32 ? 'pending' : landTaxFlag ? 'fail' : o?.land_tax !== undefined ? 'pass' : 'pending'
  const landTaxVal = o?.land_tax ?? null

  // Windfall
  const windfallStatus = !s32 ? 'pending' : 'pass'
  const windfallVal = o?.windfall_gains_tax ?? (s32 ? 'NIL — confirmed' : null)

  // Water
  const waterOverdue = s32?.red_flags?.some(f => f.issue?.toLowerCase().includes('water'))
  const waterStatus = !s32 ? 'pending' : waterOverdue ? 'fail' : o?.water_charges ? 'pass' : 'pending'
  const waterVal = o?.unpaid_water_balance && o.unpaid_water_balance !== '$0.00' ? `${o.unpaid_water_balance} overdue` : o?.water_charges ?? null

  // GST
  const gstStatus = !s32 ? 'pending' : 'pass'
  const gstVal = contract?.sections?.gst_and_tax?.gst_applicable === false ? 'No withholding req.' : s32 ? 'Confirmed' : null

  // Tenancy
  const tenancyFlag = s32?.red_flags?.find(f => f.issue?.toLowerCase().includes('tenant') || f.issue?.toLowerCase().includes('tenancy') || f.category?.toLowerCase().includes('tenancy'))
  const tenancyStatus = !s32 ? 'pending' : tenancyFlag ? 'warn' : 'pass'
  const tenancyVal = tenancyFlag ? tenancyFlag.issue.substring(0, 35) + '…' : s32 ? 'Vacant possession' : null

  // Planning cert
  const planningStatus = !s32 ? 'pending' : p?.status === 'clear' ? 'pass' : p?.status === 'issues' ? 'warn' : s32 ? 'pass' : 'pending'
  const planningVal = p?.zone ? p.zone : s32 ? 'Attached' : null

  // OC minutes
  const ocMinutesFlag = s32?.red_flags?.some(f => f.issue?.toLowerCase().includes('minutes'))
  const ocMinutesStatus = !s32 ? 'pending' : !oc?.applicable ? 'pass' : ocMinutesFlag ? 'warn' : 'warn'
  const ocMinutesVal = !oc?.applicable && s32 ? 'No OC' : s32 ? 'Obtain from OC manager' : null

  // Insurance
  const insuranceStatus = !s32 ? 'pending' : !oc?.applicable ? 'pass' : 'warn'
  const insuranceVal = !oc?.applicable && s32 ? 'No OC' : s32 ? 'Contract pending' : null

  // Vendor warranties
  const vd = s32?.sections?.vendor_disclosure
  const warrantiesStatus = !s32 ? 'pending' : vd?.status === 'clear' ? 'pass' : vd?.status === 'issues' ? 'fail' : s32 ? 'pass' : 'pending'
  const warrantiesVal = vd?.services_connected?.length ? vd.services_connected.join(', ').substring(0, 30) : s32 ? 'Confirmed' : null

  // Contract fields
  const priceStatus = !contract ? 'pending' : pd?.status === 'clear' ? 'pass' : 'warn'
  const priceVal = pd?.purchase_price ?? null

  const depositStatus = !contract ? 'pending' : pd?.deposit_amount ? 'pass' : 'warn'
  const depositVal = pd?.deposit_amount ? `${pd.deposit_amount}` + (pd.deposit_holder ? ` · ${pd.deposit_holder}` : '') : null

  const settlementStatus = !contract ? 'pending' : st?.settlement_date ? 'pass' : 'warn'
  const settlementVal = st?.settlement_date ?? null

  const coolingStatus = s32 ? 'pass' : 'pending'
  const coolingVal = co?.waived ? 'Waived' : '3 business days'

  const financeStatus = !contract ? 'pending' : 'warn'
  const financeVal = !contract ? null : sc?.conditions?.find(c => c.summary?.toLowerCase().includes('finance'))?.summary?.substring(0, 30) ?? 'Check special conditions'

  const specialStatus = !contract ? 'pending' : sc?.status === 'clear' ? 'pass' : sc?.conditions?.length ? 'warn' : 'pass'
  const specialVal = !contract ? null : sc?.conditions?.length ? `${sc.conditions.length} condition${sc.conditions.length !== 1 ? 's' : ''}` : 'None'

  type CS = { label: string; status: 'pass' | 'fail' | 'warn' | 'pending'; value: string | null; tab: string }
  const groups: { title: string; tab: string; count: string; items: CS[] }[] = [
    {
      title: 'Land & Title', tab: 'S32 Review',
      count: countIssues([mortgageStatus, planningStatus] as any),
      items: [
        { label: 'Mortgage',         status: mortgageStatus as any, value: mortgageVal,  tab: 'S32 Review' },
        { label: 'Title Search',     status: !s32 ? 'pending' : t?.volume_folio ? 'pass' : 'pass', value: t?.volume_folio ? `Vol ${t.volume_folio} — clear` : s32 ? 'Clear' : null, tab: 'S32 Review' },
        { label: 'Zoning',           status: !s32 ? 'pending' : p?.zone ? 'pass' : 'pass', value: p?.zone ?? (s32 ? 'General Residential' : null), tab: 'S32 Review' },
        { label: 'Overlays',         status: !s32 ? 'pending' : (p?.overlays?.length ? 'warn' : 'pass'), value: p?.overlays?.length ? p.overlays.join(', ') : s32 ? 'None detected' : null, tab: 'S32 Review' },
        { label: 'Building Permits', status: !s32 ? 'pending' : bp?.status === 'clear' ? 'pass' : bp?.status === 'issues' ? 'fail' : 'warn', value: bp?.permits?.length ? `${bp.permits.length} permit${bp.permits.length !== 1 ? 's' : ''}` : s32 ? 'None found' : null, tab: 'S32 Review' },
        { label: 'Easements',        status: !s32 ? 'pending' : ec?.status === 'clear' ? 'pass' : ec?.items?.length ? 'warn' : 'pass', value: ec?.items?.length ? `${ec.items.length} recorded` : s32 ? 'None' : null, tab: 'S32 Review' },
      ],
    },
    {
      title: 'Financials & Outgoings', tab: 'S32 Review',
      count: countIssues([ratesStatus, waterStatus, landTaxStatus] as any),
      items: [
        { label: 'Council Rates',     status: ratesStatus as any,   value: ratesVal,    tab: 'S32 Review' },
        { label: 'OC Annual Levy',    status: ocStatus as any,      value: ocVal,       tab: 'S32 Review' },
        { label: 'Land Tax',          status: landTaxStatus as any, value: landTaxVal,  tab: 'S32 Review' },
        { label: 'Windfall Gains Tax',status: windfallStatus as any,value: windfallVal, tab: 'S32 Review' },
        { label: 'Water Charges',     status: waterStatus as any,   value: waterVal,    tab: 'S32 Review' },
        { label: 'GST Status',        status: gstStatus as any,     value: gstVal,      tab: 'S32 Review' },
      ],
    },
    {
      title: 'Ownership & Use', tab: 'S32 Review',
      count: countIssues([tenancyStatus, ocMinutesStatus, insuranceStatus] as any),
      items: [
        { label: 'Tenancy',            status: tenancyStatus as any,    value: tenancyVal,    tab: 'S32 Review' },
        { label: 'Owners Corporation', status: ocStatus as any,         value: ocVal,         tab: 'S32 Review' },
        { label: 'Planning Certificate',status: planningStatus as any,  value: planningVal,   tab: 'S32 Review' },
        { label: 'OC Meeting Minutes', status: ocMinutesStatus as any,  value: ocMinutesVal,  tab: 'S32 Review' },
        { label: 'Insurance (OC)',     status: insuranceStatus as any,  value: insuranceVal,  tab: 'S32 Review' },
        { label: 'Vendor Warranties',  status: warrantiesStatus as any, value: warrantiesVal, tab: 'S32 Review' },
      ],
    },
    {
      title: 'Contract Conditions', tab: 'Contract',
      count: !contract ? 'Pending' : countIssues([priceStatus, depositStatus, settlementStatus, specialStatus] as any),
      items: [
        { label: 'Purchase Price',        status: priceStatus as any,      value: priceVal,      tab: 'Contract' },
        { label: 'Deposit Amount & Holder',status: depositStatus as any,   value: depositVal,    tab: 'Contract' },
        { label: 'Settlement Date',       status: settlementStatus as any, value: settlementVal, tab: 'Contract' },
        { label: 'Cooling Off Status',    status: coolingStatus as any,    value: coolingVal,    tab: 'Contract' },
        { label: 'Finance / Build Clauses',status: financeStatus as any,   value: financeVal,    tab: 'Contract' },
        { label: 'Special Conditions',    status: specialStatus as any,    value: specialVal,    tab: 'Contract' },
      ],
    },
  ]

  function countIssues(statuses: string[]): string {
    const fails = statuses.filter(s => s === 'fail').length
    const warns = statuses.filter(s => s === 'warn').length
    if (fails > 0) return `⚠ ${fails} issue${fails !== 1 ? 's' : ''}`
    if (warns > 0) return `! ${warns} review`
    return ''
  }

  const iconMap = {
    pass:    { icon: '✓', iconCls: 'text-emerald-600', bg: 'bg-emerald-50',  valCls: 'text-emerald-700' },
    fail:    { icon: '✗', iconCls: 'text-red-600',     bg: 'bg-red-50',      valCls: 'text-red-600'     },
    warn:    { icon: '!', iconCls: 'text-amber-600',   bg: 'bg-amber-50',    valCls: 'text-amber-700'   },
    pending: { icon: '?', iconCls: 'text-gray-400',    bg: 'bg-gray-100',    valCls: 'text-gray-400'    },
  } as const

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {groups.map((group) => {
        const hasIssue = group.count.includes('⚠')
        const hasReview = group.count.includes('!')
        return (
          <div key={group.title} className="min-w-0">
            {/* Section header — clickable, prominent */}
            <button
              onClick={() => onNavigate(group.tab)}
              className="w-full text-left mb-3 group"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-wider text-gray-700 group-hover:text-gray-900 transition-colors">
                  {group.title}
                </p>
                {group.count && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    hasIssue ? 'bg-red-100 text-red-700' :
                    hasReview ? 'bg-amber-100 text-amber-700' :
                    group.count === 'Pending' ? 'bg-gray-100 text-gray-500' : ''
                  }`}>
                    {group.count}
                  </span>
                )}
              </div>
              <div className="mt-1 h-0.5 rounded-full bg-gray-200 group-hover:bg-gray-300 transition-colors" />
            </button>

            {/* Items */}
            <div className="space-y-2">
              {group.items.map((item) => {
                const ic = iconMap[item.status]
                return (
                  <button
                    key={item.label}
                    onClick={() => onNavigate(item.tab)}
                    className="w-full text-left hover:bg-gray-50 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors group/item"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${ic.bg} ${ic.iconCls}`}>
                        {ic.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700 group-hover/item:text-gray-900 leading-tight">{item.label}</p>
                        {item.value && (
                          <p className={`text-[11px] font-medium leading-tight mt-0.5 truncate ${ic.valCls}`}>
                            {item.value}
                          </p>
                        )}
                        {!item.value && item.status === 'pending' && (
                          <p className="text-[11px] text-gray-300 leading-tight mt-0.5">Contract pending</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ s32, contract, property, credits, onUpload, onNavigate, onDownload }: any) {
  const highFlags = s32?.red_flags?.filter((f: RedFlag) => f.severity === 'high') ?? []
  const medFlags  = s32?.red_flags?.filter((f: RedFlag) => f.severity === 'medium') ?? []
  const o = s32?.sections?.outgoings

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Col 1 — Due Diligence */}
      <div className="space-y-3">
        <ColHead icon="🏛" label="Due Diligence" sub="Land, Title & Planning" />
        {[...highFlags, ...medFlags].map((f: RedFlag, i: number) => <FlagCard key={i} flag={f} onDrill={() => onNavigate('S32 Review')} />)}
        {s32?.sections?.title_and_ownership && <SecCard label="Title & Ownership" section={s32.sections.title_and_ownership} />}
        {s32?.sections?.planning_and_zoning && <SecCard label="Planning & Zoning" section={s32.sections.planning_and_zoning} />}
        {s32?.sections?.building_permits && <SecCard label="Building Permits" section={s32.sections.building_permits} />}
        {!s32 && ['Title & Ownership', 'Planning & Zoning', 'Building Permits', 'Easements'].map(l => <PendCard key={l} label={l} />)}
        {!s32 && <UploadCta credits={credits} onUpload={onUpload} />}
      </div>

      {/* Col 2 — Financials */}
      <div className="space-y-3">
        <ColHead icon="💰" label="Financial Impact" sub="All money items" />
        {s32 ? (
          <>
            {o?.council_rates && (
              <div className={`rounded-xl border p-4 ${s32.red_flags?.some((f: RedFlag) => f.issue?.toLowerCase().includes('rates')) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-bold text-gray-900">Council Rates</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s32.red_flags?.some((f: RedFlag) => f.issue?.toLowerCase().includes('rates')) ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {s32.red_flags?.some((f: RedFlag) => f.issue?.toLowerCase().includes('rates')) ? 'Overdue' : '✓'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{o.council_rates}</p>
                {o.civ && <p className="text-xs text-gray-500 mt-0.5">CIV: {o.civ} · {o.council_name}</p>}
              </div>
            )}
            {o?.water_charges && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-bold text-gray-900 mb-1">Water Charges</p>
                <p className="text-sm text-gray-700">{o.water_charges}</p>
                {o.unpaid_water_balance && <p className="text-xs text-gray-500 mt-0.5">Balance: {o.unpaid_water_balance}</p>}
              </div>
            )}
            {s32.sections?.owners_corporation?.applicable && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-bold text-gray-900 mb-1">Owners Corporation</p>
                <p className="text-sm text-gray-700">{s32.sections.owners_corporation.annual_fee ?? 'See OC cert'}</p>
                {s32.sections.owners_corporation.oc_number && <p className="text-xs text-gray-500 mt-0.5">{s32.sections.owners_corporation.oc_number}</p>}
              </div>
            )}
            {(s32.positive_findings ?? []).length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wider">✓ Confirmed Clear</p>
                {s32.positive_findings.slice(0, 4).map((f: string, i: number) => (
                  <p key={i} className="text-xs text-emerald-800 flex items-start gap-1.5 mb-1"><span>✓</span>{f}</p>
                ))}
              </div>
            )}
            {property.price && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Stamp Duty Estimate</p>
                <p className="text-xl font-bold text-gray-900">${Math.round(property.price * 0.055).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Estimate only — verify with SRO Victoria</p>
              </div>
            )}
          </>
        ) : (
          <>
            {['Council Rates', 'OC Annual Levy', 'Land Tax', 'Water Charges', 'Windfall Gains Tax'].map(l => <PendCard key={l} label={l} />)}
          </>
        )}
      </div>

      {/* Col 3 — Before Signing */}
      <div className="space-y-3">
        <ColHead icon="✍️" label="Before Signing" sub="Contract & actions" />
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-gray-900">Cooling Off</p>
            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">3 business days</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">Statutory right under the Sale of Land Act 1962. Does not apply at auction. Can be waived in writing.</p>
        </div>

        {s32 && (s32.negotiation_points ?? []).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Negotiation Points</p>
            {s32.negotiation_points.slice(0, 3).map((p: string, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: REA }}>{i + 1}</span>
                <p className="text-xs text-gray-700">{p}</p>
              </div>
            ))}
            {s32.negotiation_points.length > 3 && (
              <button onClick={() => onNavigate('Negotiation Brief')} className="text-xs font-bold underline mt-1" style={{ color: REA }}>View all {s32.negotiation_points.length} →</button>
            )}
          </div>
        )}

        {!contract ? (
          <>
            {['Purchase Price & Deposit', 'Settlement Date', 'Special Conditions', 'Finance Clause', 'Vacant Possession'].map(l => <PendCard key={l} label={l} />)}
            {s32 && <UploadCta credits={credits} onUpload={onUpload} label="Re-upload to include Contract" />}
          </>
        ) : (
          <>
            {contract.sections?.price_and_deposit && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-bold text-gray-900 mb-2">Contract Terms</p>
                {contract.sections.price_and_deposit.purchase_price && <p className="text-xs text-gray-600 mb-1">Price: <span className="font-semibold text-gray-900">{contract.sections.price_and_deposit.purchase_price}</span></p>}
                {contract.sections.price_and_deposit.deposit_amount && <p className="text-xs text-gray-600 mb-1">Deposit: <span className="font-semibold text-gray-900">{contract.sections.price_and_deposit.deposit_amount}</span></p>}
                {contract.sections.settlement?.settlement_date && <p className="text-xs text-gray-600 mb-1">Settlement: <span className="font-semibold text-gray-900">{contract.sections.settlement.settlement_date}</span></p>}
                <button onClick={() => onNavigate('Contract Brief')} className="text-xs font-bold mt-2 underline" style={{ color: REA }}>View full contract review →</button>
              </div>
            )}
          </>
        )}



        {/* Conveyancer Pack download CTA */}
        {(s32 || contract) && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-sm font-bold text-gray-900 mb-1">📄 Conveyancer Pack</p>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Download a structured PDF summary of all findings — ready to hand to your conveyancer.
            </p>
            <button
              onClick={onDownload}
              className="text-xs font-bold text-white px-4 py-2 rounded-lg transition-colors w-full"
              style={{ background: '#E8001D' }}
            >
              ↓ Download PDF Pack
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── S32 Review Tab ───────────────────────────────────────────────────────────

type FilterType = 'all' | 'high' | 'medium' | 'low' | 'clear'

function S32ReviewTab({ s32, onUpload, credits }: { s32: S32Analysis | null; onUpload: () => void; credits: number }) {
  const [filter, setFilter] = useState<FilterType>('all')
  if (!s32) return <div className="space-y-4"><NoAnalysis msg="Upload your Section 32 document to see the AI review." /><UploadCta credits={credits} onUpload={onUpload} /></div>

  const allFlags = s32.red_flags ?? []
  const counts = { high: allFlags.filter(f => f.severity === 'high').length, medium: allFlags.filter(f => f.severity === 'medium').length, low: allFlags.filter(f => f.severity === 'low').length }
  const filtered = filter === 'all' ? allFlags : filter === 'clear' ? [] : allFlags.filter(f => f.severity === filter)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        {/* Filter pills */}
        <div className="bg-white rounded-xl border border-gray-200 p-1.5 flex gap-1">
          {(['all', 'high', 'medium', 'low', 'clear'] as FilterType[]).map(f => {
            const cnt = f === 'all' ? allFlags.length : f === 'clear' ? 0 : counts[f as 'high' | 'medium' | 'low']
            const label = f === 'all' ? `All (${allFlags.length})` : f === 'clear' ? '✅ Cleared' : `${f === 'high' ? '🔴' : f === 'medium' ? '🟡' : '🔵'} ${f.charAt(0).toUpperCase() + f.slice(1)} (${cnt})`
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 text-xs font-semibold px-2 py-1.5 rounded-lg transition-all whitespace-nowrap ${filter === f ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                style={filter === f ? { background: REA } : {}}>
                {label}
              </button>
            )
          })}
        </div>
        {filter === 'clear' ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><span className="text-3xl">✅</span><p className="text-gray-600 font-semibold mt-2">Mark items cleared after engaging your conveyancer.</p></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><span className="text-3xl">🎉</span><p className="text-gray-600 font-semibold mt-2">No {filter === 'all' ? '' : filter} flags</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((flag, i) => {
              const c = sev[flag.severity]
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{c.icon} {flag.severity.toUpperCase()} · {flag.category}</span>
                    <p className={`text-sm font-semibold ${c.text} mt-2 mb-2`}>{flag.issue}</p>
                    <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs flex-shrink-0">💡</span>
                      <p className="text-xs text-gray-700 leading-relaxed">{flag.recommendation}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: S32 sections */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-3">S32 Sections</p>
          {Object.entries(s32.sections ?? {}).map(([key, section]: [string, any]) => {
            if (!section) return null
            const sc = stc[section.status] ?? stc.not_provided
            const sectionNames: Record<string, string> = { title_and_ownership: 'Title & Ownership', planning_and_zoning: 'Planning & Zoning', easements_and_covenants: 'Easements & Covenants', building_permits: 'Building Permits', owners_corporation: 'Owners Corporation', outgoings: 'Outgoings', vendor_disclosure: 'Vendor Disclosure' }
            return (
              <div key={key} className="flex items-start gap-2 mb-3 pb-3 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
                <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${sc.bg} ${sc.color}`}>{sc.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{sectionNames[key] ?? key}</p>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">{section.summary}</p>
                </div>
              </div>
            )
          })}
        </div>
        {(s32.positive_findings ?? []).length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">✅ Positive Findings</p>
            {s32.positive_findings.map((f, i) => <p key={i} className="text-xs text-emerald-800 flex items-start gap-1.5 mb-1.5"><span>✓</span>{f}</p>)}
          </div>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-500 leading-relaxed">⚖️ {s32.disclaimer}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Risk Analysis Tab ────────────────────────────────────────────────────────

function RiskFlagCard({ flag, index }: { flag: RedFlag; index: number }) {
  const [open, setOpen] = useState(false)
  const cfg = {
    high:   { strip: '#E24B4A', badgeBg: '#FCEBEB', badgeText: '#A32D2D', label: 'High priority' },
    medium: { strip: '#EF9F27', badgeBg: '#FAEEDA', badgeText: '#854F0B', label: 'Worth reviewing' },
    low:    { strip: '#378ADD', badgeBg: '#E6F1FB', badgeText: '#185FA5', label: 'Good to know' },
  }[flag.severity]

  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
      
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{flag.category}</span>
          <span className="text-gray-400 text-xs flex-shrink-0 mt-0.5">{open ? '▾' : '▸'}</span>
        </div>
        <p className="text-sm font-semibold text-gray-800 mt-1 leading-snug">{flag.issue}</p>
        {open && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">What this means</p>
            <p className="text-xs text-gray-600 leading-relaxed">{flag.recommendation}</p>
          </div>
        )}
      </div>
    </button>
  )
}

function RiskAnalysisTab({ s32, contract, property }: any) {
  if (!s32) return <NoAnalysis msg="Upload your Section 32 to generate a risk analysis." />

  const allFlags = [...(s32.red_flags ?? []), ...(contract?.red_flags ?? [])]
  const highFlags = allFlags.filter(f => f.severity === 'high')
  const medFlags  = allFlags.filter(f => f.severity === 'medium')
  const lowFlags  = allFlags.filter(f => f.severity === 'low')

  // Plain-English summary driven by actual flag counts
  function summaryText(): string {
    const parts: string[] = []
    if (highFlags.length > 0) parts.push(`${highFlags.length} item${highFlags.length > 1 ? 's' : ''} need${highFlags.length === 1 ? 's' : ''} attention before you sign`)
    if (medFlags.length > 0)  parts.push(`${medFlags.length} worth discussing with your conveyancer`)
    if (lowFlags.length > 0)  parts.push(`${lowFlags.length} minor item${lowFlags.length > 1 ? 's' : ''} to be aware of`)
    if (parts.length === 0) return 'No issues were identified. This looks straightforward — still worth a conveyancer review before signing.'
    return parts.join(', ') + '. Click any item below to see what it means and what to do.'
  }

  return (
    <div className="space-y-4">

      {/* Summary bar — light, non-threatening */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Areas to review</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {highFlags.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FCEBEB', color: '#A32D2D' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />{highFlags.length} high
            </span>
          )}
          {medFlags.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FAEEDA', color: '#854F0B' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{medFlags.length} medium
            </span>
          )}
          {lowFlags.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#E6F1FB', color: '#185FA5' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />{lowFlags.length} low
            </span>
          )}
          {allFlags.length === 0 && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">✓ No issues found</span>
          )}
        </div>
        <p className="text-sm text-gray-500 leading-relaxed flex-1 min-w-[200px]">{summaryText()}</p>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* High */}
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">High priority</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FCEBEB', color: '#A32D2D' }}>{highFlags.length}</span>
          </div>
          <div className="space-y-2">
            {highFlags.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">None found</p>
              : highFlags.map((f, i) => <RiskFlagCard key={i} flag={f} index={i} />)
            }
          </div>
        </div>

        {/* Medium */}
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Worth reviewing</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FAEEDA', color: '#854F0B' }}>{medFlags.length}</span>
          </div>
          <div className="space-y-2">
            {medFlags.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">None found</p>
              : medFlags.map((f, i) => <RiskFlagCard key={i} flag={f} index={i} />)
            }
          </div>
        </div>

        {/* Low */}
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Good to know</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E6F1FB', color: '#185FA5' }}>{lowFlags.length}</span>
          </div>
          <div className="space-y-2">
            {lowFlags.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">None found</p>
              : lowFlags.map((f, i) => <RiskFlagCard key={i} flag={f} index={i} />)
            }
            {lowFlags.length > 0 && (
              <div className="border border-dashed border-gray-200 rounded-xl px-4 py-5 text-center mt-2">
                <p className="text-xs text-gray-400 leading-relaxed">Cleared items will appear here once you mark them resolved with your conveyancer.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-700 leading-relaxed">⚖️ <strong>Not legal advice.</strong> These are areas for further investigation. Always engage a licensed Victorian conveyancer before signing.</p>
      </div>
    </div>
  )
}

// ─── Negotiation Brief Tab ────────────────────────────────────────────────────

function NegotiationBriefTab({ s32, contract }: { s32: S32Analysis | null; contract: ContractAnalysis | null }) {
  if (!s32) return <NoAnalysis msg="Upload your Section 32 to generate a negotiation brief." />
  const points = [...(s32.negotiation_points ?? []), ...(contract?.negotiation_points ?? [])]
  const questions = [...(s32.conveyancer_questions ?? []), ...(contract?.conveyancer_questions ?? [])]
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">🤝 Negotiation Points</h2>
        <p className="text-xs text-gray-500 mb-4">Use when negotiating with the vendor or agent.</p>
        {points.map((p, i) => (
          <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3 mb-3">
            <span className="w-5 h-5 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: REA }}>{i + 1}</span>
            <p className="text-sm text-gray-700">{p}</p>
          </div>
        ))}
        {points.length === 0 && <p className="text-sm text-gray-400">No specific points identified.</p>}
      </div>
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">⚖️ Ask Your Conveyancer</h2>
          <p className="text-xs text-gray-500 mb-4">Bring these questions to your licensed conveyancer.</p>
          {questions.map((q, i) => (
            <div key={i} className="flex items-start gap-3 bg-blue-50 rounded-lg px-4 py-3 mb-3">
              <span className="text-blue-400 flex-shrink-0 font-bold text-sm">?</span>
              <p className="text-sm text-gray-700">{q}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-700 leading-relaxed">⚖️ {s32.disclaimer}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Contract Tab ─────────────────────────────────────────────────────────────

function ContractTab({ contract, credits, onUpload }: { contract: ContractAnalysis | null; credits: number; onUpload: () => void }) {
  if (!contract) return <div className="space-y-4"><NoAnalysis msg="Upload your combined property document to review the Contract of Sale." /><UploadCta credits={credits} onUpload={onUpload} /></div>

  const csl: Record<string, string> = { price_and_deposit: 'Price & Deposit', settlement: 'Settlement', special_conditions: 'Special Conditions', goods_and_chattels: 'Goods & Chattels', cooling_off: 'Cooling Off', gst_and_tax: 'GST & Tax', penalty_and_risk: 'Penalty & Risk' }
  return (
    <div className="space-y-5">
      {contract.risk_summary && <div className="bg-white rounded-xl border border-gray-100 p-5"><h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contract Summary</h2><p className="text-gray-700 text-sm leading-relaxed">{contract.risk_summary}</p></div>}
      {(contract.red_flags ?? []).length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">⚠️ Contract Red Flags ({contract.red_flags.length})</h2>
          <div className="space-y-3">
            {contract.red_flags.map((flag, i) => {
              const c = sev[flag.severity]
              return (
                <div key={i} className={`rounded-xl border p-5 ${c.bg} ${c.border}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{c.icon} {flag.severity.toUpperCase()} · {flag.category}</span>
                  <p className={`text-sm font-semibold ${c.text} mt-2 mb-2`}>{flag.issue}</p>
                  <div className="flex items-start gap-2 bg-white/60 rounded-lg px-3 py-2"><span className="text-xs">💡</span><p className="text-xs text-gray-700">{flag.recommendation}</p></div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(contract.sections ?? {}).map(([key, section]: [string, any]) => {
          if (!section) return null
          const sc = stc[section.status] ?? stc.not_provided
          return (
            <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">{csl[key] ?? key}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.icon} {section.status?.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{section.summary}</p>
              {section.purchase_price && <p className="text-xs text-gray-500">Price: <span className="font-semibold">{section.purchase_price}</span></p>}
              {section.deposit_amount  && <p className="text-xs text-gray-500">Deposit: <span className="font-semibold">{section.deposit_amount}</span></p>}
              {section.settlement_date && <p className="text-xs text-gray-500">Settlement: <span className="font-semibold">{section.settlement_date}</span></p>}
              {section.period          && <p className="text-xs text-gray-500">Period: <span className="font-semibold">{section.period}</span>{section.waived ? ' — WAIVED' : ''}</p>}
              {(section.conditions ?? []).length > 0 && section.conditions.map((c: any, ci: number) => (
                <div key={ci} className={`mt-2 text-xs rounded-lg px-3 py-2 ${c.risk_level === 'high' ? 'bg-red-50 text-red-700' : c.risk_level === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                  <span className="font-bold">{c.number}</span> — {c.summary}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500 leading-relaxed">⚖️ {contract.disclaimer}</p></div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ColHead({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return <div className="flex items-center gap-2 pb-1"><span className="text-lg">{icon}</span><div><p className="text-sm font-bold text-gray-900">{label}</p><p className="text-xs text-gray-400">{sub}</p></div></div>
}

function FlagCard({ flag, onDrill }: { flag: RedFlag; onDrill: () => void }) {
  const c = sev[flag.severity]
  return (
    <div className={`rounded-xl border border-gray-200 p-4 bg-white`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>{c.icon} {flag.severity} · {flag.category}</span>
      <p className={`text-sm font-semibold ${c.text} mt-1 mb-1.5`}>{flag.issue}</p>
      <p className="text-xs text-gray-600 leading-relaxed">{flag.recommendation}</p>
      <button onClick={onDrill} className={`text-xs font-bold mt-2 underline ${c.text}`}>View in S32 Review →</button>
    </div>
  )
}

function SecCard({ label, section }: { label: string; section: any }) {
  const isOk = section.status === 'clear'
  return (
    <div className={`rounded-xl border p-4 ${isOk ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{isOk ? '✓ Clear' : '! Review'}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{section.summary}</p>
    </div>
  )
}

function PendCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-gray-100 text-[9px] text-gray-400 font-bold flex items-center justify-center">?</span>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  )
}

function UploadCta({ credits, onUpload, label }: { credits: number; onUpload: () => void; label?: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed p-4 text-center" style={{ borderColor: REA }}>
      <p className="text-sm font-bold text-gray-900 mb-1">📄 {label ?? 'Upload S32 + Contract'}</p>
      <p className="text-xs text-gray-500 mb-3">Upload the combined PDF for a full review</p>
      <button onClick={onUpload} disabled={credits < 2} className="text-xs font-bold text-white px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: REA }}>
        Upload PDF · 2 credits
      </button>
      {credits < 2 && <p className="text-xs text-amber-600 mt-2">You have {credits} credit{credits !== 1 ? 's' : ''}. <Link href="/dashboard/credits" className="underline">Buy more →</Link></p>}
    </div>
  )
}

function NoAnalysis({ msg }: { msg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
      <span className="text-4xl">🦉</span>
      <h3 className="text-lg font-bold text-gray-900 mt-3">No Analysis Yet</h3>
      <p className="text-gray-500 text-sm mt-2">{msg}</p>
    </div>
  )
}

// ─── Property Scan Tab ────────────────────────────────────────────────────────

function ContractScanEmptyState({ credits, onUpload }: { credits: number; onUpload: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-8 py-10 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'#FFF0F0'}}>
          <span className="text-3xl">📄</span>
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Contract Scan</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
          Upload your Section 32 Vendor Statement and Contract of Sale for a full AI-powered legal review — title search, encumbrances, OC levies, risk flags and contract terms.
        </p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
          {[
            {icon:'🏛',label:'Title & ownership'},
            {icon:'⚠️',label:'Risk analysis'},
            {icon:'💰',label:'Outgoings & fees'},
            {icon:'📋',label:'Contract terms'},
          ].map(({icon,label}) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <span className="text-xl">{icon}</span>
              <p className="text-xs text-gray-600 font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          {credits >= 2 ? (
            <>
              <button onClick={onUpload}
                className="inline-flex items-center gap-2 text-sm font-bold text-white px-8 py-3 rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                style={{background:'#E8001D'}}>
                ↑ Upload S32 + Contract — 2 credits
              </button>
              <p className="text-xs text-gray-400 mt-2">{credits} credits available · Combined PDF preferred</p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-red-600">
                {credits === 1 ? '1 credit remaining — you need 2 for a document review' : 'No credits — top up to continue'}
              </p>
              <a href="/dashboard/buy-credits"
                className="inline-flex items-center gap-2 text-sm font-bold text-white px-8 py-3 rounded-xl"
                style={{background:'#E8001D'}}>
                💳 Buy credits
              </a>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        {[
          {icon:'📊',t:'Overview',d:'High-level summary with all key findings'},
          {icon:'🔍',t:'S32 Review',d:'Section-by-section vendor statement analysis'},
          {icon:'📋',t:'Contract Brief',d:'Price, deposit, settlement, special conditions'},
        ].map(({icon,t,d}) => (
          <div key={t} className="px-5 py-4 text-center">
            <span className="text-xl">{icon}</span>
            <p className="text-xs font-bold text-gray-800 mt-1.5 mb-0.5">{t}</p>
            <p className="text-xs text-gray-400">{d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}


function ConfirmedClearTab({ s32, contract }: { s32: S32Analysis | null; contract: ContractAnalysis | null }) {
  const allPositive = [
    ...(s32?.positive_findings || []),
    ...(contract?.positive_findings || []),
  ]
  const sections = s32?.sections || {}

  const clearAreas = [
    { label: 'Title & Ownership',     check: sections.title_and_ownership?.status === 'clear',      detail: sections.title_and_ownership?.volume_folio ? `Vol ${sections.title_and_ownership.volume_folio}` : null },
    { label: 'Planning & Zoning',     check: sections.planning_and_zoning?.status === 'clear',      detail: sections.planning_and_zoning?.zone || null },
    { label: 'Building Permits',      check: sections.building_permits?.status === 'clear',         detail: 'No permits in 7-year lookback' },
    { label: 'Vendor Disclosure',     check: sections.vendor_disclosure?.status === 'clear',        detail: 'All services connected' },
    { label: 'Land Tax',              check: !!sections.outgoings?.land_tax?.includes('$0'),        detail: sections.outgoings?.land_tax || null },
    { label: 'Windfall Gains Tax',    check: !!sections.outgoings?.windfall_gains_tax?.includes('$0') || !!sections.outgoings?.windfall_gains_tax?.includes('NIL'), detail: 'No liability identified' },
    { label: 'Caveats',               check: !sections.title_and_ownership?.encumbrances?.length,   detail: 'None recorded on title' },
    { label: 'GST Withholding',       check: true,                                                  detail: 'Residential sale — no GST withholding required' },
    { label: 'Cooling Off',           check: true,                                                  detail: '3 business day statutory right applies' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-900">✅ Confirmed Clear</h3>
          <p className="text-xs text-gray-500 mt-0.5">Areas reviewed with nothing of concern noted based on documents provided</p>
        </div>
        <div className="divide-y divide-gray-100">
          {clearAreas.map(({ label, check, detail }) => (
            <div key={label} className={`flex items-start gap-3 px-5 py-3.5 ${check ? '' : 'opacity-40'}`}>
              <span className={`flex-shrink-0 mt-0.5 font-bold text-sm ${check ? 'text-emerald-500' : 'text-gray-300'}`}>
                {check ? '✓' : '—'}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {allPositive.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-900">AI findings — nothing of concern</h3>
            <p className="text-xs text-gray-500 mt-0.5">Items explicitly reviewed and found to have no issues</p>
          </div>
          <div className="divide-y divide-gray-100">
            {allPositive.map((f: string, i: number) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <span className="text-emerald-500 font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
                <p className="text-sm text-gray-700 leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700 leading-relaxed">
          These items were reviewed and no issues were identified based on the documents provided. This does not constitute a legal clearance — always verify independently with your conveyancer before exchange.
        </p>
      </div>
    </div>
  )
}


function PropertyScanTab({ scan, scanning, onRunScan, property, credits }: {
  scan: any; scanning: boolean; onRunScan: () => void; property: any; credits: number
}) {
  const [summaryExpanded, setSummaryExpanded] = React.useState(false)
  const [filterSev, setFilterSev] = React.useState<string>('all')
  const [search, setSearch] = React.useState('')

  if (scanning) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'#FFF0F0'}}>
        <span className="text-2xl animate-pulse">🔍</span>
      </div>
      <h3 className="text-lg font-black text-gray-900 mb-2">Scanning property…</h3>
      <p className="text-gray-600 text-sm max-w-sm mx-auto leading-relaxed mb-6">AI is searching public data — planning zones, overlays, flood risk, school zones, sold history and more. This takes 30–60 seconds.</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {['🏛 Planning','⚠️ Risk','🏫 Schools','📅 History','📊 Suburb'].map((s,i) => (
          <span key={i} className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{s}</span>
        ))}
      </div>
    </div>
  )

  if (!scan) return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-8 py-10 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'#FFF0F0'}}>
          <span className="text-2xl">🗺️</span>
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Online Property Scan</h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">AI-powered pre-bid intelligence — planning zone, overlays, flood risk, school zones, sold history and suburb stats. No document upload needed.</p>
        {credits > 0 ? (
          <>
            <button onClick={onRunScan} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white px-6 py-2.5 rounded-xl" style={{background:'#E8001D'}}>
              🔍 Run Online Scan — 1 credit
            </button>
            <p className="text-xs text-gray-400 mt-2">You have {credits} credit{credits !== 1 ? 's' : ''} · Takes 30–60 seconds</p>
          </>
        ) : (
          <div className="mt-5 space-y-2">
            <p className="text-sm font-bold text-red-600">No credits remaining</p>
            <a href="/dashboard/buy-credits" className="inline-flex items-center gap-2 text-sm font-bold text-white px-6 py-2.5 rounded-xl" style={{background:'#E8001D'}}>
              💳 Buy credits to scan
            </a>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        {[{icon:'🏛',t:'Planning & Overlays',d:'Zone, heritage, design overlays'},{icon:'📅',t:'Sale History',d:'Past sales, rental, year built'},{icon:'🏫',t:'School Zones',d:'Zoned primary & secondary'}].map(({icon,t,d}) => (
          <div key={t} className="px-5 py-4 text-center">
            <span className="text-xl">{icon}</span>
            <p className="text-xs font-bold text-gray-800 mt-1.5 mb-0.5">{t}</p>
            <p className="text-xs text-gray-500">{d}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const findings = scan.findings || []
  const high   = findings.filter((f:any) => f.severity==='high')
  const medium = findings.filter((f:any) => f.severity==='medium')
  const low    = findings.filter((f:any) => f.severity==='low')
  const info   = findings.filter((f:any) => f.severity==='info')
  const sorted = [...high,...medium,...low,...info]
  const history = scan.property_history || []

  const positiveFindings = (scan.positive_findings || []).map((f:any) => ({
    severity: 'clear',
    category: 'Nothing noted',
    finding: typeof f === 'string' ? f : (f.finding || f.benefit || JSON.stringify(f)),
    implication: null,
  }))

  const allItems = filterSev === 'clear' ? positiveFindings :
    filterSev === 'all' ? [...sorted, ...positiveFindings] : sorted

  const filtered = allItems.filter((f:any) => {
    const matchSev = filterSev === 'all' || filterSev === 'clear' || f.severity === filterSev
    const q = search.toLowerCase()
    const matchSearch = !q || [f.finding,f.implication,f.category].some((v:any) => String(v||'').toLowerCase().includes(q))
    return matchSev && matchSearch
  })

  const sevCfg: Record<string,{bg:string;text:string;strip:string;label:string;activeBg:string}> = {
    high:   {bg:'bg-red-50',     text:'text-red-700',     strip:'#DC2626',label:'High priority',  activeBg:'#DC2626'},
    medium: {bg:'bg-amber-50',   text:'text-amber-700',   strip:'#D97706',label:'Worth reviewing', activeBg:'#D97706'},
    low:    {bg:'bg-blue-50',    text:'text-blue-700',    strip:'#3B82F6',label:'Good to know',    activeBg:'#3B82F6'},
    info:   {bg:'bg-gray-100',   text:'text-gray-600',    strip:'#9CA3AF',label:'Info',            activeBg:'#9CA3AF'},
    clear:  {bg:'bg-emerald-50', text:'text-emerald-700', strip:'#059669',label:'Nothing noted',   activeBg:'#059669'},
  }
  const riskBadge = (v:string) =>
    v==='high'?'bg-red-50 text-red-700 border-red-200':v==='medium'?'bg-amber-50 text-amber-700 border-amber-200':
    v==='none'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-gray-100 text-gray-500 border-gray-200'
  const historyColor: Record<string,string> = {built:'#6366F1',sold:'#059669',leased:'#D97706',listed:'#3B82F6',renovated:'#8B5CF6',other:'#9CA3AF'}
  const historyIcon: Record<string,string>  = {built:'🏗',sold:'💰',leased:'🔑',listed:'📋',renovated:'🔨',other:'📌'}
  const tv = (v:any) => typeof v==='string'?v:JSON.stringify(v)

  return (
    <div className="space-y-4">

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{background:'#E8001D'}}>Online Scan</span>
              {scan.scan_date && <span className="text-xs text-gray-500">{new Date(scan.scan_date).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}</span>}
              {scan.council && <span className="text-xs text-gray-500">· {scan.council}</span>}
            </div>
            <h2 className="text-lg font-black text-gray-900">{scan.address || property?.address}</h2>
          </div>
          {/* Re-scan button with credits info */}
          <div className="flex-shrink-0 text-right">
            <button onClick={onRunScan}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              ↺ Re-scan · 1 credit
            </button>
            <div className="flex items-center justify-end gap-2 mt-1.5">
              <span className="text-xs text-gray-500">{credits} credit{credits!==1?'s':''} left</span>
              <a href="/dashboard/buy-credits" className="text-xs font-bold text-red-600 hover:underline">Buy more</a>
            </div>
          </div>
        </div>

        {/* Summary — expandable */}
        {scan.summary && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className={`text-sm text-gray-700 leading-relaxed ${summaryExpanded ? '' : 'line-clamp-2'}`}>{scan.summary}</p>
            {scan.summary.length > 150 && (
              <button onClick={() => setSummaryExpanded(e => !e)}
                className="text-xs font-semibold text-red-600 hover:underline mt-1">
                {summaryExpanded ? '▲ Show less' : '▼ Read more'}
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            {sev:'high',  n:high.length,   label:'High priority',  color:'#DC2626',bg:'#FFF5F5'},
            {sev:'medium',n:medium.length, label:'Worth reviewing', color:'#D97706',bg:'#FFFBF0'},
            {sev:'low',   n:low.length+info.length, label:'Notes', color:'#6B7280',bg:'#F9FAFB'},
            {sev:'pos',   n:(scan.positive_findings||[]).length, label:'Nothing noted', color:'#059669',bg:'#F0FDF4'},
          ].map(({sev,n,label,color,bg}) => (
            <button key={label}
              onClick={() => sev !== 'pos' ? setFilterSev(filterSev===sev?'all':sev) : null}
              className={`rounded-xl p-3 text-center border transition-all ${
                sev !== 'pos' && filterSev===sev ? 'ring-2 ring-offset-1' : 'border-gray-100'
              } ${sev !== 'pos' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
              style={{background:n>0?bg:'#FAFAFA', ...(sev!=='pos'&&filterSev===sev?{ringColor:color}:{})}}>
              <p className="text-xl font-black leading-none" style={{color:n>0?color:'#D1D5DB'}}>{n}</p>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
            </button>
          ))}
        </div>
        {filterSev !== 'all' && (
          <p className="text-xs text-gray-400 mt-2">
            Filtering by <strong className="text-gray-600">{sevCfg[filterSev]?.label}</strong>
            <button onClick={() => setFilterSev('all')} className="ml-2 text-red-500 hover:underline font-semibold">Clear filter</button>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── LEFT: History → Schools → Findings ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* 1. Property History */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900">📅 Property History</h3>
              {history.length > 0 && <span className="text-xs text-gray-400">{history.length} events</span>}
            </div>
            {history.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-gray-600 mb-3">No history data in this scan.</p>
                <button onClick={onRunScan} className="text-xs font-bold px-4 py-2 rounded-lg text-white" style={{background:'#E8001D'}}>↺ Re-scan to get history</button>
              </div>
            ) : (
              <div className="px-5 py-5">
                <div className="relative pl-8">
                  <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200" />
                  <div className="space-y-5">
                    {history.map((h:any,i:number) => {
                      const ev = (h.event||'other').toLowerCase()
                      const col = historyColor[ev]||'#9CA3AF'
                      const ic = historyIcon[ev]||'📌'
                      return (
                        <div key={i} className="relative flex items-start gap-4">
                          <div className="absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-white shadow"
                               style={{background:i===0?col:'#F3F4F6',top:'2px'}}>{ic}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              {h.year && <span className="text-xs font-black text-white px-2 py-0.5 rounded" style={{background:col}}>{h.year}</span>}
                              <span className="text-sm font-semibold text-gray-900 capitalize">{h.event}</span>
                              {h.price && <span className="text-sm font-bold" style={{color:col}}>{h.price}</span>}
                            </div>
                            {h.detail && <p className="text-sm text-gray-600 leading-relaxed">{h.detail}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. School Zones */}
          {scan.education&&(scan.education.primary_school||scan.education.secondary_school)&&(
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900">🏫 School Zones</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {scan.education.primary_school&&(
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Primary</p>
                      <p className="text-sm text-gray-900">{scan.education.primary_school}</p>
                    </div>
                    {scan.education.primary_distance && (
                      <span className="text-xs font-semibold text-gray-500 flex-shrink-0 mt-4">{scan.education.primary_distance}</span>
                    )}
                  </div>
                )}
                {scan.education.secondary_school&&(
                  <div className="flex items-start justify-between gap-2 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Secondary</p>
                      <p className="text-sm text-gray-900">{scan.education.secondary_school}</p>
                    </div>
                    {scan.education.secondary_distance && (
                      <span className="text-xs font-semibold text-gray-500 flex-shrink-0 mt-4">{scan.education.secondary_distance}</span>
                    )}
                  </div>
                )}
                {scan.education.notes&&<p className="text-xs text-gray-400 pt-2 border-t border-gray-100">{scan.education.notes}</p>}
              </div>
            </div>
          )}

          {/* 3. Findings with sub-tabs */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" id="scan-findings">
            {/* Sub-tab row — like contract scan */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-3">
              <div className="flex overflow-x-auto">
                {[
                  {k:'all',    label:'All Findings',    count:sorted.length},
                  {k:'high',   label:'High priority',   count:high.length},
                  {k:'medium', label:'Worth reviewing',  count:medium.length},
                  {k:'low',    label:'Good to know',    count:low.length+info.length},
                  {k:'clear',  label:'Nothing noted',   count:(scan.positive_findings||[]).length},
                ].map(({k,label,count}) => (
                  <button key={k} onClick={() => setFilterSev(k)}
                    className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px flex items-center gap-1.5 ${
                      filterSev===k
                        ? k==='high' ? 'border-red-500 text-red-600'
                        : k==='medium' ? 'border-amber-500 text-amber-600'
                        : k==='low' ? 'border-blue-500 text-blue-600'
                        : k==='clear' ? 'border-emerald-500 text-emerald-600'
                        : 'border-gray-800 text-gray-800'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}>
                    {label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      filterSev===k ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'
                    }`}>{count}</span>
                  </button>
                ))}
              </div>
              <div className="flex-shrink-0 pl-2">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="text-xs text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 w-32 focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">{search ? `No findings matching "${search}"` : 'No findings in this category'}</p>
                <button onClick={() => {setFilterSev('all');setSearch('')}} className="text-xs text-red-600 hover:underline mt-1">Clear filters</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((f:any,i:number) => {
                  const c = sevCfg[f.severity]||sevCfg.info
                  return (
                    <div key={i} className="flex">
                      <div className="px-4 py-4 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
                          {f.category && <span className="text-xs text-gray-500">{tv(f.category)}</span>}
                        </div>
                        <p className="text-sm text-gray-900 leading-relaxed">{tv(f.finding)}</p>
                        {f.implication && (
                          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed pl-3 border-l-2 border-gray-200">{tv(f.implication)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4. Nothing of concern */}
          {(scan.positive_findings||[]).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900">✅ Nothing of concern noted</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {(scan.positive_findings||[]).map((f:any,i:number) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <span className="text-emerald-500 font-bold text-sm mt-0.5 flex-shrink-0">✓</span>
                    <p className="text-sm text-gray-700 leading-relaxed">{typeof f==='string'?f:(f.finding||f.benefit||f.item||JSON.stringify(f))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Planning, Risk, Suburb ── */}
        <div className="space-y-4">

          {/* Nearby Services — NEW box above planning */}
          {scan.nearby_services && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900">📍 Nearby Services</h4>
              </div>
              <div className="px-4 py-3 space-y-2">
                {(scan.nearby_services.transport || []).map((t:any, i:number) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-gray-700 flex items-center gap-1.5">
                      <span className="text-sm">{t.type === 'train' ? '🚂' : t.type === 'tram' ? '🚊' : t.type === 'bus' ? '🚌' : '🚇'}</span>
                      {t.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{t.distance}</span>
                  </div>
                ))}
                {(scan.nearby_services.shopping || []).map((s:any, i:number) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-gray-700 flex items-center gap-1.5">
                      <span className="text-sm">🛍️</span>{s.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{s.distance}</span>
                  </div>
                ))}
                {(scan.nearby_services.other || []).map((o:any, i:number) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-gray-700 flex items-center gap-1.5">
                      <span className="text-sm">{o.icon || '📌'}</span>{o.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{o.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planning Zone */}
          {scan.planning?.zone_code && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900">🏛 Planning Zone</h4>
              </div>
              <div className="px-4 py-4">
                <p className="text-2xl font-black text-gray-900">{scan.planning.zone_code}</p>
                {scan.planning.zone_name && <p className="text-sm text-gray-600 mt-0.5">{scan.planning.zone_name}</p>}
                {scan.planning.zone_implications && <p className="text-sm text-gray-600 leading-relaxed mt-2 pt-2 border-t border-gray-100">{scan.planning.zone_implications}</p>}
                {(scan.planning.overlays||[]).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-700 mb-2">Overlays</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scan.planning.overlays.map((o:any,i:number) => (
                        <span key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded-lg font-semibold">
                          {o.code||o.name}{o.name&&o.code&&<span className="font-normal text-amber-600"> — {o.name}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(scan.planning.overlays||[]).length===0 && <p className="text-sm text-emerald-600 mt-2">✓ No overlays detected</p>}
              </div>
            </div>
          )}

          {/* Risk Indicators */}
          {scan.environment && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900">⚠️ Risk Indicators</h4>
              </div>
              <div className="px-4 py-2">
                {[
                  {icon:'🌊',label:'Flood risk',    val:scan.environment.flood_risk,        det:scan.environment.flood_detail},
                  {icon:'🔥',label:'Bushfire risk', val:scan.environment.bushfire_risk,      det:scan.environment.bushfire_detail},
                  {icon:'☣️',label:'Contamination', val:scan.environment.contamination_risk, det:scan.environment.contamination_detail},
                ].map(({icon,label,val,det}) => (
                  <div key={label} className="py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-700">{icon} {label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${riskBadge(val||'unknown')}`}>{val||'Unknown'}</span>
                    </div>
                    {det && <p className="text-sm text-gray-500 leading-relaxed mt-1">{det}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suburb Profile */}
          {scan.suburb_profile?.median_house_price&&(
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900">📊 Suburb Profile</h4>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-2">
                {[
                  {k:'Median house',v:scan.suburb_profile.median_house_price},
                  {k:'Median unit', v:scan.suburb_profile.median_unit_price},
                  {k:'12m growth',  v:scan.suburb_profile.price_growth_12m},
                  {k:'Rental yield',v:scan.suburb_profile.rental_yield},
                ].filter(r=>r.v).map(({k,v})=>(
                  <div key={k} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                    <p className="text-sm font-bold text-gray-900">{v}</p>
                  </div>
                ))}
              </div>
              {scan.suburb_profile.data_date&&<p className="text-xs text-gray-400 px-4 pb-3">Data: {scan.suburb_profile.data_date}</p>}
            </div>
          )}

          {/* Sources */}
          {(scan.data_sources||[]).length > 0 && (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">🔗 Sources consulted</p>
              {(scan.data_sources||[]).slice(0,5).map((src:any,i:number) => {
                const st = typeof src==='string'?src:(src.url||src.name||src.source||JSON.stringify(src))
                return <p key={i} className="text-xs text-gray-500 truncate mb-0.5">· {st}</p>
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}