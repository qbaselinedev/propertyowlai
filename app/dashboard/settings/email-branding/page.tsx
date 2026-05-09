'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Branding {
  firm_name: string; logo_url: string; brand_color: string
  signature_name: string; signature_title: string; signature_phone: string
  signature_email: string; signature_website: string; footer_disclaimer: string
}

const DEFAULT: Branding = {
  firm_name: '', logo_url: '', brand_color: '#E8001D',
  signature_name: '', signature_title: '', signature_phone: '',
  signature_email: '', signature_website: '',
  footer_disclaimer: 'This email was sent via PropertyOwl AI. Information display only — not legal advice.',
}

const COLORS = ['#E8001D', '#1A1A1A', '#1E40AF', '#065F46', '#7C3AED', '#B91C1C', '#0F766E', '#4338CA', '#9333EA', '#C2410C']

export default function EmailBrandingPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Branding>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('email_branding').select('*').eq('user_id', user.id).single()
    if (data) {
      setForm({
        firm_name: data.firm_name ?? '', logo_url: data.logo_url ?? '', brand_color: data.brand_color ?? '#E8001D',
        signature_name: data.signature_name ?? '', signature_title: data.signature_title ?? '',
        signature_phone: data.signature_phone ?? '', signature_email: data.signature_email ?? '',
        signature_website: data.signature_website ?? '', footer_disclaimer: data.footer_disclaimer ?? DEFAULT.footer_disclaimer,
      })
    } else {
      // Pre-fill from profile
      const { data: profile } = await supabase.from('profiles').select('full_name, user_type').eq('id', user.id).single()
      if (profile) {
        setForm(f => ({
          ...f,
          signature_name: profile.full_name ?? '',
          signature_title: profile.user_type === 'lawyer' ? 'Lawyer' : 'Conveyancer',
          signature_email: user.email ?? '',
        }))
      }
    }
    setLoading(false)
  }

  async function handleLogoUpload(file: File) {
    setUploading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const path = `${user.id}/logo.${ext}`

    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setError('Upload failed: ' + upErr.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
    setForm(f => ({ ...f, logo_url: urlData.publicUrl }))
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: e } = await supabase.from('email_branding').upsert({
      user_id: user.id, ...form, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    setSaving(false)
    if (e) setError('Failed to save: ' + e.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  function up(k: keyof Branding, v: string) { setForm(f => ({ ...f, [k]: v })) }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-5xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Branding</h1>
        <p className="text-sm text-gray-500 mt-1">Customise how your emails look when sent to clients and partners</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Configuration ── */}
        <div className="space-y-5">

          {/* Firm */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Firm Details</h2>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Firm / Company Name</label>
              <input type="text" value={form.firm_name} onChange={e => up('firm_name', e.target.value)} placeholder="Smith & Co Conveyancing"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D]" />
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Logo</label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <div className="relative">
                    <img src={form.logo_url} alt="Logo" className="h-14 max-w-[180px] object-contain rounded-lg border border-gray-200 p-1" />
                    <button onClick={() => up('logo_url', '')} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">×</button>
                  </div>
                ) : (
                  <div className="h-14 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">No logo</div>
                )}
                <div>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    {uploading ? 'Uploading…' : '📎 Upload Logo'}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">PNG, JPG or SVG. Max 2MB.</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]) }} />
              </div>
            </div>

            {/* Brand colour */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Brand Colour</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => up('brand_color', c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.brand_color === c ? 'border-gray-900 scale-110 shadow-md' : 'border-gray-200 hover:scale-105'}`}
                    style={{ background: c }} />
                ))}
                <input type="color" value={form.brand_color} onChange={e => up('brand_color', e.target.value)}
                  className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer" title="Custom colour" />
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Email Signature</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name</label><input type="text" value={form.signature_name} onChange={e => up('signature_name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Title</label><input type="text" value={form.signature_title} onChange={e => up('signature_title', e.target.value)} placeholder="Conveyancer" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Phone</label><input type="tel" value={form.signature_phone} onChange={e => up('signature_phone', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email</label><input type="email" value={form.signature_email} onChange={e => up('signature_email', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
              <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Website</label><input type="url" value={form.signature_website} onChange={e => up('signature_website', e.target.value)} placeholder="https://…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]" /></div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Footer Disclaimer</h2>
            <textarea value={form.footer_disclaimer} onChange={e => up('footer_disclaimer', e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#E8001D] resize-none" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>}

          <button onClick={handleSave} disabled={saving}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-[#E8001D] hover:bg-red-700 text-white'} disabled:opacity-50`}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save Branding'}
          </button>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Live Email Preview</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-gray-100/50 p-4">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden max-w-md mx-auto" style={{ fontSize: '12px' }}>
              {/* Header */}
              <div style={{ background: form.brand_color, padding: '16px 24px', textAlign: 'center' }}>
                {form.logo_url && <img src={form.logo_url} alt="Logo" style={{ maxHeight: '40px', maxWidth: '160px', margin: '0 auto 8px', display: 'block', objectFit: 'contain' }} />}
                <p style={{ color: 'white', fontWeight: 800, fontSize: '14px', margin: 0 }}>
                  {form.firm_name || 'Your Firm Name'}
                </p>
              </div>
              {/* Body */}
              <div style={{ padding: '20px 24px' }}>
                <p style={{ color: '#999', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '0 0 2px' }}>Property</p>
                <p style={{ fontWeight: 700, color: '#111', fontSize: '13px', margin: '0 0 14px' }}>Unit 5/11 Chandler Road, Boronia</p>
                <p style={{ color: '#333', fontSize: '12px', lineHeight: 1.7, margin: 0 }}>Dear Client,</p>
                <p style={{ color: '#333', fontSize: '12px', lineHeight: 1.7, margin: '8px 0' }}>I have completed my review of the documentation for the above property. Below is a summary of key findings…</p>
                <div style={{ background: '#FEF2F2', borderRadius: '6px', padding: '10px 12px', borderLeft: `3px solid ${form.brand_color}`, margin: '10px 0' }}>
                  <p style={{ fontWeight: 700, color: '#111', fontSize: '11px', margin: 0 }}>1. Active registered mortgage not discharged</p>
                  <p style={{ color: form.brand_color, fontWeight: 600, fontSize: '10px', margin: '4px 0 0' }}>→ Obtain undertaking from bank</p>
                </div>
                {/* Signature */}
                <div style={{ borderTop: '1px solid #eee', marginTop: '16px', paddingTop: '12px' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#111', fontSize: '12px' }}>{form.signature_name || 'Your Name'}</p>
                  <p style={{ margin: '2px 0', color: '#666', fontSize: '11px' }}>{form.signature_title || 'Conveyancer'}</p>
                  {form.signature_phone && <p style={{ margin: '2px 0', color: '#666', fontSize: '11px' }}>📞 {form.signature_phone}</p>}
                  {form.signature_email && <p style={{ margin: '2px 0', color: '#666', fontSize: '11px' }}>✉️ {form.signature_email}</p>}
                  {form.signature_website && <p style={{ margin: '2px 0', fontSize: '11px' }}><a href={form.signature_website} style={{ color: form.brand_color }}>{form.signature_website}</a></p>}
                </div>
              </div>
              {/* Footer */}
              <div style={{ background: '#F9FAFB', padding: '12px 24px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                <p style={{ color: '#999', fontSize: '9px', lineHeight: 1.5, margin: 0 }}>{form.footer_disclaimer}</p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center">This preview shows how your emails will look to recipients</p>
        </div>
      </div>
    </div>
  )
}
