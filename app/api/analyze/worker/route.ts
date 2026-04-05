import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// ─── Constants ────────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SAFE_TOKEN_LIMIT    = 47_000
const CALL1_OVERHEAD      = 2_500
const CALL2_PROMPT_TOKENS = 3_000
const TOKENS_PER_FULL_IMG = 1_500
const CHARS_PER_TOKEN     = 4

const IMAGE_PRIORITY: Record<string, number> = {
  plan_of_subdivision:  1,
  title_search:         2,
  council_rates:        2,
  building_permits:     3,
  oc_certificate:       3,
  insurance:            3,
  planning_certificate: 4,
  unknown_image:        5,
}

const DISCLAIMER = 'PropertyOwl AI extracts and displays information from uploaded property documents. This output is for informational display purposes only. It is not legal advice, financial advice, or professional property advice of any kind. Information may be incomplete or inaccurate. Always seek independent professional advice before making any property decision.'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageIndex {
  page: number
  doc_type: string
  send_as: 'text' | 'full_image' | 'skip'
  readable: boolean
  notes: string | null
}

interface TokenBudget {
  textPages: number[]
  imagePages: Array<{ page: number; doc_type: string; priority: number }>
  skippedPages: Array<{ page: number; doc_type: string; reason: string }>
}

// ─── PDF Service client (calls Railway Python microservice) ──────────────────
// Two calls total: Call A gets text+thumbnails, Call B gets full-res images
// for only the specific pages Claude needs to see visually.

const PDF_SERVICE_URL    = process.env.PDF_SERVICE_URL || ''
const PDF_SERVICE_SECRET = process.env.PDF_SERVICE_SECRET || ''

async function callPdfService(fileData: Blob, mode: string, pages: number[] = []): Promise<any> {
  if (!PDF_SERVICE_URL) throw new Error('PDF_SERVICE_URL not set — add it to Vercel env vars')

  const form = new FormData()
  form.append('file', fileData, 'document.pdf')
  form.append('mode', mode)
  if (pages.length > 0) form.append('pages', pages.join(','))

  const res = await fetch(`${PDF_SERVICE_URL}/process`, {
    method:  'POST',
    headers: { 'X-PDF-Secret': PDF_SERVICE_SECRET },
    body:    form,
  })

  if (!res.ok) throw new Error(`PDF service error ${res.status}: ${await res.text()}`)
  return res.json()
}

// Call A — send PDF once, get page count + all text + all thumbnails
async function getPdfData(fileData: Blob): Promise<{
  totalPages:    number
  extractedText: Record<number, string>
  thumbnails:    string[]
}> {
  const result = await callPdfService(fileData, 'thumbnails')
  const text: Record<number, string> = {}
  for (const [k, v] of Object.entries(result.text || {})) text[+k] = v as string
  return {
    totalPages:    result.page_count,
    extractedText: text,
    thumbnails:    result.thumbnails || [],
  }
}

// Call B — send PDF again, get full-res images for specific pages only
async function renderFullResPages(fileData: Blob, pages: number[]): Promise<Record<number, string>> {
  if (pages.length === 0) return {}
  const result = await callPdfService(fileData, 'full', pages)
  const out: Record<number, string> = {}
  for (const [k, v] of Object.entries(result.full_res || {})) out[+k] = v as string
  return out
}

// ─── CALL 1: Document Mapping ─────────────────────────────────────────────────

const CALL1_SYSTEM = `You are a Victorian property document classifier.

You receive thumbnail images of every page in a property document (S32 Vendor Statement and/or Contract of Sale).

For each page, classify it into exactly one doc_type from this list:
- section_32, title_search, plan_of_subdivision, council_rates, water_statement,
  clearance_certificate, building_permits, oc_certificate, insurance,
  planning_certificate, contract_of_sale, general_conditions, unknown_text, unknown_image

And specify send_as: "text" | "full_image" | "skip"
- text: page contains readable text that can be extracted
- full_image: page is a diagram, map, plan, table of figures, or handwritten — needs visual analysis
- skip: page is blank, cover sheet, or purely decorative

Return ONLY a JSON array, no markdown. Example:
[{"page":1,"doc_type":"section_32","send_as":"text","readable":true,"notes":null}]`

