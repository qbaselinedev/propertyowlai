import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SCAN_SYSTEM = `You are PropertyOwl AI, an expert Victorian property analyst. 
A buyer wants a pre-bid intelligence report on a Victorian residential property.
You have access to web search — use it to research the property thoroughly.

RESEARCH TASKS (search for each):
1. Planning zone — search "[address] planning zone Victoria" or use VicPlan/PlanningMaps
2. Planning overlays — heritage, flood, bushfire, design, environmental, vegetation overlays
3. Council area and council website
4. School zones — primary and secondary (findmyschool.vic.gov.au)
5. Flood risk — search "[address] flood risk Victoria" or check relevant water authority
6. Bushfire risk / Bushfire Management Overlay
7. Recent planning permits or applications for the property or nearby
8. Suburb profile — median prices, growth, rental yield if available
9. Infrastructure — nearby transport, major developments planned
10. Any notable issues — contamination, heritage listing, significant tree overlays
11. Property history — search "[address] sold history" on Domain/realestate.com.au/CoreLogic for:
    - Year built (if available)
    - Past sale dates and prices
    - Past rental/lease history
    - Any significant renovations listed

IMPORTANT RULES:
- Search multiple times with different queries to get comprehensive data
- If you find conflicting information, note it and use the most authoritative source
- Always note the source/date of information found
- Be honest about what you could not find
- Do NOT make up data — if you cannot find something, say "Not found in public data"
- This is informational only — always recommend engaging a conveyancer

CRITICAL OUTPUT RULES:
- Return ONLY the raw JSON object. No markdown code blocks. No preamble. No explanation after.
- Keep all string values concise — max 150 characters per field
- The ENTIRE response must be valid parseable JSON
- Start your response with { and end with }`

