import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/backfill-page-images
 *
 * Backfills high-res page images for an existing property's reports
 * WITHOUT re-running any LLM analysis.
 *
 * Steps:
 *   1. Load existing s32 + contract reports for the property
 *   2. Collect all source_page numbers from items_detected
 *   3. Download the original PDF from storage
 *   4. Call Railway full-res renderer for just those pages
 *   5. Update raw_analysis.page_thumbnails in both reports
 *
 * Body: { propertyId: string }
 * Auth: admin only
 */

const PDF_SERVICE_URL    = process.env.PDF_SERVICE_URL    || ''
const PDF_SERVICE_SECRET = process.env.PDF_SERVICE_SECRET || ''

async function renderFullResPages(
  pdfBlob: Blob,
  pages: number[]
): Promise<Record<number, string>> {
  if (pages.length === 0) return {}

  const form = new FormData()
  form.append('file', pdfBlob, 'document.pdf')
  form.append('mode', 'full')
  form.append('pages', pages.join(','))

  const res = await fetch(`${PDF_SERVICE_URL}/process`, {
    method:  'POST',
    headers: { 'X-PDF-Secret': PDF_SERVICE_SECRET },
    body:    form,
  })

  if (!res.ok) throw new Error(`PDF service error ${res.status}: ${await res.text()}`)
  const result = await res.json()

  const out: Record<number, string> = {}
  for (const [k, v] of Object.entries(result.full_res || {})) {
    out[Number(k)] = v as string
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth: must be admin ────────────────────────────────────────────────────
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { propertyId } = body
    if (!propertyId) {
      return NextResponse.json({ error: 'Missing propertyId' }, { status: 400 })
    }

    // ── Use service role for DB reads/writes ───────────────────────────────────
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── Load property to get the PDF file path ─────────────────────────────────
    const { data: property, error: propErr } = await db
      .from('properties')
      .select('id, address, s32_file_path, contract_file_path')
      .eq('id', propertyId)
      .single()

    if (propErr || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const filePath = property.s32_file_path || property.contract_file_path
    if (!filePath) {
      return NextResponse.json({ error: 'No PDF file path found on property — has a document been analysed?' }, { status: 400 })
    }

    // ── Load existing reports ──────────────────────────────────────────────────
    const { data: reports, error: reportsErr } = await db
      .from('reports')
      .select('id, document_type, raw_analysis')
      .eq('property_id', propertyId)
      .in('document_type', ['s32', 'contract'])
      .order('created_at', { ascending: false })

    if (reportsErr || !reports || reports.length === 0) {
      return NextResponse.json({ error: 'No reports found for this property' }, { status: 404 })
    }

    // ── Collect all source_page numbers from all reports ───────────────────────
    const referencedPages = new Set<number>()
    for (const report of reports) {
      const items = report.raw_analysis?.items_detected ?? []
      items.forEach((item: any) => {
        if (item.source_page && item.source_page > 0) {
          referencedPages.add(Number(item.source_page))
        }
      })
    }

    if (referencedPages.size === 0) {
      return NextResponse.json({
        success: false,
        message: 'No source_page references found in existing reports. This property was analysed before the source_page feature was added — re-run the analysis to populate page references.',
        hint: 'Re-upload the document as a conveyancer to get the updated schema with source_page fields.'
      })
    }

    const pagesList = Array.from(referencedPages).sort((a, b) => a - b)
    console.log(`[backfill-page-images] Property ${propertyId}: fetching pages ${pagesList.join(', ')} at full-res`)

    // ── Download the original PDF from Supabase Storage ────────────────────────
    const { data: pdfBlob, error: dlError } = await db.storage
      .from('property-documents')
      .download(filePath)

    if (dlError || !pdfBlob) {
      return NextResponse.json({
        error: 'Could not download PDF: ' + (dlError?.message ?? 'unknown error'),
        filePath,
      }, { status: 500 })
    }

    // ── Call Railway for full-res images of just those pages ───────────────────
    if (!PDF_SERVICE_URL) {
      return NextResponse.json({ error: 'PDF_SERVICE_URL not configured' }, { status: 500 })
    }

    console.log(`[backfill-page-images] Calling Railway for ${pagesList.length} pages…`)
    const fullResImages = await renderFullResPages(pdfBlob, pagesList)

    if (Object.keys(fullResImages).length === 0) {
      return NextResponse.json({ error: 'Railway returned no images' }, { status: 500 })
    }

    console.log(`[backfill-page-images] Got ${Object.keys(fullResImages).length} full-res pages from Railway`)

    // ── Update each report with the high-res page images ──────────────────────
    const updateResults: { reportId: string; type: string; ok: boolean; error?: string }[] = []

    for (const report of reports) {
      const updatedAnalysis = {
        ...report.raw_analysis,
        page_thumbnails: fullResImages,
        _page_images_backfilled_at: new Date().toISOString(),
      }

      const { error: updateErr } = await db
        .from('reports')
        .update({
          raw_analysis: updatedAnalysis,
          updated_at:   new Date().toISOString(),
        })
        .eq('id', report.id)

      updateResults.push({
        reportId: report.id,
        type:     report.document_type,
        ok:       !updateErr,
        error:    updateErr?.message,
      })
    }

    const allOk = updateResults.every(r => r.ok)

    return NextResponse.json({
      success:      allOk,
      propertyId,
      address:      property.address,
      pagesBackfilled: pagesList,
      pageCount:    pagesList.length,
      reports:      updateResults,
      message:      allOk
        ? `✓ High-res page images saved for pages ${pagesList.join(', ')}. Reload the property report to see them.`
        : 'Some reports failed to update — check the reports array for details.',
    })

  } catch (err: any) {
    console.error('[backfill-page-images] Error:', err)
    return NextResponse.json({
      error: err.message || 'Unexpected error',
    }, { status: 500 })
  }
}
