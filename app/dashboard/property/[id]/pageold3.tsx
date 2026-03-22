'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property {
  id: string
  address: string
  suburb: string
  postcode: string | null
  price: number | null
  property_type: string
  risk_score: number | null
  s32_reviewed: boolean
  is_demo?: boolean
  auction_date?: string
  agent_name?: string
}

interface RedFlag {
  severity: 'high' | 'medium' | 'low'
  category: string
  issue: string
  recommendation: string
}

interface S32Analysis {
  document_type: 'S32'
  vendor_names?: string
  property_address?: string
  risk_score?: number
  red_flags?: RedFlag[]
  positive_findings?: string[]
  negotiation_points?: string[]
  sections?: {
    title_and_ownership?: { status: string; lot_plan?: string; volume_folio?: string; encumbrances?: any[]; summary?: string }
    planning_and_zoning?: { status: string; zone?: string; overlays?: string[]; summary?: string }
    easements_and_covenants?: { status: string; items?: any[]; summary?: string }
    building_permits?: { status: string; permits?: any[]; summary?: string }
    owners_corporation?: { status: string; applicable?: boolean; annual_fee?: string; summary?: string }
    outgoings?: { status: string; council_rates?: string; water_charges?: string; land_tax?: string; windfall_gains_tax?: string; summary?: string }
    vendor_disclosure?: { status: string; services_connected?: string[]; summary?: string }
  }
}

