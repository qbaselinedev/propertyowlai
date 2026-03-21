import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

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

const DISCLAIMER = 'This is an informal AI-assisted review only and does not constitute legal advice. PropertyOwl AI is not a licensed conveyancer or solicitor. Always engage a qualified Victorian conveyancer or solicitor before signing any property contract.'

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

// ─── Node.js PDF helpers (pdfjs-dist pure-JS, no native canvas) ──────────────

pdfjs.GlobalWorkerOptions.workerSrc = ''

// Minimal no-op canvas factory so pdfjs doesn't crash without a real canvas
// We only use it for text extraction; image rendering falls back gracefully
class NodeCanvasFactory {
  create(width: number, height: number) {
    // Return a stub — we don't actually render to canvas for text extraction
    return { canvas: null, context: null }
  }
  reset(canvasAndContext: any, width: number, height: number) {}
  destroy(canvasAndContext: any) {}
}

async function loadPdf(pdfPath: string) {
  const { readFileSync } = await import('fs')
  const data = new Uint8Array(readFileSync(pdfPath))
  return pdfjs.getDocument({
    data,
    disableFontFace: true,
    verbosity: 0,
    canvasFactory: new NodeCanvasFactory() as any,
  }).promise
}

async function getPageCount(pdfPath: string): Promise<number> {
  const doc   = await loadPdf(pdfPath)
  const count = doc.numPages
  doc.destroy()
  return count
}

// Thumbnails: since we have no real canvas, return empty strings.
// Call 1 (document mapping) will skip visual classification and
// fall back to treating all pages as text — still works well for
// standard Victorian contracts which are almost entirely text-based.
async function generateThumbnails(pdfPath: string, pageCount: number): Promise<string[]> {
  return Array(pageCount).fill('')
}

async function extractAllText(pdfPath: string): Promise<Record<number, string>> {
  const doc    = await loadPdf(pdfPath)
  const result: Record<number, string> = {}

  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page    = await doc.getPage(i)
      const content = await page.getTextContent()
      const text    = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      result[i] = text
      page.cleanup()
    } catch {
      result[i] = ''
    }
  }

  doc.destroy()
  return result
}

// Full-res images: no canvas available, return empty — pages will be
// sent as text instead. Plans of subdivision won't render visually
// but all text content is still extracted and analysed.
async function renderFullResPages(pdfPath: string, pages: number[]): Promise<Record<number, string>> {
  return {}
}

// ─── CALL 1: Document Mapping ─────────────────────────────────────────────────

const CALL1_SYSTEM = `You are a Victorian property document classifier.

You receive thumbnail images of every page in a property document (S32 Vendor Statement and/or Contract of Sale).

DOCUMENT TYPES to identify:
contract_of_sale      — Contract pages: particulars, general conditions, special conditions, guarantee
section_32            — S32 vendor statement: outgoings, title, planning, GAIC, services
title_search          — LANDATA Register Search Statement listing encumbrances as readable text
landata_cover         — "Imaged Document Cover Sheet" — a text cover page before scanned LANDATA images
plan_of_subdivision   — Lot diagrams showing easement locations graphically (PS numbers)
council_rates         — Rate notice: property value, council rates, levies (vector image, sparse text)
water_statement       — Water authority information statement (South East Water, Melbourne Water etc)
clearance_certificate — SRO Property Clearance Certificate (land tax, windfall gains tax)
building_permits      — Building permit register, Form 2, Form 16 from building surveyor
oc_certificate        — Owners Corporation certificate: annual fees, special levies
insurance             — Domestic building warranty insurance certificate
planning_certificate  — Planning certificate: zone, overlays
due_diligence         — Consumer Affairs Victoria due diligence checklist (standard government doc)
unknown_image         — Image page that cannot be classified

SEND_AS RULES:
"text"       — Page has extractable text (pdfplumber can read it). Includes: contract, s32, title_search (if text visible), water, clearance, building permits, insurance, planning cert, due diligence
"full_image" — Page is graphical/scanned OR has figures only visible as image. Includes: plan_of_subdivision (ALWAYS), council_rates (usually), any unknown image pages
"skip"       — Duplicates, blank pages, landata_cover pages themselves, pages already captured

CRITICAL:
1. plan_of_subdivision → ALWAYS "full_image" (easement diagrams can't be captured as text)
2. landata_cover page itself → "skip" (but the pages after it are plan_of_subdivision or title instrument)
3. If the same document appears twice → skip the second copy
4. General conditions pages (GC1-33) → "text" but mark doc_type as "contract_of_sale"
5. title_search → "text" if LANDATA text header + encumbrance list are visible, otherwise "full_image"`

