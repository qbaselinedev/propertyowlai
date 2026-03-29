'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// All configurable permission flags with human-readable labels
interface PermissionFlag {
  key: string
  label: string
  desc: string
  icon: string
  warning?: boolean
}

const PERMISSION_FLAGS: PermissionFlag[] = [
  {
    key: 'show_risk_score',
    label: 'Risk Score',
    desc: 'Show the numerical risk rating (1–10) on reports',
    icon: '🎯',
  },
  {
    key: 'show_red_flags',
    label: 'Red & Amber Flags',
    desc: 'Highlight red and amber issues detected in the document',
    icon: '🚩',
  },
  {
    key: 'show_risk_summary',
    label: 'Risk Summary',
    desc: 'Show the AI-generated narrative risk summary',
    icon: '📊',
  },
  {
    key: 'show_issues',
    label: 'Issues & Problems',
    desc: 'Show identified problems, anomalies and discrepancies',
    icon: '⚠️',
  },
  {
    key: 'show_llm_recommendations',
    label: 'AI Recommendations',
    desc: 'Show AI-generated professional recommendations (requires authority to advise)',
    icon: '💡',
  },
  {
    key: 'show_suggested_actions',
    label: 'Suggested Actions',
    desc: 'Show specific next steps the user should take (requires authority to advise)',
    icon: '✅',
  },
  {
    key: 'facts_only_mode',
    label: 'Facts-Only Mode',
    desc: 'Forces the LLM to present document information neutrally — no risk framing, no interpretation. OVERRIDES all display flags above.',
    icon: '📄',
    warning: true,
  },
]

type PermissionKey = string

interface UserTypePolicy {
  [key: string]: boolean | string
  label: string
  show_risk_score: boolean
  show_red_flags: boolean
  show_risk_summary: boolean
  show_issues: boolean
  show_llm_recommendations: boolean
  show_suggested_actions: boolean
  facts_only_mode: boolean
}

type PoliciesMap = Record<string, UserTypePolicy>

const USER_TYPE_ORDER = [
  'buyer',
  'broker',
  'buyer_agent',
  'conveyancer',
  'lawyer',
  'real_estate_agent',
]

const USER_TYPE_ICONS: Record<string, string> = {
  buyer:             '🏠',
  broker:            '💼',
  buyer_agent:       '🔍',
  conveyancer:       '📋',
  lawyer:            '⚖️',
  real_estate_agent: '🏢',
}