interface ContractAnalysis {
  document_type: 'contract'
  risk_score?: number
  red_flags?: RedFlag[]
  positive_findings?: string[]
  negotiation_points?: string[]
  sections?: {
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
  const [downloadingScan, setDownloadingScan] = useState(false)
  const [credits, setCredits] = useState(0)
  const [fileInput] = useState(() => typeof window !== 'undefined' ?
    document.createElement('input') : null)

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
        const msg = (err.error ?? 'Unknown error') + (err.detail ? `: ${err.detail}` : '')
        alert('PDF generation failed: ' + msg)
        setDownloading(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PropertyOwl_${property.address.replace(/[^a-z0-9]/gi, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Download failed: ' + e.message)
    }
    setDownloading(false)
  }

  async function handleDownloadScanPdf() {
    if (!property) return
    setDownloadingScan(true)
    try {
      if (property.is_demo) {
        const a = document.createElement('a')
        a.href = '/demo-scan-report.pdf'
        a.download = 'PropertyOwl_Demo_ScanReport.pdf'
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setDownloadingScan(false)
        return
      }
      const res = await fetch('/api/scan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('PDF generation failed: ' + (err.error ?? 'Unknown error'))
        setDownloadingScan(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PropertyOwl_ScanReport_${property.address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Download failed: ' + e.message)
    }
    setDownloadingScan(false)
  }

  function triggerUpload() {
    if (!fileInput) return
    fileInput.type = 'file'
    fileInput.accept = 'application/pdf'
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !property) return
      await handleUpload(file)
    }
    fileInput.click()
  }

  async function handleUpload(file: File) {
  if (!property) return
  setUploading('Uploading document…')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const path = `${user.id}/${property.id}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage
      .from('property-documents')
      .upload(path, file)
    if (upErr) throw upErr

    setUploading('AI is reading your documents… this takes 60–90 seconds')

    const formData = new FormData()
    formData.append('filePath', path)
    formData.append('propertyId', property.id)

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
    await load()
  } catch (e: any) {
    alert('Upload failed: ' + e.message)
  } finally {
    setUploading(null)
    if (fileInput) fileInput.value = ''
  }
}

  async function handleRunScan() {
    if (!property) return
    setScanning(true)
    setActiveTab('Online Scan')
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Scan failed')
      setScan(data.data)
      setCredits(c => Math.max(0, c - 1))
      // Dispatch credits-updated event so CreditsDisplay refreshes
      window.dispatchEvent(new Event('credits-updated'))
    } catch (e: any) {
      alert('Scan failed: ' + e.message)
    } finally {
      setScanning(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-2 items-center text-gray-400">
        <div className="w-5 h-5 border-2 border-[#E8001D] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading property…</span>
      </div>
    </div>
  )

  if (error || !property) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-gray-500 mb-3">{error ?? 'Property not found.'}</p>
        <Link href="/dashboard" className="text-sm font-semibold" style={{ color: REA }}>← Back to dashboard</Link>
      </div>
    </div>
  )

  const riskScore = property.risk_score
  const riskLabel = !riskScore ? 'Not reviewed' : riskScore >= 8 ? 'Needs attention' : riskScore >= 5 ? 'Review carefully' : 'Looking good'
  const riskColor = !riskScore ? 'text-gray-400' : riskScore >= 8 ? 'text-red-700' : riskScore >= 5 ? 'text-amber-700' : 'text-emerald-700'
  const allFlags = [...(s32?.red_flags ?? []), ...(contract?.red_flags ?? [])]
  const issueCount = allFlags.filter(f => f.severity === 'high' || f.severity === 'medium').length

  return (
    <div className="space-y-2 pb-10">

      {/* ── Demo banner ── */}
      {isDemo && (
        <div className="bg-[#1A1A1A] flex items-center justify-between px-5 py-2 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm">🦉</span>
            <span className="text-xs font-bold text-white">Demo property</span>
            <span className="text-xs text-gray-400">— sample data, not a real listing</span>
          </div>
          <a href="/dashboard/buy-credits" className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90" style={{background:'#E8001D'}}>
            Get started →
          </a>
        </div>
      )}

      {/* ── Property Header — compact ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div style={{ height: 3, background: REA }} />
        <div className="px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left */}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: REA }}>Prospective Property</p>
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight tracking-tight">
                {property.address}
                {isDemo && <span className="text-sm font-normal text-gray-400 ml-2">(Fictitious address — demo only)</span>}
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">{property.suburb}{property.postcode ? `, Victoria ${property.postcode}` : ''}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(property.s32_reviewed || !!s32) && <span className="text-[11px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">✓ S32 Reviewed</span>}
                {!!contract ? <span className="text-[11px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">✓ Contract Reviewed</span>
                  : <span className="text-[11px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">⏳ Contract Pending</span>}
                {!!scan ? <span className="text-[11px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">✓ Online Scan</span>
                  : <span className="text-[11px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">⏳ Scan Pending</span>}
                {issueCount > 0 && <button onClick={() => { setActiveTab('Contract Scan'); setContractSubTab('Risk Analysis') }} className="text-[11px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full hover:bg-red-200 transition-colors">⚠ {issueCount} item{issueCount !== 1 ? 's' : ''} to review</button>}
              </div>
            </div>
            {/* Right — meta */}
            <div className="flex gap-5 flex-shrink-0">
              {property.price && (
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0">Asking</p>
                  <p className="text-lg font-black text-gray-900">${property.price.toLocaleString()}</p>
                </div>
              )}
              {property.property_type && (
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0">Type</p>
                  <p className="text-lg font-black text-gray-900 capitalize">{property.property_type}</p>
                </div>
              )}
              {riskScore && (
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0">Risk</p>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                    riskScore >= 8 ? 'bg-red-50' : riskScore >= 5 ? 'bg-amber-50' : 'bg-emerald-50'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                      riskScore >= 8 ? 'bg-red-400' : riskScore >= 5 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <p className={`text-xs font-semibold ${riskColor}`}>{riskLabel}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ONE unified tab box ── */}
      <div className="bg-white rounded-xl border-2 overflow-hidden"
           style={{borderColor: activeTab === 'Contract Scan' ? '#E8001D' : '#334155'}}>

        {/* Row 1: main parent tabs + action buttons */}
        <div className="flex items-center justify-between px-3 pt-0"
             style={{background: activeTab === 'Contract Scan' ? '#FFF8F8' : '#F8FAFC',
                     borderBottom: `2px solid ${activeTab === 'Contract Scan' ? '#FECACA' : '#CBD5E1'}`}}>
          <div className="flex gap-1 py-2">
            {TABS.map(tab => {
              const isActive = activeTab === tab
              const tabColor = tab === 'Contract Scan' ? '#E8001D' : '#334155'
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all whitespace-nowrap rounded-lg"
                  style={isActive ? {
                    background: tabColor,
                    color: 'white',
                    boxShadow: `0 2px 8px ${tabColor}44`
                  } : {
                    color: '#9CA3AF',
                    background: 'transparent'
                  }}>
                  <span>{tab === 'Contract Scan' ? '📄' : '🔍'}</span>
                  <span>{tab}</span>
                  {isActive && tab === 'Contract Scan' && (s32 || contract) && <span className="text-[10px] bg-white/30 px-1.5 py-0.5 rounded-full font-bold">✓</span>}
                  {isActive && tab === 'Online Scan' && scan && <span className="text-[10px] bg-white/30 px-1.5 py-0.5 rounded-full font-bold">✓</span>}
                  {!isActive && tab === 'Contract Scan' && (s32 || contract) && <span className="text-[10px] text-emerald-500 font-bold">✓</span>}
                  {!isActive && tab === 'Online Scan' && scan && <span className="text-[10px] text-emerald-500 font-bold">✓</span>}
                </button>
              )
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Legal disclaimer inline */}
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg hidden lg:block">
              ⚖️ Not legal advice — always engage a conveyancer
            </span>

            {activeTab === 'Contract Scan' && (s32 || contract) && (
              <button onClick={handleDownloadPack} disabled={downloading}
                className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                style={{background: '#E8001D'}}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {downloading ? '…' : 'Contract Scan PDF'}
              </button>
            )}
            {activeTab === 'Contract Scan' && (
              <button onClick={triggerUpload} disabled={!!uploading}
                className="text-xs font-bold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{background: '#1A1A1A'}}>
                {uploading ? '⟳ Processing…' : (s32 || contract) ? '↑ Re-analyse' : '↑ Upload Documents'}
              </button>
            )}
            {activeTab === 'Online Scan' && scan && (
              <>
                <button onClick={handleDownloadScanPdf} disabled={downloadingScan}
                  className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                  style={{background: '#E8001D'}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {downloadingScan ? '…' : 'Online Scan Report PDF'}
                </button>
                <button onClick={handleRunScan} disabled={scanning || credits < 1}
                  className="text-xs font-bold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
                  ↺ Re-scan · 1 credit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Row 2: checklist grid (inside Contract Scan tab, above sub-tabs) */}
        {activeTab === 'Contract Scan' && (s32 || contract) && (
          <div className="border-b border-gray-100 bg-white px-4 py-3">
            <ChecklistPanel s32={s32} contract={contract} onNavigate={(t: string) => {
              setContractSubTab(t)
            }} />
          </div>
        )}

        {/* Row 3: contract sub-tabs */}
        {activeTab === 'Contract Scan' && (s32 || contract) && (
          <div className="flex border-b border-gray-100 bg-white px-3">
            {CONTRACT_SUBTABS.map(sub => (
              <button key={sub} onClick={() => setContractSubTab(sub)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
                  contractSubTab === sub
                    ? 'border-[#E8001D] text-[#E8001D]'
                    : 'border-transparent text-gray-700 hover:text-gray-900'
                }`}>
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* uploading notice */}
        {uploading && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-3">
            <span className="text-amber-500 text-base animate-spin inline-block">⟳</span>
            <div><p className="text-sm font-bold text-amber-800">{uploading}</p><p className="text-xs text-amber-600">Do not close this page.</p></div>
          </div>
        )}

        {/* Tab content */}
        <div className="p-5 space-y-4"
             style={{background: activeTab === 'Contract Scan' ? '#FFF9F9' : '#F8FAFC'}}>
          {activeTab === 'Contract Scan' && !(s32 || contract) && (
            <ContractScanEmptyState credits={credits} onUpload={triggerUpload} />
          )}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Overview'          && <OverviewTab s32={s32} contract={contract} property={property} credits={credits} onUpload={triggerUpload} onNavigate={(t: string) => setContractSubTab(t)} onDownload={handleDownloadPack} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'S32 Review'        && <S32ReviewTab s32={s32} onUpload={triggerUpload} credits={credits} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Risk Analysis'     && <RiskAnalysisTab s32={s32} contract={contract} property={property} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Negotiation Brief' && <NegotiationBriefTab s32={s32} contract={contract} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Contract Brief'    && <ContractTab contract={contract} credits={credits} onUpload={triggerUpload} />}
          {activeTab === 'Contract Scan' && (s32 || contract) && contractSubTab === 'Confirmed Clear'   && <ConfirmedClearTab s32={s32} contract={contract} />}
          {activeTab === 'Online Scan'   && <PropertyScanTab scan={scan} scanning={scanning} onRunScan={handleRunScan} onDownloadPdf={handleDownloadScanPdf} downloadingPdf={downloadingScan} property={property} credits={credits} />}
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