async function call1_mapDocument(
  thumbnails: string[],
  pageCount: number,
  model: string
): Promise<PageIndex[]> {

  const imageBlocks: Anthropic.ImageBlockParam[] = thumbnails
    .map((b64, i) => b64 ? {
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: b64 },
    } : null)
    .filter(Boolean) as Anthropic.ImageBlockParam[]

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: CALL1_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        ...imageBlocks,
        {
          type: 'text',
          text: `Above are all ${pageCount} page thumbnails of a Victorian property document.\n\nReturn ONLY a valid JSON array (no markdown, no preamble) with exactly ${pageCount} objects:\n[\n  {"page":1,"doc_type":"contract_of_sale","send_as":"text","readable":true,"notes":null}\n]\n\nOne object per page, in order 1 to ${pageCount}.`,
        },
      ],
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    console.warn('[PropertyOwl] Call 1 parse failed — using pdfplumber fallback')
    return fallbackClassification(pageCount)
  }
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

Review the Section 32 Vendor Statement content under Victorian law:
Sale of Land Act 1962, Transfer of Land Act 1958, Planning and Environment Act 1987,
Owners Corporations Act 2006, Building Act 1993, Subdivision Act 1988,
Environmental Protection Act 2017, Water Act 1989,
Commercial and Industrial Property Tax Reform Act 2024 (Vic).

EXTRACT EXACTLY — never say "not provided" if data is visible anywhere:
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

EXTRACT EXACTLY:
• Purchase price (exact $)
• Deposit: amount, due date, holder
• Settlement date and type (fixed / on or before)
• Special conditions: number each, summarise and copy verbatim, flag risk level
• Goods and chattels: included and excluded
• Cooling off: period, whether waived (3 business days standard for residential)
• GST: applicable, margin scheme
• Penalty interest rate
• Agent name and agency
• Re-settlement fee
• Any foreign investment / FIRB conditions
• Any sunset clauses

<STANDARD_VIC_GENERAL_CONDITIONS/>
Standard Victorian Contract General Conditions GC1-33 were present. Legally standardised — do not flag.

