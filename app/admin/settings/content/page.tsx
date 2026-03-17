'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ContentSettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState({
    disclaimer_text: '',
    how_it_works: '',
    support_email: 'support@propertyowlai.com',
    credits_per_analysis: 2,
    maintenance_mode: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('app_settings').select('*').eq('key', 'content').single()
      .then(({ data }) => { if (data?.value) setSettings((s) => ({ ...s, ...data.value })) })
  }, [])

  async function save() {
    setSaving(true)
    await supabase.from('app_settings').upsert({ key: 'content', value: settings })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-bold text-[#E8001D] uppercase tracking-wider mb-1">Settings</p>
        <h1 className="text-2xl font-black text-white">Content & System</h1>
        <p className="text-gray-500 text-sm mt-1">Disclaimer text, support contact, system config</p>
      </div>

      {[
        { key: 'support_email', label: 'Support Email', type: 'input', placeholder: 'support@propertyowlai.com',
          sub: 'Shown to users on the dashboard and in emails' },
        { key: 'disclaimer_text', label: 'Legal Disclaimer', type: 'textarea', rows: 5,
          placeholder: 'This is an informal AI-assisted review only...',
          sub: 'Appended to all reports and the conveyancer pack' },
        { key: 'how_it_works', label: 'How It Works Copy', type: 'textarea', rows: 4,
          placeholder: 'Upload your S32 and contract...',
          sub: 'Displayed on the empty state / onboarding screen' },
      ].map(({ key, label, type, placeholder, sub, rows }) => (
        <div key={key} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-sm font-bold text-white mb-1">{label}</h2>
          <p className="text-xs text-gray-500 mb-3">{sub}</p>
          {type === 'input' ? (
            <input
              type="text"
              value={(settings as any)[key]}
              onChange={(e) => setSettings(s => ({ ...s, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]"
            />
          ) : (
            <textarea
              rows={rows}
              value={(settings as any)[key]}
              onChange={(e) => setSettings(s => ({ ...s, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#E8001D] resize-none"
            />
          )}
        </div>
      ))}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-sm font-bold text-white mb-1">Credits per Analysis</h2>
        <p className="text-xs text-gray-500 mb-3">How many credits are consumed per full S32 + Contract review</p>
        <input
          type="number" min={1} max={10}
          value={settings.credits_per_analysis}
          onChange={(e) => setSettings(s => ({ ...s, credits_per_analysis: Number(e.target.value) }))}
          className="w-24 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E8001D]"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Maintenance Mode</h2>
            <p className="text-xs text-gray-500 mt-0.5">Disable all analysis for non-admin users</p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.maintenance_mode ? 'bg-[#E8001D]' : 'bg-gray-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenance_mode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-[#E8001D] hover:bg-red-700 text-white disabled:opacity-60'}`}>
        {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  )
}
