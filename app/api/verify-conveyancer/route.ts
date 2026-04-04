import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/verify-conveyancer?licence=123456
 *
 * Calls the VIC Consumer Affairs register to check if a licence exists.
 * Returns found/not-found for admin display only.
 * No auto-approval — all approvals are manual by admin.
 */
export async function GET(request: NextRequest) {
  const licence = request.nextUrl.searchParams.get('licence')?.trim()

  if (!licence) {
    return NextResponse.json({ found: false, error: 'No licence number provided' }, { status: 400 })
  }

  if (!/^\d{4,12}$/.test(licence)) {
    return NextResponse.json({ found: false, error: 'Licence number must be 4–12 digits' })
  }

  const registerUrl =
    `https://registers.consumer.vic.gov.au/CvSearch/PerformSearch` +
    `?NameOrLicenceNumber=LicenceNumber` +
    `&LicenceNumber=${encodeURIComponent(licence)}` +
    `&IncludeNonCurrentLicensees=False`

  try {
    const res = await fetch(registerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PropertyOwlAI/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return NextResponse.json({ found: false, error: `Register returned HTTP ${res.status}`, registerUrl })
    }

    const html = await res.text()
    const lower = html.toLowerCase()

    const noResultSignals = [
      'no results found', 'no records found', '0 records',
      'no matching', 'no licensees found', 'did not match any',
    ]
    if (noResultSignals.some(s => lower.includes(s))) {
      return NextResponse.json({ found: false, licence, registerUrl, message: 'Licence not found in VIC register' })
    }

    // Try to extract name from results table
    let registeredName: string | null = null
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let m
    while ((m = rowRegex.exec(html)) !== null) {
      if (!m[1].includes(licence)) continue
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let t; const cells: string[] = []
      while ((t = tdRegex.exec(m[1])) !== null) {
        const txt = t[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
        if (txt) cells.push(txt)
      }
      const name = cells.find(c =>
        c !== licence && c.length > 2 && c.length < 80 &&
        !/^\d+$/.test(c) &&
        !/^(active|current|cancelled|suspended|expired|conveyancer|agent|vic|victoria)$/i.test(c)
      )
      if (name) { registeredName = name; break }
    }

    const hasTable = html.includes('<table') && html.includes(licence)
    if (!hasTable) {
      return NextResponse.json({ found: false, licence, registerUrl, message: 'Could not parse register response' })
    }

    return NextResponse.json({
      found: true,
      licence,
      registeredName: registeredName || 'Found (name not extracted)',
      registerUrl,
      message: 'Licence found in VIC Consumer Affairs register',
    })

  } catch (err: any) {
    return NextResponse.json({
      found: false,
      error: err.name === 'TimeoutError' ? 'Register lookup timed out' : 'Register lookup failed',
      registerUrl,
    })
  }
}