async function call1_mapDocument(
  thumbnails: string[],
  totalPages: number,
  model: string
): Promise<PageIndex[]> {
  if (thumbnails.length === 0) return fallbackClassification(totalPages)

  const BATCH_SIZE = 20
  const allResults: PageIndex[] = []

  for (let i = 0; i < thumbnails.length; i += BATCH_SIZE) {
    const batch      = thumbnails.slice(i, i + BATCH_SIZE)
    const pageOffset = i + 1
    const pageEnd    = Math.min(i + BATCH_SIZE, totalPages)

    const content: Anthropic.ContentBlockParam[] = [
      { type: 'text', text: `Classify pages ${pageOffset}–${pageEnd} of ${totalPages}:` },
      ...batch.map((b64, idx): Anthropic.ContentBlockParam => ({
        type:   'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
      })),
      { type: 'text', text: `Return JSON array for pages ${pageOffset}–${pageEnd}.` },
    ]

    const response = await client.messages.create({
      model,
      max_tokens: CALL1_OVERHEAD,
      system:     CALL1_SYSTEM,
      messages:   [{ role: 'user', content }],
    })

    const raw     = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const batch = JSON.parse(cleaned) as PageIndex[]
      allResults.push(...batch)
    } catch {
      console.warn(`[PropertyOwl] Call 1 batch ${pageOffset}-${pageEnd} parse failed — using fallback`)
      for (let p = pageOffset; p <= pageEnd; p++) {
        allResults.push({ page: p, doc_type: 'unknown_text', send_as: 'text', readable: true, notes: 'fallback' })
      }
    }
  }

  return allResults
}

function fallbackClassification(pageCount: number): PageIndex[] {
  return Array.from({ length: pageCount }, (_, i) => ({
    page: i + 1,
    doc_type: 'unknown_text',
    send_as: 'text' as const,
    readable: true,
    notes: 'fallback — retry for accurate classification',
  }))
}

// ─── Build Call 2 token budget ────────────────────────────────────────────────

const BOILERPLATE_MARKERS = [
  'Delivered from the LANDATA',
  'Copyright State of Victoria.',
  'No part',
  'The document following this cover sheet',
  'consumer.vic.gov.au/duediligencechecklist',
]

const GC_PATTERN = /General Condition[s]?\s+\d+/i

function buildTokenBudget(
  pageIndex: PageIndex[],
  extractedText: Record<number, string>
): TokenBudget {
  let budget = SAFE_TOKEN_LIMIT - CALL2_PROMPT_TOKENS

  const textPages: number[] = []
  const imagePages: Array<{ page: number; doc_type: string; priority: number }> = []
  const skippedPages: Array<{ page: number; doc_type: string; reason: string }> = []

  let textTokens = 0
  for (const entry of pageIndex) {
    if (entry.send_as !== 'text') continue

    const text = extractedText[entry.page] || ''
    if (!text.trim()) {
      skippedPages.push({ page: entry.page, doc_type: entry.doc_type, reason: 'empty text' })
      continue
    }

    const isBoilerplate = BOILERPLATE_MARKERS.some(m => text.includes(m)) && text.length < 500
    if (isBoilerplate) {
      skippedPages.push({ page: entry.page, doc_type: entry.doc_type, reason: 'boilerplate header/footer' })
      continue
    }

    const isGC = GC_PATTERN.test(text) && text.length > 800
    const effectiveChars = isGC ? Math.floor(text.length * 0.15) : text.length
    textTokens += Math.ceil(effectiveChars / CHARS_PER_TOKEN)
    textPages.push(entry.page)
  }

  budget -= textTokens

  const imageCandidates = pageIndex
    .filter(e => e.send_as === 'full_image')
    .map(e => ({
      page: e.page,
      doc_type: e.doc_type,
      priority: IMAGE_PRIORITY[e.doc_type] ?? 5,
    }))
    .sort((a, b) => a.priority - b.priority)

  for (const c of imageCandidates) {
    if (budget >= TOKENS_PER_FULL_IMG) {
      imagePages.push(c)
      budget -= TOKENS_PER_FULL_IMG
    } else {
      skippedPages.push({
        page: c.page,
        doc_type: c.doc_type,
        reason: `token budget reached — ${c.doc_type} omitted (priority ${c.priority})`,
      })
    }
  }

  return { textPages, imagePages, skippedPages }
}

// ─── CALL 2: Full Analysis ────────────────────────────────────────────────────