${DISCLAIMER}`

const S32_SCHEMA = `{
  "document_type": "s32",
  "property_address": "",
  "lot_details": "",
  "vendor_names": "",
  "risk_score": 1,
  "risk_summary": "",
  "red_flags": [{"severity":"high|medium|low","category":"","issue":"","recommendation":""}],
  "sections": {
    "title_and_ownership": {
      "status":"clear|issues|not_provided",
      "ct_number":"","lot_plan":"","volume_folio":"","registered_proprietors":"",
      "encumbrances":[{"type":"mortgage|covenant|caveat|agreement|easement","reference":"","detail":"","expiry":""}],
      "findings":[],"summary":""
    },
    "planning_and_zoning": {
      "status":"clear|issues|not_provided",
      "zone":"","overlays":[],"gaic_applicable":false,"gaic_amount":"",
      "findings":[],"summary":""
    },
    "easements_and_covenants": {
      "status":"clear|issues|not_provided",
      "items":[{"type":"","reference":"","description":"","expiry":"","diagram_page":null}],
      "findings":[],"summary":""
    },
    "building_permits": {
      "status":"clear|issues|not_provided",
      "permits":[{"number":"","date":"","description":"","value":"","surveyor":""}],
      "findings":[],"summary":""
    },
    "owners_corporation": {
      "applicable":false,"status":"clear|issues|not_applicable",
      "oc_number":"","annual_fee":"","special_levies":"","lot_liability":"","lot_entitlement":"",
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
      "findings":[],"summary":""
    }
  },
  "negotiation_points":[],
  "conveyancer_questions":[],
  "positive_findings":[],
  "skipped_pages_note":"",
  "disclaimer":"${DISCLAIMER}"
}`

const CONTRACT_SCHEMA = `{
  "document_type": "contract",
  "property_address": "",
  "risk_score": 1,
  "risk_summary": "",
  "red_flags": [{"severity":"high|medium|low","category":"","issue":"","recommendation":""}],
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
      "conditions":[{"number":"","summary":"","risk_level":"low|medium|high","verbatim":""}],
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
  "negotiation_points":[],
  "conveyancer_questions":[],
  "positive_findings":[],
  "skipped_pages_note":"",
  "disclaimer":"${DISCLAIMER}"
}`

async function call2_analyse(
  budget: TokenBudget,
  extractedText: Record<number, string>,
  fullResImages: Record<number, string>,
  pageIndex: PageIndex[],
  pass: 's32' | 'contract',
  model: string,
  maxTokens: number
): Promise<any> {

  const system = pass === 's32' ? S32_SYSTEM : CONTRACT_SYSTEM
  const schema = pass === 's32' ? S32_SCHEMA : CONTRACT_SCHEMA
  const label  = pass === 's32' ? 'Section 32 Vendor Statement' : 'Contract of Sale'

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
      ? { document_type: 's32', risk_score: 1, risk_summary: 'Document content not found', red_flags: [], sections: {}, disclaimer: DISCLAIMER }
      : { document_type: 'contract', risk_score: 1, risk_summary: 'Document content not found', red_flags: [], sections: {}, disclaimer: DISCLAIMER }
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
  maxTokens: number
): Promise<any> {
  const half    = Math.ceil(budget.textPages.length / 2)
  const imgHalf = Math.ceil(budget.imagePages.length / 2)

  const [r1, r2] = await Promise.all([
    call2_analyse(
      { ...budget, textPages: budget.textPages.slice(0, half), imagePages: budget.imagePages.slice(0, imgHalf) },
      extractedText, fullResImages, pageIndex, pass, model, maxTokens
    ),
    call2_analyse(
      { ...budget, textPages: budget.textPages.slice(half), imagePages: budget.imagePages.slice(imgHalf) },
      extractedText, fullResImages, pageIndex, pass, model, maxTokens
    ),
  ])

  if (!r1) return r2
  if (!r2) return r1
  return {
    ...r1,
    risk_score:            Math.max(r1.risk_score || 0, r2.risk_score || 0),
    risk_summary:          [r1.risk_summary, r2.risk_summary].filter(Boolean).join(' '),
    red_flags:             [...(r1.red_flags || []),             ...(r2.red_flags || [])],
    negotiation_points:    [...(r1.negotiation_points || []),    ...(r2.negotiation_points || [])],
    conveyancer_questions: [...(r1.conveyancer_questions || []), ...(r2.conveyancer_questions || [])],
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
  const raw     = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const last = cleaned.lastIndexOf('\n}')
    if (last > 0) {
      try { return JSON.parse(cleaned.substring(0, last + 2)) } catch {}
    }
    throw new Error(`Malformed JSON response for ${label}`)
  }
}

// ─── Risk score helper (module-level — fixes strict mode error) ───────────────

const computeRiskScore = (flags: any[]): number => {
  if (!flags || flags.length === 0) return 1
  const raw = flags.reduce((sum: number, f: any) => {
    if (f.severity === 'high')   return sum + 3.0
    if (f.severity === 'medium') return sum + 1.5
    return sum + 0.5
  }, 0)
  return Math.min(10, Math.max(1, Math.round(raw)))
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let tmpPdf: string | null = null

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('credits').eq('id', user.id).single()

    if (!profile || profile.credits < 2) {
      return NextResponse.json({
        error: `You need 2 credits for a full review. You have ${profile?.credits || 0} credit(s).`
      }, { status: 402 })
    }

    const formData   = await request.formData()
    const filePath   = formData.get('filePath') as string
    const propertyId = formData.get('propertyId') as string

    if (!filePath || !propertyId)
      return NextResponse.json({ error: 'Missing filePath or propertyId' }, { status: 400 })

    const { data: llmConfig } = await supabase.from('app_settings').select('value').eq('key', 'llm_config').single()
    const config    = (llmConfig?.value as any) || {}
    const model     = config.model      || 'claude-haiku-4-5-20251001'
    const maxTokens = config.max_tokens || 8000

    // Download the already-uploaded PDF from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from('property-documents')
      .download(filePath)
    if (dlError || !fileData)
      return NextResponse.json({ error: 'Could not download file: ' + dlError?.message }, { status: 500 })

    const buf = Buffer.from(await fileData.arrayBuffer())
    tmpPdf = join(tmpdir(), `owl_${Date.now()}.pdf`)
    writeFileSync(tmpPdf, buf)

    const totalPages = await getPageCount(tmpPdf)
    console.log(`[PropertyOwl] ${totalPages} pages — model: ${model}`)

    // ══ CALL 1 ════════════════════════════════════════════════════════
    console.log('[PropertyOwl] Call 1 — generating thumbnails...')
    const thumbnails = await generateThumbnails(tmpPdf, totalPages)

    console.log('[PropertyOwl] Call 1 — mapping document...')
    const pageIndex = await call1_mapDocument(thumbnails, totalPages, model)
    console.log(`[PropertyOwl] Call 1 done — ${pageIndex.filter(p => p.send_as === 'full_image').length} image pages, ${pageIndex.filter(p => p.send_as === 'text').length} text pages`)

    // ══ CALL 2 PREP ═══════════════════════════════════════════════════
    console.log('[PropertyOwl] Extracting text...')
    const extractedText = await extractAllText(tmpPdf)

    const budget = buildTokenBudget(pageIndex, extractedText)
    console.log(`[PropertyOwl] Budget — text:${budget.textPages.length}p image:${budget.imagePages.length}p skip:${budget.skippedPages.length}p`)

    console.log('[PropertyOwl] Rendering full-res image pages...')
    const fullResImages = await renderFullResPages(tmpPdf, budget.imagePages.map(p => p.page))

    const estTokens  = estimateCall2Tokens(budget, extractedText)
    const needsSplit = estTokens > SAFE_TOKEN_LIMIT
    const analyser   = needsSplit ? call2_split : call2_analyse
    console.log(`[PropertyOwl] Call 2 est ${estTokens} tokens — ${needsSplit ? 'SPLIT' : 'single call'}`)

    // ══ CALL 2 ════════════════════════════════════════════════════════
    console.log('[PropertyOwl] Call 2 — S32 analysis...')
    const s32Analysis = await analyser(budget, extractedText, fullResImages, pageIndex, 's32', model, maxTokens)

    console.log('[PropertyOwl] Call 2 — Contract analysis...')
    const contractAnalysis = await analyser(budget, extractedText, fullResImages, pageIndex, 'contract', model, maxTokens)

    // ══ SAVE RESULTS ══════════════════════════════════════════════════
    const s32Score      = computeRiskScore(s32Analysis.red_flags ?? [])
    const contractScore = computeRiskScore(contractAnalysis.red_flags ?? [])
    s32Analysis.risk_score      = s32Score
    contractAnalysis.risk_score = contractScore

    await supabase.from('profiles').update({ credits: profile.credits - 2 }).eq('id', user.id)

    await supabase.from('reports').insert([
      {
        user_id: user.id, property_id: propertyId, document_type: 's32',
        raw_analysis: s32Analysis, risk_score: s32Score,
        red_flags: s32Analysis.red_flags ?? [], status: 'completed',
      },
      {
        user_id: user.id, property_id: propertyId, document_type: 'contract',
        raw_analysis: contractAnalysis, risk_score: contractScore,
        red_flags: contractAnalysis.red_flags ?? [], status: 'completed',
      },
    ])

    const combinedRisk = Math.max(s32Score, contractScore)
    await supabase.from('properties').update({
      s32_reviewed:           true,
      risk_score:             combinedRisk,
      s32_file_path:          filePath,
      s32_uploaded_at:        new Date().toISOString(),
      contract_file_path:     filePath,
      contract_uploaded_at:   new Date().toISOString(),
    }).eq('id', propertyId)

    await supabase.from('activity_log').insert({
      user_id: user.id,
      event_type: 'report_run',
      event_detail: {
        property_id: propertyId,
        total_pages: totalPages,
        text_pages:  budget.textPages.length,
        image_pages: budget.imagePages.length,
        skipped_pages: budget.skippedPages.length,
        auto_split:    needsSplit,
        estimated_tokens: estTokens,
        s32_risk:      s32Analysis.risk_score,
        contract_risk: contractAnalysis.risk_score,
      },
    })

    return NextResponse.json({
      success: true,
      s32Analysis,
      contractAnalysis,
      meta: {
        totalPages,
        textPages:    budget.textPages.length,
        imagePages:   budget.imagePages.length,
        skippedPages: budget.skippedPages.length,
        autoSplit:    needsSplit,
        estimatedTokens: estTokens,
      },
    })

  } catch (err: any) {
    console.error('[PropertyOwl] Error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  } finally {
    if (tmpPdf && existsSync(tmpPdf)) try { unlinkSync(tmpPdf) } catch {}
  }
}