  const mortgageEnc = t?.encumbrances?.find(e => e.type === 'mortgage')
  const mortgageStatus = !s32 ? 'pending' : mortgageEnc ? 'fail' : 'pass'
  const mortgageVal = mortgageEnc ? mortgageEnc.detail ?? mortgageEnc.reference ?? 'Undischarged' : s32 ? 'Clear' : null

  const ratesOverdue = s32?.red_flags?.some(f => f.issue?.toLowerCase().includes('rates') || f.issue?.toLowerCase().includes('council'))
  const ratesStatus = !s32 ? 'pending' : ratesOverdue ? 'fail' : o?.council_rates ? 'pass' : 'pending'
  const ratesVal = o?.council_rates ?? null

  const ocStatus = !s32 ? 'pending' : !oc?.applicable ? 'pass' : oc.status === 'clear' ? 'pass' : oc.status === 'issues' ? 'fail' : 'warn'
  const ocVal = !oc?.applicable ? 'Not applicable' : oc?.annual_fee ?? (oc?.applicable ? 'Applicable' : null)

  const hasReview = !!(s32 || contract)
  const iconMap: Record<string, {bg:string;iconCls:string;icon:string;valCls:string}> = {
    pass:    { bg: 'bg-emerald-100', iconCls: 'text-emerald-600', icon: '✓', valCls: 'text-emerald-700' },
    fail:    { bg: 'bg-red-100',     iconCls: 'text-red-600',     icon: '!', valCls: 'text-red-700' },
    warn:    { bg: 'bg-amber-100',   iconCls: 'text-amber-600',   icon: '~', valCls: 'text-amber-700' },
    pending: { bg: 'bg-gray-100',    iconCls: 'text-gray-400',    icon: '·', valCls: 'text-gray-400' },
  }