const S32_SYSTEM = `You are PropertyOwl AI, a Victorian property document expert.

Extract and display information from the Section 32 Vendor Statement. You are an information extraction tool — not an adviser. Display only what is present in the document.
Sale of Land Act 1962, Transfer of Land Act 1958, Planning and Environment Act 1987,
Owners Corporations Act 2006, Building Act 1993, Subdivision Act 1988,
Environmental Protection Act 2017, Water Act 1989,
Commercial and Industrial Property Tax Reform Act 2024 (Vic).

EXTRACT EXACTLY — display what is present in the document. Use only factual, neutral language:
• Vendor full names and address
• Lot number, Plan of Subdivision number, Volume and Folio
• ALL title encumbrances: mortgages (bank name), covenants (reference + expiry), caveats, section 173 agreements
• Council name, council rates (exact $), CIV, NAV, AVPCC code
• Water authority name, water charges (exact $ per charge type), unpaid balance
• Land tax status ($0 or amount), windfall gains tax status
• Planning zone, ALL overlays (flood, heritage, bushfire, design, development, environmental)
• GAIC: applicable or not, amount if applicable
• Building permits: number, date, description, value, surveyor (7-year lookback)
• OC: applicable or not, annual fee, special levies, lot liability, lot entitlement
• Insurance: insurer, policy number, coverage period

<STANDARD_VIC_GENERAL_CONDITIONS/>
When you see this tag, it means standard Victorian Contract General Conditions GC1-33 were present in the document. These clauses are legally standardised and identical in all Victorian contracts — do not flag them as issues.

${DISCLAIMER}`

const CONTRACT_SYSTEM = `You are PropertyOwl AI, a Victorian property document expert.

Review the Contract of Sale content under Victorian law:
Sale of Land Act 1962, Estate Agents Act 1980, Goods Act 1958, GST legislation.

EXTRACT EXACTLY — display what is present in the document. Use only factual, neutral language:
• Purchase price, deposit amount and due date, deposit holder
• Settlement date and type
• All special conditions — number, summary, exact wording
• Goods and chattels included and excluded
• Cooling off period and whether waived
• GST status and margin scheme
• Penalty interest rate

<STANDARD_VIC_GENERAL_CONDITIONS/>
When you see this tag, it means standard Victorian Contract General Conditions GC1-33 were present. These are standardised — do not flag them.

${DISCLAIMER}`

// ─── Policy-aware prompt suffix ───────────────────────────────────────────────
// Appended to S32_SYSTEM or CONTRACT_SYSTEM based on the user's type policy.
// For facts_only users: instructs strict neutral extraction only.
// For licensed professionals: unlocks full analytical capability.

const FACTS_ONLY_SUFFIX = `

INFORMATION-ONLY MODE: This report is for informational purposes only. You MUST:
- Present document information factually and neutrally, exactly as it appears in the document
- DO NOT highlight risks, flag issues, assign severity, or suggest there are problems
- DO NOT make recommendations or suggest any actions
- DO NOT use language that implies urgency, concern or risk
- DO NOT include risk scores, risk summaries, or flag counts
- Simply describe what is present in the document in a clear, factual manner
- If a field is not present in the document, state "Not provided"
- Your role is to extract and present information, not to interpret or advise`

function buildPolicyPromptSuffix(policy: Record<string, boolean> | null): string {
  if (!policy || policy.facts_only_mode) return FACTS_ONLY_SUFFIX

  const caps: string[] = []
  if (policy.show_red_flags)           caps.push('identify and clearly flag risks, issues and red flags with severity levels (high/medium/low)')
  if (policy.show_risk_score)          caps.push('provide a risk score from 1–10 based on the severity and volume of issues found')
  if (policy.show_risk_summary)        caps.push('write a concise risk summary narrative that highlights the most important concerns')
  if (policy.show_issues)              caps.push('document all identified problems, anomalies, unusual clauses, missing disclosures and discrepancies')
  if (policy.show_llm_recommendations) caps.push('provide professional recommendations for each issue found, including what the conveyancer or lawyer should advise their client')
  if (policy.show_suggested_actions)   caps.push('suggest specific next steps and actions (e.g. request further disclosure, negotiate clause removal, seek specialist advice)')

  if (caps.length === 0) return FACTS_ONLY_SUFFIX

  return `

PROFESSIONAL ACCESS MODE: This report is being generated for a licensed professional with authority to advise clients on property matters. You are authorised to use your full analytical capability. You MUST:
${caps.map(c => `- ${c}`).join('\n')}
- For EVERY item in items_detected, populate the "recommendation" field with specific professional advice for the conveyancer/lawyer
- For EVERY item in items_detected, populate the "suggested_action" field with the specific next step to take (e.g. "Request vendor to discharge mortgage prior to settlement", "Negotiate removal of this condition", "Obtain specialist advice on this overlay")
- Generate a risk_score from 1-10 based on severity and volume of issues (1=clean, 10=major concerns)
- Write a risk_summary of 2-3 sentences summarising the overall risk profile
- Generate an email_draft object with subject and body — a professional summary email suitable for the conveyancer to send to their client, covering high-priority items, recommended actions, and standard disclaimer
- Reference specific Victorian legislation, sections and standard conveyancing practice where relevant

Apply Victorian property law expertise throughout. Be thorough — this is a professional tool.`
}

