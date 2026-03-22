import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PDF_SERVICE_URL    = process.env.PDF_SERVICE_URL    || ''
const PDF_SERVICE_SECRET = process.env.PDF_SERVICE_SECRET || ''

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { propertyId } = await req.json()
  if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 })

  if (!PDF_SERVICE_URL) return NextResponse.json({ error: 'PDF_SERVICE_URL not configured' }, { status: 500 })

  // Load property
  const { data: property, error: propErr } = await supabase
    .from('properties').select('*').eq('id', propertyId).eq('user_id', user.id).single()
  if (propErr || !property)
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  // Load reports
  const { data: reports } = await supabase
    .from('reports').select('*').eq('property_id', propertyId)
    .order('created_at', { ascending: false })

  const s32r = reports?.find((r: any) => r.document_type === 's32') ?? null
  const conr = reports?.find((r: any) => r.document_type === 'contract') ?? null

  if (!s32r)
    return NextResponse.json({ error: 'No S32 analysis found. Run the document review first.' }, { status: 400 })

  const payload = {
    property: {
      address:       property.address,
      suburb:        property.suburb,
      postcode:      property.postcode,
      property_type: property.property_type,
    },
    s32:      s32r.raw_analysis  ?? {},
    contract: conr?.raw_analysis ?? {},
  }

  // Call Railway Python service to generate PDF
  const res = await fetch(`${PDF_SERVICE_URL}/generate-pdf`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PDF-Secret': PDF_SERVICE_SECRET,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'PDF generation failed' }))
    return NextResponse.json(err, { status: 500 })
  }

  const pdfBuffer = Buffer.from(await res.arrayBuffer())

  const safeAddr = property.address.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)
  const filename = `PropertyOwl_ConveyancerPack_${safeAddr}.pdf`

  try {
    await supabase.from('activity_log').insert({
      user_id:      user.id,
      event_type:   'conveyancer_pack_generated',
      event_detail: { property_id: propertyId, address: property.address },
    })
  } catch {}

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      pdfBuffer.length.toString(),
      'Cache-Control':       'no-store',
    },
  })
}