const SCAN_SCHEMA = `{
  "address": "",
  "suburb": "",
  "state": "VIC",
  "postcode": "",
  "council": "",
  "scan_date": "",
  "data_sources": ["list of URLs/sources consulted"],
  "planning": {
    "zone_code": "",
    "zone_name": "",
    "zone_description": "",
    "zone_implications": "",
    "overlays": [{"code": "", "name": "", "description": "", "implication": ""}],
    "gaic_applicable": false,
    "urban_growth_boundary": false,
    "planning_permits_nearby": []
  },
  "environment": {
    "flood_risk": "none|low|medium|high|unknown",
    "flood_detail": "",
    "bushfire_risk": "none|low|medium|high|unknown",
    "bushfire_detail": "",
    "contamination_risk": "none|low|medium|high|unknown",
    "contamination_detail": "",
    "significant_trees": false,
    "significant_trees_detail": ""
  },
  "education": {
    "primary_school": "",
    "primary_school_zone": false,
    "secondary_school": "",
    "secondary_school_zone": false,
    "notes": ""
  },
  "infrastructure": {"public_transport": "", "major_developments": ""},
  "suburb_profile": {"median_house_price": "", "median_unit_price": "", "price_growth_12m": "", "rental_yield": "", "data_date": ""},
  "property_history": [
    {"year": "", "event": "built|sold|leased|listed|renovated|other", "price": "", "detail": ""}
  ],
  "findings": [
    {"severity": "high|medium|low|info", "category": "", "finding": "", "implication": ""}
  ],
  "positive_findings": [],
  "limitations": ["list of things that could not be found or verified"],
  "summary": "",
  "disclaimer": "This Online Property Scan is based on publicly available data retrieved by AI web search. It is for informational purposes only and does not constitute legal, planning, or financial advice. Data may be incomplete, outdated, or inaccurate. Always engage a licensed Victorian conveyancer and obtain official planning certificates before making property decisions.",
  "scan_type": "online_scan"
}`

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { propertyId } = await req.json()
  if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 })

  // Check and deduct 1 credit for scan
  const { data: profile } = await supabase
    .from('profiles').select('credits').eq('id', user.id).single()
  if (!profile || profile.credits < 1) {
    return NextResponse.json({
      error: 'Insufficient credits',
      credits: profile?.credits ?? 0,
      required: 1,
      buy_url: '/dashboard/buy-credits',
    }, { status: 402 })
  }
  await supabase.from('profiles').update({ credits: profile.credits - 1 }).eq('id', user.id)

  // Fetch property details
  const { data: property, error: propErr } = await supabase
    .from('properties').select('*').eq('id', propertyId).eq('user_id', user.id).single()
  if (propErr || !property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  // Build full address string
  const fullAddress = [
    property.address,
    property.suburb,
    'VIC',
    property.postcode,
  ].filter(Boolean).join(', ')

  console.log(`[PropertyOwl Scan] Starting scan for: ${fullAddress}`)

  try {
    // Call Claude with web search enabled
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',  // faster + cheaper for scan
      max_tokens: 5000,
      system: SCAN_SYSTEM,
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages: [{
        role: 'user',
        content: `Please conduct a comprehensive Online Property Scan for the following Victorian property and return the results as JSON matching the schema exactly.

PROPERTY: ${fullAddress}
${property.property_type ? `TYPE: ${property.property_type}` : ''}
${property.price ? `LISTED PRICE: $${property.price.toLocaleString()}` : ''}

SCHEMA TO FOLLOW:
${SCAN_SCHEMA}

Search thoroughly for planning data, overlays, flood/bushfire risk, school zones, suburb data and any other relevant public information. Today's date is ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`
      }]
    })

    // Extract the final text response (after all tool use)
    const finalText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    if (!finalText) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Parse JSON — robust multi-strategy parsing
    let scanData: any
    try {
      const cleaned = finalText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      // Strategy 1: direct parse
      try {
        scanData = JSON.parse(cleaned)
      } catch {
        // Strategy 2: extract largest {...} block
        const match = cleaned.match(/\{[\s\S]+\}/)
        if (match) {
          try {
            scanData = JSON.parse(match[0])
          } catch {
            // Strategy 3: fix common issues — trailing commas, unescaped quotes
            const fixed = match[0]
              .replace(/,\s*([}\]])/g, '$1')        // remove trailing commas
              .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // unquoted keys
            scanData = JSON.parse(fixed)
          }
        }
      }
    } catch (parseErr: any) {
      console.error('[PropertyOwl Scan] JSON parse error:', parseErr?.message)
      console.error('[PropertyOwl Scan] Raw response (first 500 chars):', finalText.substring(0, 500))
      // Return a minimal valid scan with an error note
      scanData = {
        scan_type: 'online_scan',
        scan_date: new Date().toISOString(),
        address: property.address,
        suburb: property.suburb,
        summary: 'Scan completed but results could not be fully parsed. Please try re-running the scan.',
        findings: [{ severity: 'info', category: 'System', finding: 'Scan data parsing issue — please re-run the scan.', implication: '' }],
        positive_findings: [],
        limitations: ['Scan response could not be fully parsed'],
        data_sources: [],
        planning: { zone_code: '', zone_name: '', overlays: [] },
        environment: { flood_risk: 'unknown', bushfire_risk: 'unknown', contamination_risk: 'unknown' },
        education: {},
        suburb_profile: {},
        disclaimer: 'This Online Property Scan is based on publicly available data. It is for informational purposes only.'
      }
    }

    // Normalise — ensure array fields contain strings not objects
    const toStringArray = (arr: any[]): string[] =>
      (arr || []).map((item: any) =>
        typeof item === 'string' ? item :
        item?.finding || item?.benefit || item?.item || item?.name || item?.url || item?.source || JSON.stringify(item)
      )

    if (Array.isArray(scanData.positive_findings))
      scanData.positive_findings = toStringArray(scanData.positive_findings)
    if (Array.isArray(scanData.limitations))
      scanData.limitations = toStringArray(scanData.limitations)
    if (Array.isArray(scanData.data_sources))
      scanData.data_sources = toStringArray(scanData.data_sources)

    // Ensure scan_type is set
    scanData.scan_type = 'online_scan'
    scanData.scan_date = new Date().toISOString()

    // Save to reports table
    // NOTE: if this fails with a constraint error, run this SQL in Supabase:
    // ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_document_type_check;
    // ALTER TABLE reports ADD CONSTRAINT reports_document_type_check
    //   CHECK (document_type IN ('s32', 'contract', 'online_scan'));
    const insertPayload = {
      user_id: user.id,
      property_id: propertyId,
      document_type: 'online_scan',
      raw_analysis: scanData,
      risk_score: null as null,
      red_flags: (scanData.findings || []).filter((f: any) => f.severity === 'high' || f.severity === 'medium'),
      status: 'completed',
    }

    const { data: savedReport, error: saveErr } = await supabase
      .from('reports').insert(insertPayload).select().single()

    if (saveErr) {
      console.error('[PropertyOwl Scan] Save error code:', saveErr.code)
      console.error('[PropertyOwl Scan] Save error message:', saveErr.message)
      console.error('[PropertyOwl Scan] Save error details:', saveErr.details)
      // Return the scan data anyway so user sees results even if save failed
      return NextResponse.json({
        error: 'Failed to save scan results',
        detail: saveErr.message,
        db_hint: "Run this SQL in Supabase: ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_document_type_check; ALTER TABLE reports ADD CONSTRAINT reports_document_type_check CHECK (document_type IN ('s32', 'contract', 'online_scan'));",
        data: scanData  // still return data so frontend can display it
      }, { status: 500 })
    }

    // Update property to mark scan done
    await supabase.from('properties').update({
      s32_reviewed: false, // scan doesn't count as S32 review
    }).eq('id', propertyId)

    // Log activity
    try {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        event_type: 'scan_run',
        event_detail: { property_id: propertyId, address: fullAddress },
      })
    } catch {}

    console.log(`[PropertyOwl Scan] Complete for: ${fullAddress}`)
    return NextResponse.json({ success: true, reportId: savedReport.id, data: scanData })

  } catch (e: any) {
    console.error('[PropertyOwl Scan] Error:', e?.message)
    return NextResponse.json({ error: 'Scan failed: ' + e?.message }, { status: 500 })
  }
}