// ─── JSON schemas ─────────────────────────────────────────────────────────────

const S32_SCHEMA = `{
  "document_type": "s32",
  "property_address": "",
  "lot_details": "",
  "vendor_names": "",
  "items_detected_count": 0,
  "document_summary": "",
  "risk_score": 0,
  "risk_summary": "",
  "items_detected": [{"severity":"high|medium|low","category":"","issue":"","context":"","recommendation":"","suggested_action":""}],
  "sections": {
    "title_and_ownership": {
      "status":"clear|issues|not_provided",
      "ct_number":"","lot_plan":"","volume_folio":"","registered_proprietors":"",
      "encumbrances":[{"type":"mortgage|covenant|caveat|agreement|easement","reference":"","detail":"","expiry":""}],
      "findings":[],"summary":""
    },
    "planning_and_zoning": {
      "status":"clear|issues|not_provided",
      "zone":"","zone_description":"","overlays":[],"gaic_applicable":false,"gaic_amount":"",
      "findings":[],"summary":""
    },
    "easements_and_covenants": {
      "status":"clear|issues|not_provided",
      "items":[{"type":"","reference":"","description":"","expiry":""}],
      "findings":[],"summary":""
    },
    "building_permits": {
      "status":"clear|issues|not_provided",
      "permits":[{"number":"","date":"","description":"","value":"","surveyor":""}],
      "findings":[],"summary":""
    },
    "owners_corporation": {
      "status":"clear|issues|not_applicable",
      "applicable":false,"oc_number":"","annual_fee":"","special_levies":"","lot_liability":"","lot_entitlement":"",
      "findings":[],"summary":""
    },
    "outgoings": {
      "status":"clear|issues|not_provided",
      "council_name":"","council_rates":"","civ":"","nav":"","avpcc":"",
      "water_authority":"","water_charges":"","unpaid_water_balance":"",
      "land_tax":"","windfall_gains_tax":"",
      "findings":[],"summary":""
    },
    "vendor_disclosure": {
      "status":"clear|issues|incomplete",
      "road_access":true,"services_connected":[],
      "existing_tenancy":{"exists":false,"tenant_name":"","rent_amount":"","end_date":""},
      "findings":[],"summary":""
    }
  },
  "questions_to_explore":[],
  "also_present":[],
  "positive_findings":[],
  "skipped_pages_note":"",
  "email_draft":{"subject":"","body":""},
  "disclaimer":"${DISCLAIMER}"
}`

const CONTRACT_SCHEMA = `{
  "document_type": "contract",
  "property_address": "",
  "items_detected_count": 0,
  "document_summary": "",
  "items_detected": [{"severity":"high|medium|low","category":"","issue":"","context":"","recommendation":"","suggested_action":""}],
  "risk_score": 0,
  "risk_summary": "",
  "sections": {
    "price_and_deposit": {
      "status":"clear|issues|not_provided",
      "purchase_price":"","deposit_amount":"","deposit_due":"","deposit_holder":"",
      "findings":[],"summary":""
    },
    "settlement": {
      "status":"clear|issues|not_provided",
      "settlement_date":"","settlement_type":"fixed|on_or_before|other",
      "findings":[],"summary":""
    },
    "special_conditions": {
      "status":"clear|issues|not_provided",
      "conditions":[{"number":"","summary":"","complexity":"standard|non-standard|requires_review","verbatim":""}],
      "findings":[],"summary":""
    },
    "goods_and_chattels": {
      "status":"clear|issues|not_provided",
      "included":[],"excluded":[],
      "findings":[],"summary":""
    },
    "cooling_off": {
      "status":"clear|issues|not_provided",
      "period":"3 business days","waived":false,
      "findings":[],"summary":""
    },
    "gst_and_tax": {
      "status":"clear|issues|not_provided",
      "gst_applicable":false,"margin_scheme":false,
      "findings":[],"summary":""
    },
    "penalty_and_risk": {
      "status":"clear|issues|not_provided",
      "penalty_interest_rate":"",
      "findings":[],"summary":""
    }
  },
  "questions_to_explore":[],
  "also_present":[],
  "positive_findings":[],
  "skipped_pages_note":"",
  "disclaimer":"${DISCLAIMER}"
}`

