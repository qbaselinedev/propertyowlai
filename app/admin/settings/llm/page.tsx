"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — Fast & cheap (dev/testing)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — Balanced (recommended for production)" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6 — Most powerful (premium)" },
];

export default function LLMSettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    s32_prompt: "",
    scan_prompt: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("app_settings").select("*").eq("key", "llm").single();
      if (data?.value) setSettings(data.value);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    await supabase.from("app_settings").upsert({ key: "llm", value: settings });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-bold text-[#E8001D] uppercase tracking-wider mb-1">Settings</p>
        <h1 className="text-3xl font-black text-white">LLM Settings</h1>
        <p className="text-gray-500 mt-1">Configure Claude AI model and prompts</p>
      </div>

      <div className="space-y-6">
        {/* MODEL */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-base font-black text-white mb-4">🤖 Claude Model</h2>
          <div className="space-y-3">
            {MODELS.map((m) => (
              <label key={m.id} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={settings.model === m.id}
                  onChange={() => setSettings({ ...settings, model: m.id })}
                  className="mt-1 accent-[#E8001D]"
                />
                <div>
                  <p className="text-sm font-semibold text-white">{m.label.split("—")[0]}</p>
                  <p className="text-xs text-gray-500">{m.label.split("—")[1]}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* MAX TOKENS */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-base font-black text-white mb-1">Max Tokens per Response</h2>
          <p className="text-xs text-gray-500 mb-4">Higher = more detailed reports, more API cost. Recommended: 4000</p>
          <input
            type="number"
            min={1000}
            max={8000}
            step={500}
            value={settings.max_tokens}
            onChange={(e) => setSettings({ ...settings, max_tokens: Number(e.target.value) })}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:border-[#E8001D]"
          />
        </div>

        {/* S32 PROMPT */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-base font-black text-white mb-1">Section 32 Master Prompt</h2>
          <p className="text-xs text-gray-500 mb-4">System prompt used for all Section 32 and Contract of Sale reviews</p>
          <textarea
            rows={10}
            value={settings.s32_prompt}
            onChange={(e) => setSettings({ ...settings, s32_prompt: e.target.value })}
            placeholder="You are PropertyOwl AI, an expert Victorian property analyst specialising in Section 32 Vendor Statements and Contracts of Sale..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#E8001D] resize-none"
          />
        </div>

        {/* SCAN PROMPT */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-base font-black text-white mb-1">Online Property Scan Prompt</h2>
          <p className="text-xs text-gray-500 mb-4">System prompt used for Online Property Scan analysis</p>
          <textarea
            rows={10}
            value={settings.scan_prompt}
            onChange={(e) => setSettings({ ...settings, scan_prompt: e.target.value })}
            placeholder="You are PropertyOwl AI, researching a Victorian property for a buyer. Analyse all available public information..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#E8001D] resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#E8001D] hover:bg-[#C4001A] text-white font-bold px-8 py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save LLM Settings"}
        </button>
      </div>
    </div>
  );
}