export default function PoliciesPage() {
  const supabase = createClient()
  const [policies, setPolicies] = useState<PoliciesMap | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'user_type_policies')
      .single()
      .then(({ data }) => {
        if (data?.value) setPolicies(data.value as PoliciesMap)
        setLoading(false)
      })
  }, [])

  function toggle(userType: string, flag: PermissionKey) {
    if (!policies) return
    setPolicies(prev => {
      if (!prev) return prev
      const current = prev[userType]
      const newValue = !current[flag]

      // Logic guard: if enabling facts_only_mode, disable all display flags
      // If disabling facts_only_mode, leave other flags as they are
      if (flag === 'facts_only_mode' && newValue) {
        return {
          ...prev,
          [userType]: {
            ...current,
            facts_only_mode: true,
            show_risk_score: false,
            show_red_flags: false,
            show_risk_summary: false,
            show_issues: false,
            show_llm_recommendations: false,
            show_suggested_actions: false,
          },
        }
      }

      // If enabling any display flag, automatically disable facts_only_mode
      if (flag !== 'facts_only_mode' && newValue) {
        return {
          ...prev,
          [userType]: {
            ...current,
            [flag]: true,
            facts_only_mode: false,
          },
        }
      }

      return {
        ...prev,
        [userType]: { ...current, [flag]: newValue },
      }
    })
  }

  async function handleSave() {
    if (!policies) return
    setSaving(true)
    await supabase
      .from('app_settings')
      .upsert({ key: 'user_type_policies', value: policies })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-[#E8001D] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!policies) {
    return (
      <div className="p-8 text-red-400">
        Could not load policies. Make sure the migration SQL has been run.
      </div>
    )
  }

  const orderedTypes = USER_TYPE_ORDER.filter(t => policies[t])

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold text-[#E8001D] uppercase tracking-wider mb-1">Settings</p>
        <h1 className="text-3xl font-black text-white">User Type Policies</h1>
        <p className="text-gray-400 text-sm mt-1">
          Control what each user type can see in reports. The LLM prompt is adjusted automatically based on these settings.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-gray-900 rounded-xl border border-gray-800 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
            <span className="text-emerald-400 text-[10px]">✓</span>
          </div>
          <span>Enabled — users of this type will see this data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-800 border border-gray-700" />
          <span>Disabled — hidden from this user type</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500 flex items-center justify-center">
            <span className="text-amber-400 text-[10px]">✓</span>
          </div>
          <span>Facts-only mode active (overrides all above)</span>
        </div>
      </div>

      {/* Policy matrix table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-52">
                Permission
              </th>
              {orderedTypes.map(type => (
                <th key={type} className="px-4 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">{USER_TYPE_ICONS[type]}</span>
                    <span className="text-xs font-bold text-white whitespace-nowrap">
                      {policies[type].label}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_FLAGS.map((flag, i) => (
              <tr
                key={flag.key}
                className={`border-b border-gray-800/50 ${
                  flag.warning ? 'bg-amber-500/5' : i % 2 === 0 ? '' : 'bg-white/[0.01]'
                }`}
              >
                {/* Permission label */}
                <td className="px-5 py-4">
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">{flag.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${flag.warning ? 'text-amber-400' : 'text-white'}`}>
                        {flag.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed max-w-[180px]">
                        {flag.desc}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Toggle per user type */}
                {orderedTypes.map(type => {
                  const isEnabled = policies[type][flag.key]
                  const isFactsOnly = policies[type].facts_only_mode
                  // If facts_only_mode is on, display flags are shown as disabled (overridden)
                  const isOverridden = flag.key !== 'facts_only_mode' && isFactsOnly

                  return (
                    <td key={type} className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggle(type, flag.key)}
                        title={isOverridden ? 'Overridden by Facts-Only Mode' : undefined}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${
                          isOverridden
                            ? 'border-gray-700 bg-gray-800 cursor-not-allowed opacity-40'
                            : isEnabled
                            ? flag.warning
                              ? 'border-amber-500 bg-amber-500/20 hover:bg-amber-500/30'
                              : 'border-emerald-500 bg-emerald-500/20 hover:bg-emerald-500/30'
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                        disabled={isOverridden}
                      >
                        {isEnabled && !isOverridden && (
                          <span className={`text-sm font-bold ${flag.warning ? 'text-amber-400' : 'text-emerald-400'}`}>
                            ✓
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {orderedTypes.map(type => {
          const policy = policies[type]
          const activePerms = PERMISSION_FLAGS.filter(f => f.key !== 'facts_only_mode' && policy[f.key])
          return (
            <div key={type} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{USER_TYPE_ICONS[type]}</span>
                <span className="text-sm font-bold text-white">{policy.label}</span>
                {policy.facts_only_mode && (
                  <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full">
                    Facts Only
                  </span>
                )}
              </div>
              {policy.facts_only_mode ? (
                <p className="text-xs text-gray-500">
                  Receives neutral document summaries only — no risk framing, no AI interpretation.
                </p>
              ) : activePerms.length === 0 ? (
                <p className="text-xs text-gray-500">No display permissions enabled.</p>
              ) : (
                <div className="space-y-1">
                  {activePerms.map(f => (
                    <div key={f.key} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="text-emerald-400">✓</span> {f.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Important note */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <p className="text-xs font-bold text-blue-400 mb-1">ℹ️ How this works</p>
        <p className="text-xs text-blue-300 leading-relaxed">
          When a user runs an analysis, the LLM system prompt is dynamically modified based on their user type policy.
          For <strong>Facts-Only</strong> users, the AI is instructed to describe document contents neutrally without highlighting risks, making recommendations, or suggesting actions.
          For <strong>Professional</strong> users (Conveyancer/Lawyer), the AI uses its full analytical capability.
          These settings take effect on the next analysis run — existing reports are not retroactively changed.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`px-8 py-3 rounded-lg font-bold text-sm transition-colors ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-[#E8001D] hover:bg-red-700 text-white disabled:opacity-60'
        }`}
      >
        {saved ? '✓ Policies Saved!' : saving ? 'Saving…' : 'Save Policies'}
      </button>
    </div>
  )
}