// ─── call2_analyse — policy-aware ────────────────────────────────────────────

async function call2_analyse(
  budget: TokenBudget,
  extractedText: Record<number, string>,
  fullResImages: Record<number, string>,
  pageIndex: PageIndex[],
  pass: 's32' | 'contract',
  model: string,
  maxTokens: number,
  policy: Record<string, boolean> | null   // ← policy added
): Promise<any> {

  // Append policy suffix to base system prompt
  const baseSystem = pass === 's32' ? S32_SYSTEM : CONTRACT_SYSTEM
  const system     = baseSystem + buildPolicyPromptSuffix(policy)
  const schema     = pass === 's32' ? S32_SCHEMA : CONTRACT_SCHEMA
  const label      = pass === 's32' ? 'Section 32 Vendor Statement' : 'Contract of Sale'

  const relevant = pass === 's32'
    ? new Set(['section_32','title_search','plan_of_subdivision','council_rates',
               'water_statement','clearance_certificate','building_permits',
               'oc_certificate','insurance','planning_certificate'])
    : new Set(['contract_of_sale','building_permits','oc_certificate','insurance'])

  const content: Anthropic.ContentBlockParam[] = []

  const textParts: string[] = []
  let currentType = ''

  for (const pageNum of budget.textPages) {
    const entry = pageIndex.find(e => e.page === pageNum)
    if (!entry || !relevant.has(entry.doc_type)) continue

    const text = extractedText[pageNum] || ''
    if (!text.trim()) continue

    if (entry.doc_type !== currentType) {
      textParts.push(`\n\n=== ${entry.doc_type.toUpperCase().replace(/_/g, ' ')} ===`)
      currentType = entry.doc_type
    }

    if (GC_PATTERN.test(text) && text.length > 800) {
      textParts.push(`[Page ${pageNum}] <STANDARD_VIC_GENERAL_CONDITIONS/>`)
    } else {
      textParts.push(`[Page ${pageNum}]\n${text}`)
    }
  }

  if (textParts.length > 0) {
    content.push({ type: 'text', text: textParts.join('\n') })
  }

  for (const { page: pageNum, doc_type } of budget.imagePages) {
    const entry = pageIndex.find(e => e.page === pageNum)
    if (!entry || !relevant.has(entry.doc_type)) continue

    const b64 = fullResImages[pageNum]
    if (!b64) continue

    content.push({
      type: 'text',
      text: `\n[Page ${pageNum} — ${doc_type.replace(/_/g, ' ')} — full resolution]`,
    })
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
    })
  }

  if (budget.skippedPages.length > 0) {
    const note = budget.skippedPages.map(s => `p${s.page}:${s.doc_type}`).join(', ')
    content.push({ type: 'text', text: `\n[Skipped pages: ${note}]` })
  }

  content.push({
    type: 'text',
    text: `\nAnalyse the above ${label}. Extract ALL exact figures. Return ONLY valid JSON, no markdown:\n${schema}`,
  })

  if (content.length === 0 || content.length === 1) {
    return pass === 's32'
      ? { document_type: 's32', items_detected_count: 0, document_summary: 'Document content not found', items_detected: [], sections: {}, disclaimer: DISCLAIMER }
      : { document_type: 'contract', items_detected_count: 0, document_summary: 'Document content not found', items_detected: [], sections: {}, disclaimer: DISCLAIMER }
  }

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content }],
  })

  return parseJson(response, label)
}

// ─── Auto-split for oversized documents ──────────────────────────────────────