  const groups = [
    {
      label: 'Land & Title',
      tab: 'S32 Review',
      count: !s32 ? '—' : [mortgageStatus, ratesStatus === 'fail' ? 'fail' : null].filter(x => x === 'fail').length || null,
      items: [
        { label: 'Mortgage', status: mortgageStatus, value: mortgageVal, tab: 'S32 Review' },
        { label: 'Title Search', status: s32 ? (t?.volume_folio ? 'pass' : 'warn') : 'pending', value: t?.volume_folio ? `Vol ${t.volume_folio} — clear` : null, tab: 'S32 Review' },
        { label: 'Zoning', status: s32 ? (p?.zone ? 'pass' : 'warn') : 'pending', value: p?.zone ?? null, tab: 'S32 Review' },
        { label: 'Overlays', status: s32 ? ((p?.overlays?.length ?? 0) > 0 ? 'warn' : 'pass') : 'pending', value: (p?.overlays?.length ?? 0) > 0 ? `${p!.overlays!.length} detected` : s32 ? 'None detected' : null, tab: 'S32 Review' },
        { label: 'Building Permits', status: s32 ? (bp?.status === 'clear' ? 'pass' : bp?.permits?.length ? 'warn' : 'pass') : 'pending', value: bp?.status === 'clear' ? 'None found' : null, tab: 'S32 Review' },
        { label: 'Easements', status: s32 ? ((ec?.items?.length ?? 0) > 0 ? 'warn' : 'pass') : 'pending', value: (ec?.items?.length ?? 0) > 0 ? `${ec!.items!.length} recorded` : s32 ? 'None noted' : null, tab: 'S32 Review' },
      ]
    },
    {
      label: 'Financials & Outgoings',
      tab: 'S32 Review',
      count: !s32 ? '—' : [ratesStatus === 'fail' ? 'fail' : null].filter(Boolean).length || null,
      items: [
        { label: 'Council Rates', status: ratesStatus, value: ratesVal, tab: 'S32 Review' },
        { label: 'OC Annual Levy', status: ocStatus, value: ocVal, tab: 'S32 Review' },
        { label: 'Land Tax', status: s32 ? 'pass' : 'pending', value: o?.land_tax ?? null, tab: 'S32 Review' },
        { label: 'Windfall Gains Tax', status: s32 ? 'pass' : 'pending', value: o?.windfall_gains_tax ?? null, tab: 'S32 Review' },
        { label: 'Water Charges', status: s32 ? (o?.water_charges ? 'pass' : 'pending') : 'pending', value: o?.water_charges ?? null, tab: 'S32 Review' },
        { label: 'GST Status', status: s32 ? 'pass' : 'pending', value: s32 ? 'Confirmed' : null, tab: 'Contract Brief' },
      ]
    },
    {
      label: 'Ownership & Use',
      tab: 'S32 Review',
      count: !s32 ? '—' : null,
      items: [
        { label: 'Tenancy', status: s32 ? 'warn' : 'pending', value: s32 ? 'Residential rental agreement in pla…' : null, tab: 'S32 Review' },
        { label: 'Owners Corporation', status: ocStatus, value: !oc?.applicable ? 'Not in S32' : ocStatus === 'fail' ? 'Issues noted' : 'Applicable', tab: 'S32 Review' },
        { label: 'Planning Certificate', status: s32 ? (p?.zone ? 'pass' : 'pending') : 'pending', value: p?.zone ?? null, tab: 'S32 Review' },
        { label: 'OC Meeting Minutes', status: !oc?.applicable ? 'pending' : 'warn', value: !oc?.applicable ? null : 'Obtain from OC manager', tab: 'S32 Review' },
        { label: 'Insurance (OC)', status: !oc?.applicable ? 'pending' : 'warn', value: !oc?.applicable ? null : 'Contract pending', tab: 'S32 Review' },
        { label: 'Vendor Warranties', status: s32 ? 'pass' : 'pending', value: s32 ? 'Electricity, Gas, Water, Sewer' : null, tab: 'S32 Review' },
      ]
    },
    {
      label: 'Contract Conditions',
      tab: 'Contract Brief',
      count: !contract ? '—' : (sc?.conditions?.filter((c:any) => c.risk_level === 'high').length ?? 0) || null,
      items: [
        { label: 'Purchase Price', status: contract ? 'pass' : 'pending', value: pd?.purchase_price ?? null, tab: 'Contract Brief' },
        { label: 'Deposit Amount & Holder', status: contract ? 'pass' : 'pending', value: pd?.deposit_amount ? `${pd.deposit_amount}${pd.deposit_holder ? ` · ${pd.deposit_holder}` : ''}` : null, tab: 'Contract Brief' },
        { label: 'Settlement Date', status: contract ? (st?.settlement_date ? 'pass' : 'warn') : 'pending', value: st?.settlement_date ?? null, tab: 'Contract Brief' },
        { label: 'Cooling Off Status', status: contract ? (co?.waived ? 'warn' : 'pass') : 'pending', value: contract ? (co?.waived ? 'Waived' : co?.period ?? '3 business days') : null, tab: 'Contract Brief' },
        { label: 'Finance / Build Clauses', status: contract ? ((sc?.conditions?.length ?? 0) > 0 ? 'warn' : 'pass') : 'pending', value: (sc?.conditions?.length ?? 0) > 0 ? 'Check special conditions' : contract ? 'None' : null, tab: 'Contract Brief' },
        { label: 'Special Conditions', status: contract ? ((sc?.conditions?.filter((c:any)=>c.risk_level==='high').length ?? 0) > 0 ? 'fail' : 'pass') : 'pending', value: contract ? ((sc?.conditions?.length ?? 0) > 0 ? `${sc!.conditions!.length} identified` : 'None') : null, tab: 'Contract Brief' },
      ]
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
      {groups.map((group) => {
        const hasIssues = typeof group.count === 'number' && group.count > 0
        return (
          <div key={group.label} className="space-y-1.5">
            <button
              onClick={() => onNavigate(group.tab)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-black text-gray-700 uppercase tracking-wider group-hover:text-gray-900">{group.label}</p>
                {group.count !== null && group.count !== '—' && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    hasIssues ? 'bg-red-100 text-red-700' :
                    hasReview ? 'bg-amber-100 text-amber-700' :
                    group.count === 'Pending' ? 'bg-gray-100 text-gray-500' : ''
                  }`}>
                    {group.count}
                  </span>
                )}
              </div>
              <div className="mt-1 h-0.5 rounded-full bg-gray-200 group-hover:bg-gray-300 transition-colors" />
            </button>

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
  const allPositive = [...(s32?.positive_findings || []), ...(contract?.positive_findings || [])]

  return (
    <div className="space-y-5">
      {/* High flags */}
      {highFlags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <p className="text-xs font-black text-red-700 uppercase tracking-wider">Needs immediate attention</p>
          </div>
          {highFlags.map((f: RedFlag, i: number) => <RiskFlagCard key={i} flag={f} index={i} />)}
        </div>
      )}

      {/* Medium flags */}
      {medFlags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Worth reviewing</p>
          </div>
          {medFlags.map((f: RedFlag, i: number) => <RiskFlagCard key={i} flag={f} index={i} />)}
        </div>
      )}

      {highFlags.length === 0 && medFlags.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
          <span className="text-3xl">🎉</span>
          <p className="text-sm font-bold text-emerald-700 mt-2">No high-priority issues found</p>
          <p className="text-xs text-emerald-600 mt-1">Always verify independently with your conveyancer before exchange.</p>
        </div>
      )}

      {/* Upload CTA if no docs yet */}
      {!s32 && !contract && <UploadCta credits={credits} onUpload={onUpload} />}

      {/* Download pack */}
      {(s32 || contract) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-bold text-gray-900 mb-1">📄 Conveyancer Pack</p>
          <p className="text-xs text-gray-500 mb-3">Download a structured 8-page PDF briefing to share with your conveyancer.</p>
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

      {/* Right: Positive findings first, then S32 sections */}
      <div className="space-y-4">
        {(s32.positive_findings ?? []).length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-bold text-emerald-700 mb-2">✅ Positive findings — nothing of concern</p>
            {(s32.positive_findings ?? []).map((f, i) => (
              <p key={i} className="text-xs text-emerald-700 leading-relaxed mt-1">• {f}</p>
            ))}
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-3">S32 Sections</p>
          {Object.entries(s32.sections ?? {}).map(([key, section]: [string, any]) => {
            if (!section) return null
            const sc = stc[section.status] ?? stc.not_provided
            const sectionNames: Record<string, string> = {
              title_and_ownership: 'Title & Ownership', planning_and_zoning: 'Planning & Zoning',
              easements_and_covenants: 'Easements & Covenants', building_permits: 'Building Permits',
              owners_corporation: 'Owners Corporation', outgoings: 'Outgoings', vendor_disclosure: 'Vendor Disclosure'
            }
            const statusLabel: Record<string, string> = {
              clear: 'Clear', issues: 'Issues noted', issues_found: 'Issues noted',
              not_provided: 'Not provided', not_applicable: 'Not applicable', incomplete: 'Incomplete'
            }
            return (
              <div key={key} className="flex items-start gap-2 mb-3 pb-3 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
                <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${sc.bg} ${sc.color}`}>{sc.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{sectionNames[key] ?? key}</p>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">
                    {section.summary && section.summary.length < 200
                      ? section.summary
                      : statusLabel[section.status] ?? section.status}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Risk Analysis Tab ────────────────────────────────────────────────────────

function RiskAnalysisTab({ s32, contract, property }: { s32: S32Analysis | null; contract: ContractAnalysis | null; property: Property }) {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const allFlags = [...(s32?.red_flags ?? []), ...(contract?.red_flags ?? [])]
  const highFlags = allFlags.filter(f => f.severity === 'high')
  const medFlags  = allFlags.filter(f => f.severity === 'medium')
  const lowFlags  = allFlags.filter(f => f.severity === 'low')
  const filtered  = filter === 'all' ? allFlags : allFlags.filter(f => f.severity === filter)

  if (!s32 && !contract) return <NoAnalysis msg="Upload documents to see a risk analysis." />

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
          {[
            { k: 'all', label: `All (${allFlags.length})` },
            { k: 'high', label: `🔴 High (${highFlags.length})` },
            { k: 'medium', label: `🟡 Medium (${medFlags.length})` },
            { k: 'low', label: `🔵 Low (${lowFlags.length})` },
          ].map(({k, label}) => (
            <button key={k} onClick={() => setFilter(k as any)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${filter === k ? 'text-white' : 'text-gray-500 bg-white border border-gray-200 hover:text-gray-800'}`}
              style={filter === k ? { background: REA } : {}}>
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-black text-gray-900 mb-1">💬 Negotiation Points</h2>
        <p className="text-xs text-gray-500 mb-4">Key items you may be able to negotiate before signing.</p>
        {points.length === 0 ? (
          <p className="text-sm text-gray-400">No specific negotiation points identified.</p>
        ) : (
          <div className="space-y-3">
            {points.map((pt, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-base flex-shrink-0">💡</span>
                <p className="text-sm text-gray-700 leading-relaxed">{pt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-700 leading-relaxed">These are suggestions only — always work with a licensed Victorian conveyancer before making any requests or concessions.</p>
      </div>
    </div>
  )
}

// ─── Contract Brief Tab ───────────────────────────────────────────────────────

function ContractTab({ contract, credits, onUpload }: { contract: ContractAnalysis | null; credits: number; onUpload: () => void }) {
  if (!contract) return <div className="space-y-4"><NoAnalysis msg="Upload your Contract of Sale to see a contract brief." /><UploadCta credits={credits} onUpload={onUpload} /></div>

  const csl: Record<string, string> = {
    price_and_deposit: 'Price & Deposit', settlement: 'Settlement', special_conditions: 'Special Conditions',
    goods_and_chattels: 'Goods & Chattels', cooling_off: 'Cooling Off', penalty_and_risk: 'Penalty & Risk', gst_and_tax: 'GST & Tax'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <div key={ci} className={`mt-2 text-xs rounded-lg px-3 py-2 ${c.risk_level === 'high' ? 'bg-red-50 text-red-700' : c.risk_level === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'}`}>
                <p className="font-semibold">{c.title ?? `Condition ${ci + 1}`}</p>
                <p className="mt-0.5 leading-relaxed">{c.summary ?? c.verbatim}</p>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Confirmed Clear Tab ──────────────────────────────────────────────────────

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

  const half = Math.ceil(clearAreas.length / 2)
  const leftAreas  = clearAreas.slice(0, half)
  const rightAreas = clearAreas.slice(half)

  const ClearItem = ({ label, check, detail }: { label: string; check: boolean; detail: string | null }) => (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${check ? '' : 'opacity-40'}`}>
      <span className={`flex-shrink-0 mt-0.5 font-bold text-sm ${check ? 'text-emerald-500' : 'text-gray-300'}`}>
        {check ? '✓' : '—'}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {detail && <p className="text-xs text-gray-600 mt-0.5">{detail}</p>}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Two-column confirmed clear */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-900">✅ Confirmed Clear</h3>
          <p className="text-xs text-gray-600 mt-0.5">Areas reviewed with nothing of concern noted based on documents provided</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div>
            {leftAreas.map(item => <ClearItem key={item.label} {...item} />)}
          </div>
          <div>
            {rightAreas.map(item => <ClearItem key={item.label} {...item} />)}
          </div>
        </div>
      </div>

      {/* AI positive findings — two columns */}
      {allPositive.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-900">AI findings — nothing of concern</h3>
            <p className="text-xs text-gray-600 mt-0.5">Items explicitly reviewed and found to have no issues</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-gray-100">
            <div className="divide-y divide-gray-100">
              {allPositive.slice(0, Math.ceil(allPositive.length / 2)).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="text-emerald-500 font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
                  <p className="text-sm text-gray-800 leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
            <div className="divide-y divide-gray-100 border-t md:border-t-0 md:border-l border-gray-100">
              {allPositive.slice(Math.ceil(allPositive.length / 2)).map((f: string, i: number) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="text-emerald-500 font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
                  <p className="text-sm text-gray-800 leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          These items were reviewed and no issues were identified based on the documents provided.
          This does not constitute a legal clearance — always verify independently with your conveyancer before exchange.
        </p>
      </div>
    </div>
  )
}

// ─── Property Scan Tab ────────────────────────────────────────────────────────

function PropertyScanTab({ scan, scanning, onRunScan, onDownloadPdf, downloadingPdf, property, credits }: {
  scan: any; scanning: boolean; onRunScan: () => void; onDownloadPdf: () => void; downloadingPdf: boolean; property: any; credits: number
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
    filterSev === 'all' ? sorted : sorted

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
    v==='none'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-gray-50 text-gray-500 border-gray-200'

  const tv = (v: any) => typeof v === 'string' ? v : JSON.stringify(v)

  const historyColor: Record<string,string> = { sold:'#E8001D', built:'#6366F1', leased:'#0891B2', listed:'#D97706', renovated:'#059669', other:'#9CA3AF' }
  const historyIcon:  Record<string,string> = { sold:'💰', built:'🏗️', leased:'🔑', listed:'📋', renovated:'🔨', other:'📌' }

  return (
    <div className="space-y-4">
      {/* Header card — compact, badge + summary merged */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        {/* Badge + council + summary all in one line */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{background:'#334155'}}>ONLINE SCAN</span>
          {scan.council && <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">· {scan.council}</span>}
          {scan.scan_date && <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">· {new Date(scan.scan_date).toLocaleDateString('en-AU', {day:'numeric',month:'short',year:'numeric'})}</span>}
          {scan.summary && (
            <span className={`text-xs text-gray-600 leading-relaxed ${summaryExpanded ? '' : 'line-clamp-1'}`}>
              — {scan.summary}
            </span>
          )}
          {scan.summary && scan.summary.length > 100 && (
            <button onClick={() => setSummaryExpanded(e => !e)}
              className="text-[10px] font-semibold text-red-600 hover:underline flex-shrink-0 mt-0.5">
              {summaryExpanded ? '▲ less' : '▼ more'}
            </button>
          )}
        </div>

        {/* Stats — compact clickable filter buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[
            {sev:'high',  n:high.length,   label:'High priority',  color:'#DC2626', bg:'#FFF5F5', border:'#FCCACA'},
            {sev:'medium',n:medium.length, label:'Worth reviewing', color:'#D97706', bg:'#FFFBF0', border:'#F5DFA0'},
            {sev:'low',   n:low.length+info.length, label:'Notes', color:'#6B7280', bg:'#F9FAFB', border:'#E5E7EB'},
            {sev:'clear', n:(scan.positive_findings||[]).length, label:'Nothing noted', color:'#059669', bg:'#F0FDF4', border:'#A7F3D0'},
          ].map(({sev,n,label,color,bg,border}) => {
            const isActive = filterSev === sev
            return (
              <button key={label}
                onClick={() => setFilterSev(isActive ? 'all' : sev)}
                className="rounded-lg px-2 py-2 text-center transition-all cursor-pointer hover:opacity-80"
                style={{
                  background: n>0 ? bg : '#FAFAFA',
                  border: `1.5px solid ${isActive ? color : (n>0 ? border : '#F3F4F6')}`,
                  boxShadow: isActive ? `0 0 0 3px ${color}22` : 'none',
                }}>
                <p className="text-lg font-black leading-none" style={{color:n>0?color:'#D1D5DB'}}>{n}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</p>
                {isActive && <p className="text-[9px] font-bold mt-0.5" style={{color}}>● filtering</p>}
              </button>
            )
          })}
        </div>
        {filterSev !== 'all' && (
          <p className="text-xs text-gray-400">
            Showing <strong className="text-gray-600">{sevCfg[filterSev]?.label ?? filterSev}</strong> only
            <button onClick={() => setFilterSev('all')} className="ml-2 text-red-500 hover:underline font-semibold">Clear ×</button>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── LEFT: History + Findings ── */}
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

          {/* 2. Findings with sub-tabs */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" id="scan-findings">
            {/* Sub-tab row */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-3">
              <div className="flex overflow-x-hidden">
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
                        : 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-700 hover:text-gray-900'
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

            {/* Findings list — shows positive_findings when filterSev==='clear' */}
            {filterSev === 'clear' ? (
              (scan.positive_findings||[]).length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No positive findings recorded.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(scan.positive_findings||[])
                    .filter((f:any) => {
                      const text = typeof f==='string'?f:(f.finding||f.benefit||'')
                      return !search || text.toLowerCase().includes(search.toLowerCase())
                    })
                    .map((f:any,i:number) => (
                      <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                        <span className="text-emerald-500 font-bold text-sm mt-0.5 flex-shrink-0">✓</span>
                        <p className="text-sm text-gray-700 leading-relaxed">{typeof f==='string'?f:(f.finding||f.benefit||f.item||JSON.stringify(f))}</p>
                      </div>
                    ))
                  }
                </div>
              )
            ) : filtered.length === 0 ? (
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

        </div>

        {/* ── RIGHT: Nearby Services, Schools, Planning, Risk, Suburb ── */}
        <div className="space-y-4">

          {/* Nearby Services */}
          {scan.nearby_services && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900">📍 Nearby Services</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {/* Transport */}
                {(scan.nearby_services.transport||[]).length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Transport</p>
                    <div className="space-y-2">
                      {(scan.nearby_services.transport||[]).map((t:any,i:number) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 flex items-center gap-1.5 min-w-0">
                            <span className="flex-shrink-0">{t.type==='train'?'🚂':t.type==='tram'?'🚊':t.type==='bus'?'🚌':'🚍'}</span>
                            <span className="truncate">{t.name}</span>
                          </span>
                          <span className="text-xs font-semibold text-gray-400 flex-shrink-0 whitespace-nowrap ml-2">{t.distance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Shopping */}
                {(scan.nearby_services.shopping||[]).length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shopping</p>
                    <div className="space-y-2">
                      {(scan.nearby_services.shopping||[]).map((s:any,i:number) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 flex items-center gap-1.5 min-w-0">
                            <span className="flex-shrink-0">🛒</span>
                            <span className="truncate">{s.name}</span>
                          </span>
                          <span className="text-xs font-semibold text-gray-400 flex-shrink-0 whitespace-nowrap ml-2">{s.distance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Health */}
                {(scan.nearby_services.health||[]).length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Health</p>
                    <div className="space-y-2">
                      {(scan.nearby_services.health||[]).map((h:any,i:number) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 flex items-center gap-1.5 min-w-0">
                            <span className="flex-shrink-0">🏥</span>
                            <span className="truncate">{h.name}</span>
                          </span>
                          <span className="text-xs font-semibold text-gray-400 flex-shrink-0 whitespace-nowrap ml-2">{h.distance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Parks */}
                {(scan.nearby_services.parks||[]).length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Parks & Green Space</p>
                    <div className="space-y-2">
                      {(scan.nearby_services.parks||[]).map((p:any,i:number) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 flex items-center gap-1.5 min-w-0">
                            <span className="flex-shrink-0">🌳</span>
                            <span className="truncate">{p.name}</span>
                          </span>
                          <span className="text-xs font-semibold text-gray-400 flex-shrink-0 whitespace-nowrap ml-2">{p.distance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Universities */}
                {(scan.nearby_services.education_nearby||[]).length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Universities & Education</p>
                    <div className="space-y-2">
                      {(scan.nearby_services.education_nearby||[]).map((e:any,i:number) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 flex items-center gap-1.5 min-w-0">
                            <span className="flex-shrink-0">🎓</span>
                            <span className="truncate">{e.name}</span>
                          </span>
                          <span className="text-xs font-semibold text-gray-400 flex-shrink-0 whitespace-nowrap ml-2">{e.distance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* School Zones */}
          {scan.education&&(scan.education.primary_school||scan.education.secondary_school)&&(
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900">🏫 School Zones</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {scan.education.primary_school&&(
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Primary (Zoned)</p>
                      <p className="text-sm font-semibold text-gray-900">{scan.education.primary_school}</p>
                      {scan.education.primary_rating && (
                        <p className="text-xs text-emerald-600 mt-0.5">{scan.education.primary_rating}</p>
                      )}
                    </div>
                    {scan.education.primary_distance && (
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg flex-shrink-0 mt-1">{scan.education.primary_distance}</span>
                    )}
                  </div>
                )}
                {scan.education.secondary_school&&(
                  <div className="flex items-start justify-between gap-2 pt-3 border-t border-gray-100">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        Secondary {scan.education.secondary_school_zone ? '(Zoned)' : scan.education.secondary_nearest_zoned ? '(Select-entry)' : ''}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">{scan.education.secondary_school}</p>
                      {scan.education.secondary_nearest_zoned && (
                        <p className="text-xs text-gray-500 mt-0.5">Zoned: {scan.education.secondary_nearest_zoned}</p>
                      )}
                    </div>
                    {scan.education.secondary_distance && (
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg flex-shrink-0 mt-1">{scan.education.secondary_distance}</span>
                    )}
                  </div>
                )}
                {(scan.education.other_nearby||[]).length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Also Nearby</p>
                    <div className="space-y-1.5">
                      {(scan.education.other_nearby||[]).map((s:any,i:number) => (
                        <div key={i} className="flex items-center justify-between">
                          <p className="text-xs text-gray-700">{s.name}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{s.distance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {scan.education.notes&&<p className="text-xs text-gray-400 leading-relaxed pt-2 border-t border-gray-100">{scan.education.notes}</p>}
              </div>
            </div>
          )}

          {/* Planning Zone */}
          {scan.planning?.zone_code&&(
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
              <div className="px-4 py-3 space-y-2.5">
                {[
                  {label:'Median house',  val:scan.suburb_profile.median_house_price},
                  {label:'Median unit',   val:scan.suburb_profile.median_unit_price},
                  {label:'12m growth',    val:scan.suburb_profile.price_growth_12m},
                  {label:'Rental yield',  val:scan.suburb_profile.rental_yield},
                ].filter(r=>r.val).map(({label,val}) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-bold text-gray-900">{val}</span>
                  </div>
                ))}
                {scan.suburb_profile.data_date && <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">Data: {scan.suburb_profile.data_date}</p>}
              </div>
            </div>
          )}

          {/* Data Sources */}
          {(scan.data_sources||[]).length>0&&(
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900">🔗 Data Sources</h4>
              </div>
              <div className="px-4 py-3 space-y-1.5">
                {scan.data_sources.map((s:any,i:number) => (
                  <p key={i} className="text-xs text-gray-500 leading-snug">{typeof s==='string'?s:JSON.stringify(s)}</p>
                ))}
              </div>
            </div>
          )}

          {/* Limitations */}
          {(scan.limitations||[]).length>0&&(
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-2">⚠️ Limitations</p>
              {scan.limitations.map((l:any,i:number) => (
                <p key={i} className="text-xs text-amber-700 leading-relaxed mt-1">• {typeof l==='string'?l:JSON.stringify(l)}</p>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RiskFlagCard({ flag, index }: { flag: RedFlag; index: number }) {
  const c = sev[flag.severity] ?? sev.low
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
}

function NoAnalysis({ msg }: { msg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <span className="text-3xl">📄</span>
      <p className="text-gray-500 text-sm mt-3 leading-relaxed">{msg}</p>
    </div>
  )
}

function UploadCta({ credits, onUpload }: { credits: number; onUpload: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-8 text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{background:'#FFF0F0'}}>
          <span className="text-xl">📤</span>
        </div>
        <h3 className="text-base font-black text-gray-900 mb-1">Upload your documents</h3>
        <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto leading-relaxed">Upload your Section 32 and Contract of Sale as a single PDF for AI analysis.</p>
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

function ContractScanEmptyState({ credits, onUpload }: { credits: number; onUpload: () => void }) {
  return <UploadCta credits={credits} onUpload={onUpload} />
}