async function call2_split(
  budget: TokenBudget,
  extractedText: Record<number, string>,
  fullResImages: Record<number, string>,
  pageIndex: PageIndex[],
  pass: 's32' | 'contract',
  model: string,
  maxTokens: number,
  policy: Record<string, boolean> | null   // ← policy added
): Promise<any> {
  const half    = Math.ceil(budget.textPages.length / 2)
  const imgHalf = Math.ceil(budget.imagePages.length / 2)

  const [r1, r2] = await Promise.all([
    call2_analyse(
      { ...budget, textPages: budget.textPages.slice(0, half), imagePages: budget.imagePages.slice(0, imgHalf) },
      extractedText, fullResImages, pageIndex, pass, model, maxTokens, policy
    ),
    call2_analyse(
      { ...budget, textPages: budget.textPages.slice(half), imagePages: budget.imagePages.slice(imgHalf) },
      extractedText, fullResImages, pageIndex, pass, model, maxTokens, policy
    ),
  ])

  if (!r1) return r2
  if (!r2) return r1
  return {
    ...r1,
    items_detected_count:  (r1.items_detected_count || 0) + (r2.items_detected_count || 0),
    document_summary:      [r1.document_summary, r2.document_summary].filter(Boolean).join(' '),
    items_detected:        [...(r1.items_detected || []),        ...(r2.items_detected || [])],
    questions_to_explore:  [...(r1.questions_to_explore || []),  ...(r2.questions_to_explore || [])],
    also_present:          [...(r1.also_present || []),          ...(r2.also_present || [])],
    positive_findings:     [...(r1.positive_findings || []),     ...(r2.positive_findings || [])],
    sections: mergeSection(r1.sections, r2.sections),
  }
}

function mergeSection(s1: any, s2: any): any {
  if (!s1) return s2
  if (!s2) return s1
  const merged = { ...s1 }
  for (const [k, v] of Object.entries(s2 as Record<string, any>)) {
    if (!merged[k] || (merged[k] as any).status === 'not_provided') merged[k] = v
  }
  return merged
}

function estimateCall2Tokens(budget: TokenBudget, extractedText: Record<number, string>): number {
  const textTokens = budget.textPages.reduce((sum, p) => {
    const text  = extractedText[p] || ''
    const isGC  = GC_PATTERN.test(text) && text.length > 800
    const chars = isGC ? Math.floor(text.length * 0.15) : text.length
    return sum + Math.ceil(chars / CHARS_PER_TOKEN)
  }, 0)
  return textTokens + budget.imagePages.length * TOKENS_PER_FULL_IMG + CALL2_PROMPT_TOKENS
}

function parseJson(response: Anthropic.Message, label: string): any {
  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

  // Log stop reason — if max_tokens was hit, JSON will be truncated
  const stopReason = (response as any).stop_reason
  if (stopReason === 'max_tokens') {
    console.warn(`[PropertyOwl] ${label}: hit max_tokens — JSON may be truncated. Increase max_tokens in Admin → LLM Settings.`)
  }

  // Strip markdown fences
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  // Attempt 1 — clean parse
  try { return JSON.parse(cleaned) } catch {}

  // Attempt 2 — find last complete top-level closing brace
  const last = cleaned.lastIndexOf('\n}')
  if (last > 0) {
    try { return JSON.parse(cleaned.substring(0, last + 2)) } catch {}
  }

  // Attempt 3 — truncated mid-string: close all open structures
  // Count open braces/brackets and close them
  try {
    let depth = 0
    let inStr = false
    let escaped = false
    const chars: string[] = []
    for (const ch of cleaned) {
      if (escaped) { escaped = false; chars.push(ch); continue }
      if (ch === '\\' && inStr) { escaped = true; chars.push(ch); continue }
      if (ch === '"') inStr = !inStr
      if (!inStr) {
        if (ch === '{' || ch === '[') depth++
        if (ch === '}' || ch === ']') depth--
      }
      chars.push(ch)
    }
    // Close any unterminated string
    let partial = chars.join('')
    if (inStr) partial += '"'
    // Close any open objects/arrays from innermost to outermost
    // We need to figure out the nesting stack — simpler: just append closing chars
    const stack: string[] = []
    let inS = false
    let esc = false
    for (const ch of partial) {
      if (esc) { esc = false; continue }
      if (ch === '\\' && inS) { esc = true; continue }
      if (ch === '"') { inS = !inS; continue }
      if (!inS) {
        if (ch === '{') stack.push('}')
        else if (ch === '[') stack.push(']')
        else if (ch === '}' || ch === ']') stack.pop()
      }
    }
    const closed = partial + stack.reverse().join('')
    try { return JSON.parse(closed) } catch {}
  } catch {}

  // Attempt 4 — extract whatever partial data we can, return safe default
  console.error(`[PropertyOwl] ${label}: all JSON parse attempts failed. Raw length: ${raw.length}. Stop reason: ${stopReason}`)
  throw new Error(`Malformed JSON response for ${label} — try increasing Max Tokens in Admin → LLM Settings`)
}

// ─── Risk score helper ────────────────────────────────────────────────────────

// Items count — stored in risk_score DB column for backward compat
// This is NOT a risk ranking — it is purely a count of detected items
const computeRiskScore = (flags: any[]): number => {
  if (!flags || flags.length === 0) return 0
  return flags.length
}

// ─── Worker Handler ───────────────────────────────────────────────────────────
// Called by /api/analyze/start — runs the full analysis and updates job status

async function updateJob(supabase: any, jobId: string, status: string, label: string) {
  await supabase.from('analysis_jobs')
    .update({ status, stage_label: label, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

export async function POST(request: NextRequest) {
  // Use service role for worker — it's called server-to-server, not by browser
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let jobId = ''

  try {
    const body = await request.json()
    jobId = body.jobId
    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

    // Load job
    const { data: job } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const { user_id: userId, property_id: propertyId, file_path: filePath } = job

    // Load profile — now includes user_type and conveyancer verification status
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, user_type, conveyancer_verified, conveyancer_pending_approval')
      .eq('id', userId)
      .single()

    if (!profile || profile.credits < 2) {
      await supabase.from('analysis_jobs')
        .update({ status: 'error', error: 'Insufficient credits', updated_at: new Date().toISOString() })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
    }

    // Load LLM config
    const { data: llmConfig } = await supabase.from('app_settings').select('value').eq('key', 'llm_config').single()
    const config    = (llmConfig?.value as any) || {}
    const model     = config.model      || 'claude-haiku-4-5-20251001'
    // ── Load user type policy ──────────────────────────────────────────────────
    // Determines which analytical capabilities the LLM uses for this user
    const { data: policySetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'user_type_policies')
      .single()

    const allPolicies = (policySetting?.value as Record<string, Record<string, boolean>>) || {}
    const userType    = profile.user_type || 'buyer'

    // Conveyancers who haven't been verified yet get facts-only mode
    // until an admin approves them via the admin/users page
    let effectiveUserType = userType
    if (userType === 'conveyancer' && !profile.conveyancer_verified) {
      effectiveUserType = 'buyer'
      console.log(`[PropertyOwl Worker] Conveyancer ${userId} not yet verified — using facts-only mode`)

    }

    // Professional mode needs more tokens for recommendations + email draft.
    // Always floor at 16000 for conveyancer/lawyer regardless of admin setting.
    const isProfessionalRun = ['conveyancer', 'lawyer'].includes(effectiveUserType)
    const maxTokens = config.max_tokens
      ? Math.max(config.max_tokens, isProfessionalRun ? 16000 : 4000)
      : isProfessionalRun ? 16000 : 8000

    // If no policies saved in DB yet, apply sensible defaults:
    // professionals get full analysis, everyone else gets facts-only
    const PROFESSIONAL_TYPES = ['conveyancer', 'lawyer']
    let userPolicy: Record<string, boolean> | null = allPolicies[effectiveUserType] ?? null

    if (!userPolicy) {
      // No policy configured — use safe defaults
      if (PROFESSIONAL_TYPES.includes(effectiveUserType)) {
        userPolicy = {
          facts_only_mode: false,
          show_risk_score: true,
          show_red_flags: true,
          show_risk_summary: true,
          show_issues: true,
          show_llm_recommendations: true,
          show_suggested_actions: true,
        }
        console.log(`[PropertyOwl Worker] No policy found for ${effectiveUserType} — using full professional default`)
      } else {
        userPolicy = { facts_only_mode: true }
        console.log(`[PropertyOwl Worker] No policy found for ${effectiveUserType} — using facts-only default`)
      }
    }
    console.log(`[PropertyOwl Worker] User type: ${userType}, effective: ${effectiveUserType}, facts_only: ${userPolicy?.facts_only_mode ?? true}`)

    // Stage 1 — download PDF
    await updateJob(supabase, jobId, 'extracting', 'Downloading your document…')
    const { data: pdfBlob, error: dlError } = await supabase.storage
      .from('property-documents').download(filePath)
    if (dlError || !pdfBlob) throw new Error('Could not download file: ' + dlError?.message)

    // Stage 2 — Railway extracts text + thumbnails
    await updateJob(supabase, jobId, 'extracting', 'Reading all pages — extracting text and structure…')
    const { totalPages, extractedText, thumbnails } = await getPdfData(pdfBlob)
    console.log(`[PropertyOwl Worker] ${totalPages} pages`)

    // Stage 3 — Claude maps document
    await updateJob(supabase, jobId, 'mapping', `Classifying ${totalPages} pages — identifying S32, contract, plans…`)
    const pageIndex = await call1_mapDocument(thumbnails, totalPages, model)
    const imgCount  = pageIndex.filter(p => p.send_as === 'full_image').length
    console.log(`[PropertyOwl Worker] ${imgCount} image pages`)

    const budget = buildTokenBudget(pageIndex, extractedText)

    // Stage 4 — full res images
    await updateJob(supabase, jobId, 'analysing', `Rendering ${imgCount} diagram pages in high resolution…`)
    const fullResImages = await renderFullResPages(pdfBlob, budget.imagePages.map(p => p.page))

    const estTokens  = estimateCall2Tokens(budget, extractedText)
    const needsSplit = estTokens > SAFE_TOKEN_LIMIT
    const analyser   = needsSplit ? call2_split : call2_analyse

    // Stage 5 — S32 analysis (policy-aware)
    await updateJob(supabase, jobId, 'analysing', 'Extracting Section 32 information…')
    const s32Analysis = await analyser(budget, extractedText, fullResImages, pageIndex, 's32', model, maxTokens, userPolicy)

    // Stage 6 — Contract analysis (policy-aware)
    await updateJob(supabase, jobId, 'analysing', 'Extracting Contract of Sale information…')
    const contractAnalysis = await analyser(budget, extractedText, fullResImages, pageIndex, 'contract', model, maxTokens, userPolicy)

    // Stage 7 — Save results
    await updateJob(supabase, jobId, 'saving', 'Organising extracted information…')
    const s32Score      = computeRiskScore(s32Analysis.items_detected ?? [])
    const contractScore = computeRiskScore(contractAnalysis.items_detected ?? [])
    s32Analysis.items_detected_count      = s32Score
    contractAnalysis.items_detected_count = contractScore

    // Store user type in results for audit trail
    s32Analysis.generated_for_user_type      = userType
    s32Analysis.effective_user_type          = effectiveUserType
    contractAnalysis.generated_for_user_type = userType
    contractAnalysis.effective_user_type     = effectiveUserType

    await supabase.from('profiles').update({ credits: profile.credits - 2 }).eq('id', userId)

    await supabase.from('reports').insert([
      {
        user_id: userId, property_id: propertyId, document_type: 's32',
        raw_analysis: s32Analysis, risk_score: s32Score,
        red_flags: s32Analysis.items_detected ?? [], status: 'completed',
      },
      {
        user_id: userId, property_id: propertyId, document_type: 'contract',
        raw_analysis: contractAnalysis, risk_score: contractScore,
        red_flags: contractAnalysis.items_detected ?? [], status: 'completed',
      },
    ])

    const combinedRisk = Math.max(s32Score, contractScore)
    await supabase.from('properties').update({
      s32_reviewed:         true,
      risk_score:           combinedRisk,
      s32_file_path:        filePath,
      s32_uploaded_at:      new Date().toISOString(),
      contract_file_path:   filePath,
      contract_uploaded_at: new Date().toISOString(),
    }).eq('id', propertyId)

    await supabase.from('activity_log').insert({
      user_id: userId,
      event_type: 'report_run',
      event_detail: {
        property_id: propertyId, total_pages: totalPages,
        text_pages: budget.textPages.length, image_pages: budget.imagePages.length,
        skipped_pages: budget.skippedPages.length, auto_split: needsSplit,
        estimated_tokens: estTokens,
        s32_items: s32Score, contract_items: contractScore,
        user_type: userType, effective_user_type: effectiveUserType,
      },
    })

    // Mark done
    await supabase.from('analysis_jobs')
      .update({ status: 'done', stage_label: 'Analysis complete ✓', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[PropertyOwl Worker] Error:', err)
    if (jobId) {
      const { createClient: sc } = await import('@supabase/supabase-js')
      const supa = sc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await supa.from('analysis_jobs')
        .update({ status: 'error', error: err.message || 'Unknown error', updated_at: new Date().toISOString() })
        .eq('id', jobId)
    }
    return NextResponse.json({ error: err.message || 'Worker failed' }, { status: 500 })
  }
}
